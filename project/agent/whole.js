

import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts"; 
import { TavilyClient } from "tavily"; 
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"; 
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

import { QdrantClient } from "@qdrant/qdrant-js"; 
import { StateGraph, END } from "@langchain/langgraph"; 
                         

export class CombinedFactCheckAgent {
  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile", 
    });

    this.tavily = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY });

    // — Text splitting & embeddings
    this.splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    this.embedder = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-mpnet-base-v2",
      apiKey: process.env.HF_TOKEN,
    });

    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.collection = "news_article";
    this.graph = this._buildGraph();
  }

  async run(inputText) {
    const initState = {
      input_data: inputText,
      cleaned_text: null,
      summary: null,
      search_results: null,
      chunks: null,
      embeddings: null,
      relevant_chunks: null,
      relevant_metadata: null,
      metadata: null,
      report: null,
    };
    return await this.graph.invoke(initState);
  }

  _buildGraph() {
    const g = new StateGraph({
      channels: {
        input_data: "string",
        cleaned_text: "string",
        summary: "string",
        search_results: "list",
        chunks: "list",
        embeddings: "list",
        relevant_chunks: "list",
        relevant_metadata: "list",
        metadata: "list",
        report: "string",
      },
    });

    // 1️⃣ Summarize input
    g.addNode("input", async (state) => {
      // Optionally, you could clean text here and set cleaned_text
      const prompt = ChatPromptTemplate.fromTemplate(
        "Summarize this news claim in one concise sentence:\n\n{text}"
      );
      const chain = prompt.pipe(this.llm);
      const res = await chain.invoke({ text: state.input_data });
      return { ...state, summary: res.content.trim(), cleaned_text: state.input_data };
    });

    // 2️⃣ Search with Tavily
    g.addNode("search", async (state) => {
      const { results = [] } = await this.tavily.search({
        query: state.summary,
        max_results: 10,
      });
      return { ...state, search_results: results };
    });

    // 3️⃣ Chunk, embed, store in Qdrant, retrieve relevant
    g.addNode("vector_db", async (state) => {
      const articles = state.search_results || [];
      const chunks = [];
      const metadata = [];

      // Split each article and collect metadata
      for (const article of articles) {
        const fullText = `${article.title}\n\n${article.content}`;
        const splits = await this.splitter.splitText(fullText);
        chunks.push(...splits);
        metadata.push(...splits.map(() => ({ url: article.url })));
      }

      // Embed all chunks
      const embeddings = await this.embedder.embedDocuments(chunks);

      // Ensure collection exists
      try {
        await this.qdrant.getCollection(this.collection);
      } catch {
        await this.qdrant.createCollection(this.collection, {
          vectors: {
            size: embeddings[0].length,
            distance: "Cosine",
          },
        });
      }

      // Upsert points
      // Corrected the upsert call signature
      await this.qdrant.upsert(this.collection, {
        points: chunks.map((chunk, i) => ({
          id: i, // Using integer ID
          vector: embeddings[i],
          payload: { url: metadata[i]?.url, text: chunk },
        })),
        wait: true // wait parameter is part of the second argument object
      });

      // Similarity search
      // Corrected the search call signature
      const queryVec = await this.embedder.embedQuery(state.summary);
      const resp = await this.qdrant.search(this.collection, {
        vector: queryVec,
        limit: Math.min(5, chunks.length),
        with_payload: true,
      });

      const relevant_chunks = resp.map((r) => r.payload.text);
      const relevant_metadata = resp.map((r) => r.payload.url || "URL Not Available");

      return {
        ...state,
        chunks,
        embeddings,
        metadata,
        relevant_chunks,
        relevant_metadata,
      };
    });

    // 4️⃣ Fact-check
    g.addNode("fact_check", async (state) => {
      const context = (state.relevant_chunks || []).join("\n\n");
      const urls = (state.relevant_metadata || []).filter(Boolean).join("\n");
      const prompt = ChatPromptTemplate.fromTemplate(`
              Role: You are a Senior News Verification Specialist with expertise in fact-checking and media literacy.

              Task:
              Analyze the following news claim against provided search context (from Google) to determine its authenticity. Your analysis must follow strict verification protocols:

              Verification Protocol:
              **1. Claim Breakdown**
              - Identify all factual assertions in the news claim
              - List key entities (people, organizations, locations)
              - Note statistics, dates, and quoted statements

              **2. Context Cross-Verification**
              - Match each factual element to contextual evidence
              - Flag discrepancies in:
                - Numbers/data
                - Chronology of events
                - Quotes/attributions
              - Identify potential logical fallacies or emotional language

              **3. Source Evaluation**
              - Rate source credibility of contextual URLs using:
                - **Tier 1**: Established news outlets (AP, Reuters, BBC)
                - **Tier 2**: Regional/local verified sources
                - **Tier 3**: Blogs/opinion pieces (mark as low credibility)
              - Check for corroboration across multiple high-tier sources

              **4. Conflict Resolution**
              - If context contains conflicting information:
                - Favor most recent Tier 1 sources
                - Note geographic relevance of sources
                - Check official statements/primary documents

              **Output Format:**

              **Verdict:** [Real | Partially Verified | Not Proven | False]
              **Confidence Level:** [High/Medium/Low]  

              **Analysis:**  
              1. **Verified Elements:** [List confirmed facts with sources]  
              2. **Unverified Elements:** [List unsupported claims]  
              3. **Contradictions:** [Detail conflicting information]  

              **Relevant URLs:**  
              - **[Tier 1 Source]** - [Brief relevance note]  
              - **[Tier 2 Source]** - [Contextual limitation]  

                News: {news}
                Context: {context}
                URLs: {urls}
        
      `);

      const chain = prompt.pipe(this.llm);
      const res = await chain.invoke({
        news: state.summary,
        context,
        urls,
      });

      return { ...state, report: res.content.trim() };
    });

    // Connect nodes
    g.setEntryPoint("input");
    g.addEdge("input", "search");
    g.addEdge("search", "vector_db");
    g.addEdge("vector_db", "fact_check");
    g.addEdge("fact_check", END);

    return g.compile();
  }
}
