// testCombinedFactCheckAgent.js

import "dotenv/config";
import { CombinedFactCheckAgent } from "./whole.js";

(async () => {
  const agent = new CombinedFactCheckAgent();

  console.log("🚀 Running CombinedFactCheckAgent…");
  const sample = `
    Breaking: Researchers at OpenAI released GPT-5 today with one trillion parameters 
    and advanced vision capabilities, claiming state-of-the-art benchmarks.
  `;

  try {
    const result = await agent.run(sample);

    console.log("\n— Summary —");
    console.log(result.summary);

    console.log(`\n— Retrieved Articles — ${result.search_results.length}`);
    result.search_results.forEach((a, i) =>
      console.log(`${i + 1}. ${a.title} (${a.url})`)
    );

    console.log("\n— Relevant Chunks —");
    result.relevant_chunks.forEach((c, i) =>
      console.log(`${i + 1}. ${c.slice(0, 100)}${c.length > 100 ? "…" : ""}`)
    );

    console.log("\n— Fact-Check Report —");
    console.log(result.report);
  } catch (e) {
    console.error("Error:", e);
  }
})();
