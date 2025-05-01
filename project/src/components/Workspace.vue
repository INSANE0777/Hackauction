<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'

interface NewsSource {
  name: string;
  url: string;
}

interface SearchResult {
  score: number;
  title: string;
  snippet?: string;
  content?: string;
  url: string;
}

interface FactCheckReport {
  verdict: string;
  confidence: string;
  analysis: {
    verified: string[];
    unverified: string[];
    contradictions: string[];
  };
  sources: Array<{
    tier: string;
    name: string;
    note: string;
    url: string;
    type: string;
  }>;
}

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: NewsSource;
  topic?: string;
  summary?: string[];
  factCheck?: FactCheckReport;
}

const GEMINI_API_KEY = "AIzaSyBo0_nEWdFfUgNWawGmGOHcm4Sm3Av0coQ"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
const GNEWS_API_KEY = "326ebe6753972b25c146d6d9171a6aa6"

const router = useRouter()
const activeTab = ref('fact-check')
const newsInput = ref('')
const isProcessing = ref(false)
const topics = ref<string[]>(['Ai'])
const newTopic = ref('')
const feedArticles = ref<NewsArticle[]>([])
const report = ref<FactCheckReport | null>(null)
const errorMessage = ref('')
const isLoadingFeed = ref(false)
const feedError = ref('')
const isFactChecking = ref<string | null>(null)
const factCheckError = ref('')
const activeFactCheck = ref<NewsArticle | null>(null)
const allArticles = ref<NewsArticle[]>([])

// Add voice agent state and functions
const isSpeaking = ref(false)
const speechSynthesis = window.speechSynthesis
let currentUtterance: SpeechSynthesisUtterance | null = null

// Function to get professional female voice
const getFemaleVoice = (): SpeechSynthesisVoice | null => {
  const voices = speechSynthesis.getVoices()
  // Prioritize professional female voices
  const preferredVoices = [
    'Microsoft Zira',    // Professional US English female
    'Google UK English Female',
    'Samantha',         // Professional US English female
    'Victoria',         // Professional UK English female
    'Karen',            // Professional Australian female
  ]
  
  // Try to find preferred professional voices first
  for (const preferredVoice of preferredVoices) {
    const voice = voices.find(v => v.name.includes(preferredVoice))
    if (voice) return voice
  }
  
  // Fallback to any female voice
  return voices.find(voice => 
    voice.name.toLowerCase().includes('female') ||
    voice.name.toLowerCase().includes('woman')
  ) || voices[0]
}

const stopSpeaking = () => {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel()
  }
  isSpeaking.value = false
  currentUtterance = null
}

const speakText = (text: string, onEndCallback?: () => void) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = getFemaleVoice()
  utterance.rate = 1
  utterance.pitch = 1.2 // Slightly higher pitch for female voice
  utterance.volume = 1
  
  if (onEndCallback) {
    utterance.onend = onEndCallback
  }
  
  speechSynthesis.speak(utterance)
  return utterance
}

// Function to format source for speech
const formatSourceForSpeech = (source: { name: string; type: string }) => {
  return `${source.name}, a ${source.type} source`
}

// Function to generate professional fact check summary using Gemini
const generateFactCheckSummary = async (report: FactCheckReport): Promise<string> => {
  try {
    const prompt = `Generate a professional, concise summary of this fact-check analysis. The summary should be formal yet clear, suitable for a news broadcast or professional presentation.

Report Analysis:
- Verdict: ${report.verdict}
- Confidence Level: ${report.confidence}
- Verified Facts: ${report.analysis.verified.join('. ')}
- Unverified Claims: ${report.analysis.unverified.join('. ')}
- Contradictions Found: ${report.analysis.contradictions.join('. ')}

Requirements:
1. Use professional language and tone
2. Maintain objectivity and clarity
3. Prioritize key findings and their implications
4. Structure the summary in a way that flows naturally when spoken
5. Keep the length concise but comprehensive
6. Avoid casual language or colloquialisms

Please format the response as a professional news-style summary.`

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate summary')
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text || ''
  } catch (error) {
    console.error('Error generating fact check summary:', error)
    return '' // Return empty string if summary generation fails
  }
}

const speakReport = async (report: FactCheckReport | null) => {
  if (!report) return
  
  stopSpeaking()
  isSpeaking.value = true
  
  try {
    const summary = await generateFactCheckSummary(report)
    
    const speakSequence = () => {
      let currentIndex = 0
      const speeches = [
        // Professional greeting
        "Good day. I will present the fact-check analysis results.",
        
        // Gemini-generated professional summary
        summary || `Our analysis has determined this claim to be ${report.verdict}, with ${report.confidence} confidence. The investigation revealed ${report.analysis.verified.length} verified elements, ${report.analysis.unverified.length} unverified claims, and ${report.analysis.contradictions.length} notable contradictions.`,
        
        // Professional closing
        "This concludes the fact-check report. Thank you for your attention."
      ]

      const speakNext = () => {
        if (currentIndex < speeches.length && isSpeaking.value) {
          currentUtterance = new SpeechSynthesisUtterance(speeches[currentIndex])
          
          // Configure voice for professional presentation
          const femaleVoice = getFemaleVoice()
          if (femaleVoice) {
            currentUtterance.voice = femaleVoice
          }
          
          // Professional speech settings
          currentUtterance.rate = 0.9  // Slightly slower for clarity
          currentUtterance.pitch = 1.1 // Professional female pitch
          currentUtterance.volume = 1
          
          currentUtterance.onend = () => {
            currentIndex++
            if (currentIndex < speeches.length && isSpeaking.value) {
              setTimeout(speakNext, 800) // Longer pause between segments for professional pacing
            } else {
              isSpeaking.value = false
              currentUtterance = null
            }
          }
          
          currentUtterance.onerror = () => {
            isSpeaking.value = false
            currentUtterance = null
          }
          
          speechSynthesis.speak(currentUtterance)
        } else {
          isSpeaking.value = false
          currentUtterance = null
        }
      }
      
      speakNext()
    }
    
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        speakSequence()
      }
    } else {
      speakSequence()
    }
  } catch (error) {
    console.error('Error in speech synthesis:', error)
    isSpeaking.value = false
  }
}

// Clean up speech when component is unmounted
onUnmounted(() => {
  stopSpeaking()
})

// Function to generate summary using Gemini API
const generateSummary = async (article: NewsArticle): Promise<string[]> => {
  try {
    const prompt = `Please provide 3-4 key points from this news article. Focus on the main facts and key takeaways.
    
Title: ${article.title}
Content: ${article.content || article.description}
Source: ${article.source.name}
    
Format each point as a separate bullet point without any prefixes or additional markup.`

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate summary')
    }

    const data = await response.json()
    const summaryText = data.candidates[0].content.parts[0].text || ''
    
    // Split the response into bullet points and clean them up
    const bulletPoints = summaryText
      .split('\n')
      .map((point: string) => point.trim())
      .filter((point: string) => point.length > 0)
      .map((point: string) => point.replace(/^[•\-\*]\s*/, '')) // Remove any bullet characters
    
    return bulletPoints.length > 0 ? bulletPoints : [article.description]
  } catch (error) {
    console.error('Error generating summary:', error)
    return [article.description] // Fallback to original description
  }
}

// Update the fetchNewsByTopic function to include summary generation
const fetchNewsByTopic = async (topic: string): Promise<NewsArticle[]> => {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error('GNews API key is missing')
    }

    const params = new URLSearchParams({
      q: topic,
      token: GNEWS_API_KEY,
      lang: 'en',
      country: 'us',
      max: '10',
      sortby: 'publishedAt'
    })

    const response = await fetch(`https://gnews.io/api/v4/search?${params}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to fetch news')
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0] || 'API Error')
    }

    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('Invalid response format')
    }

    // Process articles and generate summaries
    const articlesWithSummaries = await Promise.all(
      data.articles.map(async (article: NewsArticle) => {
        const summary = await generateSummary(article)
        return {
          ...article,
          summary
        }
      })
    )

    return articlesWithSummaries
  } catch (error) {
    console.error('Error fetching news:', error)
    throw error
  }
}

// Add topic management functions
const addTopic = () => {
  if (newTopic.value.trim() && !topics.value.includes(newTopic.value)) {
    topics.value.push(newTopic.value.trim())
    newTopic.value = ''
    // Clear fact check cache when adding new topic
    localStorage.removeItem(FACT_CHECK_CACHE_KEY)
    updateFeed() // Refresh feed when adding topic
  }
}

const removeTopic = (topicToRemove: string) => {
  topics.value = topics.value.filter(topic => topic !== topicToRemove)
  // Clear fact check cache when removing topic
  localStorage.removeItem(FACT_CHECK_CACHE_KEY)
  updateFeed() // Refresh feed when removing topic
}

const processingSteps = ref([
  { id: 1, text: 'Reading your news', completed: false, current: false },
  { id: 2, text: 'Reading articles', completed: false, current: false },
  { id: 3, text: 'Calling the fact-checking agent', completed: false, current: false },
  { id: 4, text: 'Collecting reports', completed: false, current: false }
])

// Add token management
const getAuthToken = () => localStorage.getItem('token')

// Add history management
interface FactCheckHistory {
  id: string;
  query: string;
  timestamp: number;
  report: FactCheckReport;
}

// Add to existing state variables
const factCheckHistory = ref<FactCheckHistory[]>([])
const showHistory = ref(false)
const historyLoaded = ref(false)

// Add history management functions
const HISTORY_STORAGE_KEY = 'fact-check-history'

const loadHistory = () => {
  try {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (savedHistory) {
      factCheckHistory.value = JSON.parse(savedHistory)
    }
    historyLoaded.value = true
  } catch (error) {
    console.error('Error loading history:', error)
  }
}

const saveToHistory = (query: string, report: FactCheckReport) => {
  try {
    const historyEntry: FactCheckHistory = {
      id: Date.now().toString(),
      query,
      timestamp: Date.now(),
      report
    }
    
    factCheckHistory.value.unshift(historyEntry)
    // Keep only last 50 entries
    if (factCheckHistory.value.length > 50) {
      factCheckHistory.value = factCheckHistory.value.slice(0, 50)
    }
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(factCheckHistory.value))
  } catch (error) {
    console.error('Error saving to history:', error)
  }
}

const clearHistory = () => {
  factCheckHistory.value = []
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

const formatHistoryDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

// Update submitNews function to save to history
const submitNews = async () => {
  if (!newsInput.value.trim() || isProcessing.value) return

  const token = getAuthToken()
  if (!token) {
    errorMessage.value = 'Please log in to use the fact check feature'
    return
  }

  isProcessing.value = true
  report.value = null
  errorMessage.value = ''

  // Reset processing steps
  processingSteps.value.forEach(step => {
    step.completed = false
    step.current = false
  })

  try {
    processingSteps.value[0].current = true
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Send the fact check request
    const factCheckResponse = await fetch('http://localhost:3001/api/agent/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: newsInput.value })
    })

    if (!factCheckResponse.ok) {
      throw new Error(`Failed to get fact check report: ${factCheckResponse.status}`)
    }

    processingSteps.value[0].completed = true
    processingSteps.value[0].current = false
    processingSteps.value[1].current = true
    await new Promise(resolve => setTimeout(resolve, 1000))

    const responseData = await factCheckResponse.json()
    
    // Validate response data
    if (!responseData || !responseData.result) {
      throw new Error('Invalid response from fact check service')
    }

    const { result } = responseData
    const reportData = result.report || ''
    
    // Parse the report text
    const parsedReport = parseReportFromText(reportData)

    processingSteps.value[1].completed = true
    processingSteps.value[1].current = false
    processingSteps.value[2].current = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    processingSteps.value[2].completed = true
    processingSteps.value[2].current = false
    processingSteps.value[3].current = true

    // Update the UI with the parsed report
    report.value = {
      verdict: parsedReport.verdict || 'Not Available',
      confidence: parsedReport.confidence || 'Low',
      analysis: {
        verified: parsedReport.verified || [],
        unverified: parsedReport.unverified || [],
        contradictions: parsedReport.contradictions || []
      },
      sources: (result.search_results || []).map((source: any) => ({
        tier: determineTier(source.score || 0),
        name: source.title || 'Unknown Source',
        note: source.snippet || source.content || '',
        url: source.url || '#',
        type: determineSourceType(source.url || '')
      }))
    }

    processingSteps.value[3].completed = true
    processingSteps.value[3].current = false

    // After successful fact check, save to history
    if (report.value) {
      saveToHistory(newsInput.value, report.value)
    }

  } catch (error) {
    console.error('Error processing news:', error)
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
    processingSteps.value.forEach(step => {
      step.completed = false
      step.current = false
    })
  } finally {
    isProcessing.value = false
  }
}

// Add parseReportFromText function to handle report parsing
const parseReportFromText = (reportText: string) => {
  if (!reportText || typeof reportText !== 'string') {
    return {
      verdict: 'Not Available',
      confidence: 'Low',
      verified: [],
      unverified: [],
      contradictions: []
    }
  }

  // Clean the report text and remove asterisks
  const cleanedText = reportText.trim().replace(/\*\*/g, '')

  // Try to match verdict with multiple possible formats
  const verdictMatch =
    cleanedText.match(/Verdict:?\s+([^\n]+)/i) ||
    cleanedText.match(/verdict:?\s+([^\n]+)/i)

  // Try to match confidence with multiple possible formats
  const confidenceMatch =
    cleanedText.match(/Confidence Level:?\s+([^\n]+)/i) ||
    cleanedText.match(/Confidence:?\s+([^\n]+)/i)

  // Try to match verified elements with multiple possible formats
  const verifiedMatch =
    cleanedText.match(/Verified Elements:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i) ||
    cleanedText.match(/Verified:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Try to match unverified elements with multiple possible formats
  const unverifiedMatch =
    cleanedText.match(/Unverified Elements:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i) ||
    cleanedText.match(/Unverified Claims:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Try to match contradictions with multiple possible formats
  const contradictionsMatch =
    cleanedText.match(/Contradictions:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Helper to safely split and map matched groups
  const splitAndMap = (matchResult: RegExpMatchArray | null) => {
    if (!matchResult || !matchResult[1]) return []
    return matchResult[1]
      .split('\n')
      .map(line => line.replace(/^[\s-]*/, '').trim())
      .filter(line => line.length > 0)
  }

  return {
    verdict: verdictMatch ? verdictMatch[1].trim() : 'Not Available',
    confidence: confidenceMatch ? confidenceMatch[1].trim() : 'Low',
    verified: splitAndMap(verifiedMatch),
    unverified: splitAndMap(unverifiedMatch),
    contradictions: splitAndMap(contradictionsMatch)
  }
}

// Add function to fetch fact check history
const fetchFactCheckHistory = async () => {
  const token = getAuthToken()
  if (!token) return []

  try {
    const response = await fetch('http://localhost:3001/api/agent/fact-checks', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch fact check history')
    }

    const data = await response.json()
    return data.factChecks
  } catch (error) {
    console.error('Error fetching fact check history:', error)
    return []
  }
}

// Add a function to make URLs clickable
const makeUrlsClickable = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
}

// Helper function to determine source tier based on score
const determineTier = (score: number): string => {
  if (score >= 0.8) return 'Tier 1'
  if (score >= 0.6) return 'Tier 2'
  return 'Tier 3'
}

// Helper function to determine source type
const determineSourceType = (url: string): string => {
  if (!url) return 'article'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video'
  if (url.includes('wikipedia.org')) return 'wiki'
  if (url.match(/\.(jpg|jpeg|png|gif)$/i)) return 'image'
  return 'article'
}

// Navigation functions
const goToHome = () => {
  router.push('/')
}

const signOut = () => {
  // Remove token from localStorage
  localStorage.removeItem('token')
  // Redirect to home page
  router.push('/')
}

onMounted(() => {
  // Animate workspace in
  gsap.from('.workspace-container', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })

  // Initial feed load
  if (activeTab.value === 'feed') {
    updateFeed()
  }

  // Load history when component is mounted
  loadHistory()
})

// Add a watch effect for activeTab
watch(activeTab, (newTab) => {
  if (newTab === 'feed') {
    updateFeed()
  }
})

// Add news feed cache management
const NEWS_FEED_CACHE_KEY = 'news-feed-cache'
const FEED_CACHE_EXPIRY_HOURS = 1 // Cache news feed for 1 hour

interface NewsFeedCache {
  [topic: string]: {
    timestamp: number;
    articles: NewsArticle[];
  }
}

const getFeedCache = (): NewsFeedCache => {
  try {
    const cache = localStorage.getItem(NEWS_FEED_CACHE_KEY)
    return cache ? JSON.parse(cache) : {}
  } catch (error) {
    console.error('Error reading from feed cache:', error)
    return {}
  }
}

const setFeedCache = (cache: NewsFeedCache) => {
  try {
    localStorage.setItem(NEWS_FEED_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error writing to feed cache:', error)
    clearOldFeedCache()
  }
}

const clearOldFeedCache = () => {
  const cache = getFeedCache()
  const now = Date.now()
  const expiryTime = FEED_CACHE_EXPIRY_HOURS * 60 * 60 * 1000
  
  const updatedCache: NewsFeedCache = {}
  Object.entries(cache).forEach(([topic, data]) => {
    if (now - data.timestamp < expiryTime) {
      updatedCache[topic] = data
    }
  })
  
  try {
    localStorage.setItem(NEWS_FEED_CACHE_KEY, JSON.stringify(updatedCache))
  } catch (error) {
    console.error('Error updating feed cache:', error)
    localStorage.removeItem(NEWS_FEED_CACHE_KEY)
  }
}

const getCachedFeed = (topic: string): NewsArticle[] | null => {
  const cache = getFeedCache()
  const entry = cache[topic]
  
  if (!entry) return null
  
  const now = Date.now()
  const expiryTime = FEED_CACHE_EXPIRY_HOURS * 60 * 60 * 1000
  
  if (now - entry.timestamp > expiryTime) {
    const updatedCache = { ...cache }
    delete updatedCache[topic]
    setFeedCache(updatedCache)
    return null
  }
  
  return entry.articles
}

const cacheFeed = (topic: string, articles: NewsArticle[]) => {
  const cache = getFeedCache()
  cache[topic] = {
    timestamp: Date.now(),
    articles
  }
  setFeedCache(cache)
}

// Update the updateFeed function to remove fact check caching references
const updateFeed = async () => {
  isLoadingFeed.value = true
  feedError.value = ''
  feedArticles.value = []

  try {
    const allArticles: NewsArticle[] = []
    const uniqueUrls = new Set()

    for (const topic of topics.value) {
      try {
        // Check cache first for news articles only
        const cachedArticles = getCachedFeed(topic)
        if (cachedArticles) {
          console.log(`Using cached feed for topic: ${topic}`)
          cachedArticles.forEach(article => {
            if (!uniqueUrls.has(article.url)) {
              uniqueUrls.add(article.url)
              // Ensure no factCheck is carried over from cache
              const { factCheck, ...articleWithoutFactCheck } = article
              allArticles.push({
                ...articleWithoutFactCheck,
                topic
              })
            }
          })
          continue
        }

        // If not in cache, fetch from API
        const articles = await fetchNewsByTopic(topic)
        cacheFeed(topic, articles) // Cache only the news articles
        
        articles.forEach(article => {
          if (!uniqueUrls.has(article.url)) {
            uniqueUrls.add(article.url)
            allArticles.push({
              ...article,
              topic
            })
          }
        })
      } catch (error) {
        console.error(`Error fetching news for topic "${topic}":`, error)
        continue
      }
    }

    // Sort articles by published date (newest first)
    feedArticles.value = allArticles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  } catch (error) {
    console.error('Error updating feed:', error)
    feedError.value = 'Failed to load news feed. Please try again later.'
  } finally {
    isLoadingFeed.value = false
  }
}

// Add cache management functions
const FACT_CHECK_CACHE_KEY = 'fact-check-cache'
const CACHE_EXPIRY_HOURS = 24 // Cache results for 24 hours

interface CacheEntry {
  timestamp: number;
  report: FactCheckReport;
}

interface FactCheckCache {
  [url: string]: CacheEntry;
}

const getFactCheckCache = (): FactCheckCache => {
  try {
    const cache = localStorage.getItem(FACT_CHECK_CACHE_KEY)
    return cache ? JSON.parse(cache) : {}
  } catch (error) {
    console.error('Error reading from cache:', error)
    return {}
  }
}

const setFactCheckCache = (cache: FactCheckCache) => {
  try {
    localStorage.setItem(FACT_CHECK_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error writing to cache:', error)
    // If localStorage is full, clear old entries
    clearOldCacheEntries()
  }
}

const clearOldCacheEntries = () => {
  const cache = getFactCheckCache()
  const now = Date.now()
  const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000 // Convert hours to milliseconds
  
  // Remove entries older than expiry time
  const updatedCache: FactCheckCache = {}
  Object.entries(cache).forEach(([url, entry]) => {
    if (now - entry.timestamp < expiryTime) {
      updatedCache[url] = entry
    }
  })
  
  try {
    localStorage.setItem(FACT_CHECK_CACHE_KEY, JSON.stringify(updatedCache))
  } catch (error) {
    console.error('Error updating cache:', error)
    // If still failing, clear entire cache
    localStorage.removeItem(FACT_CHECK_CACHE_KEY)
  }
}

const getCachedFactCheck = (url: string): FactCheckReport | null => {
  const cache = getFactCheckCache()
  const entry = cache[url]
  
  if (!entry) return null
  
  // Check if cache entry is expired
  const now = Date.now()
  const expiryTime = CACHE_EXPIRY_HOURS * 60 * 60 * 1000
  
  if (now - entry.timestamp > expiryTime) {
    // Remove expired entry
    const updatedCache = { ...cache }
    delete updatedCache[url]
    setFactCheckCache(updatedCache)
    return null
  }
  
  return entry.report
}

const cacheFactCheck = (url: string, report: FactCheckReport) => {
  const cache = getFactCheckCache()
  cache[url] = {
    timestamp: Date.now(),
    report
  }
  setFactCheckCache(cache)
}

// Update the factCheckArticle function to remove caching
const factCheckArticle = async (article: NewsArticle) => {
  try {
    isFactChecking.value = article.url
    factCheckError.value = ''

    const response = await fetch('http://localhost:3001/api/agent/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: article.title })
    })

    if (!response.ok) {
      throw new Error(`Failed to get fact check report: ${response.status}`)
    }

    const result = await response.json()
    const reportData = result.result?.report || ''
    const parsedReport = parseReportFromText(reportData)

    // Create the fact check report
    const factCheckReport: FactCheckReport = {
      verdict: parsedReport.verdict || 'Not Available',
      confidence: parsedReport.confidence || 'Low',
      analysis: {
        verified: parsedReport.verified || [],
        unverified: parsedReport.unverified || [],
        contradictions: parsedReport.contradictions || []
      },
      sources: (result.result?.search_results || []).map((source: any) => ({
        tier: determineTier(source.score || 0),
        name: source.title || 'Unknown Source',
        note: source.snippet || source.content || '',
        url: source.url || '#',
        type: determineSourceType(source.url || '')
      }))
    }
    
    // Update the article with fact check results
    article.factCheck = factCheckReport
    
    // Show the modal with results
    activeFactCheck.value = article
  } catch (error) {
    console.error('Error fact checking article:', error)
    factCheckError.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isFactChecking.value = null
  }
}

// Replace the formatTimeAgo function with this simpler date formatter
const formatArticleDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
}

// Add a function to extract YouTube video ID
const getYoutubeVideoId = (url: string): string | null => {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}
</script>

<template>
  <section class="workspace">
    <div class="header">
      <h1 class="header-title">Pop News</h1>
      <div class="nav-buttons">
        <button @click="goToHome" class="nav-button home-button">
          <span class="button-icon">🏠</span> Home
        </button>
        <button @click="signOut" class="nav-button sign-out-button">
          <span class="button-icon">🚪</span> Sign Out
        </button>
      </div>
    </div>

    <div class="workspace-nav">
      <button
        class="nav-tab"
        :class="{ active: activeTab === 'fact-check' }"
        @click="activeTab = 'fact-check'"
      >
        Fact Check
      </button>
      <button
        class="nav-tab"
        :class="{ active: activeTab === 'topics' }"
        @click="activeTab = 'topics'"
      >
        Manage Topics
      </button>
      <button
        class="nav-tab"
        :class="{ active: activeTab === 'feed' }"
        @click="activeTab = 'feed'"
      >
        News Feed
      </button>
    </div>

    <div class="container workspace-container">
      <!-- Fact Check Tab -->
      <div v-if="activeTab === 'fact-check'" class="tab-content">
        <div class="workspace-header">
        <h1 class="workspace-title">Say the news you heard...<span class="cursor">|</span></h1>
          <button 
            class="history-toggle-button" 
            @click="showHistory = !showHistory"
            :class="{ 'active': showHistory }"
          >
            <span class="history-icon">📜</span>
            History
          </button>
        </div>

        <div class="workspace-layout">
          <!-- Main fact check area -->
          <div class="fact-check-area" :class="{ 'with-history': showHistory }">
        <p class="workspace-subtitle">
          Paste the news below to get the authenticity report. It takes some time to generate the report.
        </p>

        <div class="news-input-container brutalist-card">
              <div class="news-input-header">
                <span class="news-input-icon">📰</span>
                <span class="news-input-title">Enter News to Fact Check</span>
              </div>
              <div class="news-input-wrapper">
          <textarea
            v-model="newsInput"
            class="news-input"
                  placeholder="Paste or type the news article, statement, or claim you want to fact check..."
            :disabled="isProcessing"
                  @keydown.ctrl.enter="submitNews"
          ></textarea>
                <button 
                  class="submit-button" 
                  @click="submitNews" 
                  :disabled="isProcessing || !newsInput.trim()"
                  :title="isProcessing ? 'Processing...' : 'Check Facts (Ctrl+Enter)'"
                >
                  <span v-if="isProcessing" class="icon">⌛</span>
                  <span v-else class="icon">↗</span>
          </button>
              </div>
        </div>

        <div v-if="isProcessing" class="processing-container">
          <div
            v-for="step in processingSteps"
            :key="step.id"
            class="processing-step"
            :class="{ 'completed': step.completed, 'current': step.current }"
          >
            <div class="step-indicator">
              <div v-if="step.completed" class="check-icon">✓</div>
              <div v-else-if="step.current" class="loading-icon"></div>
              <div v-else class="step-number">{{ step.id }}</div>
            </div>
            <div class="step-text">{{ step.text }}</div>
          </div>
        </div>

        <!-- Show error message if any -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Fact Check Results -->
        <div v-if="report" class="fact-check-container">
          <div class="fact-check-header">
                <div class="verdict-section">
            <div class="verdict-banner" :class="report.verdict.toLowerCase().replace(' ', '-')">
              {{ report.verdict }} ({{ report.confidence }})
            </div>
                  <div class="voice-control-wrapper">
                    <button 
                      class="voice-control-button" 
                      @click="isSpeaking ? stopSpeaking() : speakReport(report)"
                      :class="{ 'speaking': isSpeaking }"
                    >
                      <span v-if="isSpeaking" class="voice-icon">🔊</span>
                      <span v-else class="voice-icon">🔈</span>
                      {{ isSpeaking ? 'Stop' : 'Read Report' }}
                    </button>
                  </div>
                </div>
                
                <div class="report-meta">
                  <div class="analysis-date">
                    Analysis Date: {{ new Date().toLocaleString() }}
                  </div>
                </div>
            
            <h2 class="claim-text">{{ newsInput }}</h2>
          </div>

          <div class="fact-check-body">
                <!-- First Row: Verified and Unverified Facts -->
                <div class="fact-row">
            <!-- Verified Facts Section -->
            <div v-if="report.analysis.verified.length" class="fact-section verified-facts">
              <h3 class="section-title">Verified Facts</h3>
              <ul class="fact-list">
                <li v-for="(fact, index) in report.analysis.verified" 
                    :key="index" 
                    class="fact-item">
                        <span class="fact-icon">✓</span>
                        <span v-html="makeUrlsClickable(fact)"></span>
                </li>
              </ul>
            </div>

            <!-- Unverified Claims Section -->
            <div v-if="report.analysis.unverified.length" class="fact-section unverified-claims">
              <h3 class="section-title">Unverified Claims</h3>
              <ul class="fact-list">
                <li v-for="(claim, index) in report.analysis.unverified" 
                    :key="index" 
                    class="fact-item">
                        <span class="fact-icon">?</span>
                        <span v-html="makeUrlsClickable(claim)"></span>
                </li>
              </ul>
            </div>
                </div>

                <!-- Second Row: Sources and Contradictions -->
                <div class="fact-row">
                  <!-- Resources Section -->
                  <div v-if="report.sources.length" class="fact-section resources">
                    <h3 class="section-title">Relevant Resources</h3>
                    <div class="resources-list">
                      <div v-for="(source, index) in report.sources" 
                           :key="index"
                           class="resource-item">
                        <div class="resource-header">
                          <div class="resource-tier">{{ source.tier }}</div>
                          <div class="resource-title">
                            <a :href="source.url" target="_blank" rel="noopener noreferrer">
                              {{ source.name }}
                            </a>
                          </div>
                        </div>
                        <div class="resource-content">{{ source.note }}</div>
                      </div>
                    </div>
            </div>

            <!-- Contradictions Section -->
            <div v-if="report.analysis.contradictions.length" class="fact-section contradictions">
              <h3 class="section-title">Contradictions</h3>
              <ul class="fact-list">
                <li v-for="(contradiction, index) in report.analysis.contradictions" 
                    :key="index" 
                    class="fact-item">
                        <span class="fact-icon">×</span>
                        <span v-html="makeUrlsClickable(contradiction)"></span>
                </li>
              </ul>
                  </div>
                </div>
              </div>
            </div>
            </div>

          <!-- History sidebar -->
          <transition name="slide">
            <div v-if="showHistory" class="history-sidebar">
              <div class="history-header">
                <h2>Fact Check History</h2>
                <button @click="clearHistory" class="clear-history-button">
                  Clear History
                </button>
                    </div>

              <div class="history-list" v-if="factCheckHistory.length > 0">
                <div 
                  v-for="entry in factCheckHistory" 
                  :key="entry.id"
                  class="history-item"
                  :class="entry.report.verdict.toLowerCase().replace(' ', '-')"
                >
                  <div class="history-item-header">
                    <span class="history-date">{{ formatHistoryDate(entry.timestamp) }}</span>
                    <span class="history-verdict">{{ entry.report.verdict }}</span>
                </div>
                  <p class="history-query">{{ entry.query }}</p>
                  <button 
                    class="recheck-button"
                    @click="newsInput = entry.query; submitNews()"
                  >
                    Recheck
                  </button>
              </div>
            </div>
              <div v-else class="empty-history">
                No fact check history yet
          </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- Topics Tab -->
      <div v-if="activeTab === 'topics'" class="tab-content">
        <h1 class="workspace-title">Manage Your Topics<span class="cursor">|</span></h1>
        <div class="topics-container brutalist-card">
          <div class="topics-list">
            <div v-for="topic in topics" :key="topic" class="topic-item">
              <span>{{ topic }}</span>
              <button @click="removeTopic(topic)" class="remove-topic">×</button>
            </div>
          </div>
          <div class="add-topic">
            <input
              v-model="newTopic"
              placeholder="Enter a new topic..."
              @keyup.enter="addTopic()"
            />
            <button @click="topics.push(newTopic); newTopic = ''">Add</button>
          </div>
        </div>
      </div>

      <!-- Feed Tab -->
      <div v-if="activeTab === 'feed'" class="tab-content">
        <div class="feed-grid-container">
        <h1 class="workspace-title">Your News Feed<span class="cursor">|</span></h1>

        <div v-if="isLoadingFeed" class="loading-state">
          <div class="loading-icon"></div>
          <p>Loading news articles...</p>
        </div>

        <div v-else-if="feedError" class="error-message">
          {{ feedError }}
        </div>

        <div v-else-if="!feedArticles.length" class="empty-state">
          <p>No articles found. Try adding more topics or check back later.</p>
          <button @click="updateFeed" class="refresh-button">
            Refresh Feed
          </button>
        </div>

        <div v-else class="feed-grid">
          <div v-for="article in feedArticles" :key="article.url" class="feed-card">
              <div class="article-date">
                {{ formatArticleDate(article.publishedAt) }}
              </div>
            <div class="feed-card-image-wrapper" v-if="article.image">
              <img :src="article.image" :alt="article.title" class="feed-card-image" />
            </div>
            <div class="feed-card-content">
              <div class="feed-card-meta">
                <div class="feed-card-source">
                  <span class="source-name">{{ article.source?.name }}</span>
                </div>
              </div>
              <h3 class="feed-card-title">
                <a :href="article.url" target="_blank" rel="noopener noreferrer">{{ article.title }}</a>
              </h3>
              
              <div class="ai-summary-section">
                <div class="ai-summary-header">AI SUMMARY</div>
                <ul class="ai-summary-list">
                  <li v-for="(point, index) in article.summary" :key="index" class="ai-summary-point">
                    {{ point }}
                  </li>
                </ul>
              </div>

              <div class="action-buttons">
                <a :href="article.url" target="_blank" rel="noopener noreferrer" class="action-button primary">
                  Read Full Article →
                </a>
                <button 
                  class="action-button"
                  @click="factCheckArticle(article)"
                  :disabled="isFactChecking === article.url"
                >
                  <span v-if="isFactChecking === article.url">Checking...</span>
                  <span v-else>Fact Check</span>
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fact Check Modal -->
    <Teleport to="body">
      <div v-if="activeFactCheck?.factCheck" class="modal-overlay" @click="activeFactCheck = null">
        <div class="modal-content fact-check-modal" @click.stop>
          <button class="modal-close" @click="activeFactCheck = null">×</button>
          
          <div class="modal-header">
            <h3 class="modal-title">{{ activeFactCheck.title }}</h3>
            <div class="source-meta">
              <span class="source-name">{{ activeFactCheck.source.name }}</span>
              <span class="date">{{ formatArticleDate(activeFactCheck.publishedAt) }}</span>
            </div>
          </div>

          <div class="fact-check-results">
            <div class="verdict-section">
              <div class="verdict-banner" :class="activeFactCheck.factCheck.verdict.toLowerCase().replace(' ', '-')">
                {{ activeFactCheck.factCheck.verdict }}
                <span class="confidence-badge">{{ activeFactCheck.factCheck.confidence }} Confidence</span>
              </div>
              <div class="voice-control-wrapper">
                <button 
                  class="voice-control-button" 
                  @click="isSpeaking ? stopSpeaking() : speakReport(activeFactCheck.factCheck)"
                  :class="{ 'speaking': isSpeaking }"
                >
                  <span v-if="isSpeaking" class="voice-icon">🔊</span>
                  <span v-else class="voice-icon">🔈</span>
                  {{ isSpeaking ? 'Stop' : 'Read Report' }}
                </button>
            </div>
              </div>

            <div class="fact-check-body">
              <!-- First Row: Verified and Unverified Facts -->
              <div class="fact-row">
                <div v-if="activeFactCheck.factCheck.analysis.verified.length" class="fact-section verified-facts">
                  <h3 class="section-title">Verified Facts</h3>
                  <ul class="fact-list">
                    <li v-for="(fact, index) in activeFactCheck.factCheck.analysis.verified" 
                      :key="index"
                        class="fact-item">
                      <span class="fact-icon">✓</span>
                      <span v-html="makeUrlsClickable(fact)"></span>
                    </li>
                </ul>
              </div>

                <div v-if="activeFactCheck.factCheck.analysis.unverified.length" class="fact-section unverified-claims">
                  <h3 class="section-title">Unverified Claims</h3>
                  <ul class="fact-list">
                    <li v-for="(claim, index) in activeFactCheck.factCheck.analysis.unverified" 
                      :key="index"
                        class="fact-item">
                      <span class="fact-icon">?</span>
                      <span v-html="makeUrlsClickable(claim)"></span>
                    </li>
                </ul>
              </div>
            </div>

              <!-- Second Row: Sources and Contradictions -->
              <div class="fact-row">
                <div v-if="activeFactCheck.factCheck.sources.length" class="fact-section resources">
                  <h3 class="section-title">Relevant Resources</h3>
                  <div class="resources-list">
              <div v-for="(source, index) in activeFactCheck.factCheck.sources" 
                   :key="index"
                         class="resource-item">
                      <div class="resource-header">
                        <div class="resource-tier">{{ source.tier }}</div>
                        <div class="resource-title">
                          <a :href="source.url" target="_blank" rel="noopener noreferrer">
                            {{ source.name }}
                          </a>
                    </div>
                </div>
                      <div class="resource-content">{{ source.note }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="activeFactCheck.factCheck.analysis.contradictions.length" class="fact-section contradictions">
                  <h3 class="section-title">Contradictions</h3>
                  <ul class="fact-list">
                    <li v-for="(contradiction, index) in activeFactCheck.factCheck.analysis.contradictions" 
                        :key="index" 
                        class="fact-item">
                      <span class="fact-icon">×</span>
                      <span v-html="makeUrlsClickable(contradiction)"></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
}

.header-title {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.nav-buttons {
  display: flex;
  gap: var(--spacing-2);
}

.nav-button {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  transform: translateY(-2px);
}

.home-button {
  color: var(--color-primary);
}

.sign-out-button {
  color: var(--color-error);
}

.button-icon {
  margin-right: var(--spacing-1);
}

.workspace-nav {
  display: flex;
  justify-content: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
}

.nav-tab {
  padding: var(--spacing-2) var(--spacing-4);
  border: var(--border-size) solid var(--color-border);
  border-radius: 4px;
  background-color: transparent;
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-tab.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.nav-tab:hover {
  background-color: var(--color-secondary);
  color: white;
  border-color: var(--color-secondary);
}

.workspace-container {
  max-width: 100%; /* Allow full width */
  width: 100%;
  margin: 0 auto;
  padding: var(--spacing-4);
  padding-bottom: var(--spacing-6);
  min-height: calc(100vh - 200px);
}

/* Update feed grid for full width */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--spacing-4);
  margin: var(--spacing-4) auto;
  padding: 0;
  width: 100%;
  max-width: 100%;
}

/* Responsive grid adjustments */
@media (min-width: 2000px) {
  .feed-grid {
    grid-template-columns: repeat(4, 1fr); /* Show 4 columns on very large screens */
  }
}

@media (min-width: 1400px) and (max-width: 1999px) {
  .feed-grid {
    grid-template-columns: repeat(3, 1fr); /* Show 3 columns on large screens */
  }
}

@media (min-width: 768px) and (max-width: 1399px) {
  .feed-grid {
    grid-template-columns: repeat(2, 1fr); /* Show 2 columns on medium screens */
  }
}

@media (max-width: 767px) {
  .feed-grid {
    grid-template-columns: 1fr; /* Single column on mobile */
    padding: 0 var(--spacing-2);
  }
}

/* Update feed card styles for better full-width display */
.feed-card {
  position: relative;
  height: auto;
  min-height: 400px;
  max-width: 100%;
  background: var(--color-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feed-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.feed-card:hover .article-date {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.article-date {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.85);
  color: var(--color-text);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-family: var(--font-mono);
  opacity: 0;
  transform: translateY(-10px);
  visibility: hidden;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  pointer-events: none;
}

.feed-card-image-wrapper {
  width: 100%;
  height: 240px; /* Increased height for better visual */
  position: relative;
  overflow: hidden;
}

.feed-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.feed-card:hover .feed-card-image {
  transform: scale(1.05);
}

.feed-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 16px;
}

.feed-card-meta {
  display: flex;
  align-items: center;
  padding: 0;
}

.feed-card-source {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.source-name {
  color: var(--color-primary);
  font-weight: 500;
}

.feed-card-title {
  font-size: 1.5rem;
  line-height: 1.4;
  margin: 0;
  color: var(--color-text);
}

.feed-card-title a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.feed-card-title a:hover {
  color: var(--color-primary);
}

/* Update AI summary section for better visibility */
.ai-summary-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  margin-top: auto;
}

.ai-summary-header {
  font-family: var(--font-mono);
  color: var(--color-primary);
  font-size: 0.9rem;
  margin-bottom: 12px;
  font-weight: 600;
}

.ai-summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ai-summary-point {
  position: relative;
  padding-left: 20px;
  margin-bottom: 10px;
  line-height: 1.5;
  color: var(--color-text);
}

.ai-summary-point:last-child {
  margin-bottom: 0;
}

.ai-summary-point::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--color-primary);
}

/* Update action buttons for better visibility */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-button {
  flex: 1;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s ease;
}

.action-button.primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.action-button.primary:hover {
  background: var(--color-secondary);
  transform: translateY(-2px);
}

/* Update tab content for full width */
.tab-content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* Ensure proper spacing for other sections */
.workspace-nav {
  max-width: 100%;
  padding: 0 var(--spacing-4);
  margin-bottom: var(--spacing-4);
  display: flex;
  justify-content: center;
  gap: var(--spacing-2);
}

.header {
  max-width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-card);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.cursor {
  color: var(--color-primary);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.workspace-subtitle {
  text-align: center;
  color: var(--color-text);
  opacity: 0.8;
  margin-bottom: var(--spacing-4);
}

.news-input-container {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-4);
  background: var(--color-card);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.2s ease;
}

.news-input-wrapper {
  position: relative;
  display: flex;
}

.news-input {
  flex: 1;
  min-height: 120px;
  max-height: 300px;
  padding: 16px;
  padding-right: 60px; /* Make space for the button */
  border: none;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.news-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.submit-button {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  background: var(--color-secondary);
  transform: translateY(-2px);
}

.submit-button:disabled {
  background: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.7;
}

.submit-button .icon {
  font-size: 24px;
}

.processing-container {
  margin-bottom: var(--spacing-4);
  max-width: 100%;
  overflow: hidden;
}

.processing-step {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processing-step.current {
  opacity: 1;
}

.processing-step.completed {
  opacity: 1;
  color: var(--color-success);
}

.step-indicator {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: var(--color-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-2);
  border: var(--border-size) solid var(--color-secondary);
}

.step-number {
  font-weight: bold;
}

.check-icon {
  color: var(--color-success);
  font-weight: bold;
}

.loading-icon {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.report-container {
  padding: var(--spacing-4);
  background: linear-gradient(145deg, var(--color-card), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.report-container:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.report-title {
  margin-bottom: var(--spacing-4);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 2rem;
  background: linear-gradient(120deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
}

.report-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 3px;
}

.report-verdict {
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.report-verdict::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), transparent);
  z-index: 0;
}

.report-verdict.real {
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.2));
  border-left: 5px solid var(--color-success);
}

.report-verdict.partially-verified {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.2));
  border-left: 5px solid #ff9800;
}

.report-verdict.false {
  background: linear-gradient(135deg, rgba(213, 0, 0, 0.1), rgba(213, 0, 0, 0.2));
  border-left: 5px solid var(--color-error);
}

.confidence-badge {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.analysis-section {
  margin-bottom: 32px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.analysis-section:hover {
  transform: translateY(-4px);
}

.analysis-section.verified-facts {
  background: linear-gradient(135deg, rgba(68, 255, 68, 0.05), rgba(0, 0, 0, 0.2));
  border-left: 4px solid #44ff44;
}

.analysis-section.unverified-claims {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(0, 0, 0, 0.2));
  border-left: 4px solid #ffd700;
}

.analysis-section.contradictions {
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.05), rgba(0, 0, 0, 0.2));
  border-left: 4px solid #ff4444;
}

.section-title {
  margin-bottom: 16px;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  padding-left: 12px;
  border-radius: 4px;
}

.verified-facts .section-title {
  color: #44ff44;
}

.unverified-claims .section-title {
  color: #ffd700;
}

.contradictions .section-title {
  color: #ff4444;
}

.fact-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.verified-facts .fact-item {
  background: rgba(68, 255, 68, 0.05);
}

.unverified-claims .fact-item {
  background: rgba(255, 215, 0, 0.05);
}

.contradictions .fact-item {
  background: rgba(255, 68, 68, 0.05);
}

.fact-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.fact-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
}

.verified-facts .fact-icon {
  background: rgba(0, 255, 0, 0.1);
  color: #44ff44;
}

.unverified-claims .fact-icon {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.contradictions .fact-icon {
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
}

.resources-section {
  margin-top: 40px;
}

.resources-section .section-title {
  color: #66b3ff;
  margin-bottom: 24px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.resource-card {
  padding: 20px;
  background: linear-gradient(135deg, rgba(102, 179, 255, 0.05), rgba(0, 0, 0, 0.2));
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 179, 255, 0.1);
  border-left: 4px solid #66b3ff;
}

.resource-card:hover {
  transform: translateY(-4px);
  background: linear-gradient(135deg, rgba(102, 179, 255, 0.1), rgba(0, 0, 0, 0.2));
}

.resource-header {
  margin-bottom: 16px;
}

.resource-tier {
  display: inline-block;
  padding: 4px 8px;
  margin-bottom: 8px;
  background: rgba(102, 179, 255, 0.1);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #66b3ff;
}

.resource-title {
  font-size: 18px;
  font-weight: 600;
  color: #66b3ff;
}

.resource-title a {
  color: #66b3ff;
  text-decoration: none;
  transition: color 0.3s ease;
  }

.resource-title a:hover {
  color: #99ccff;
  }

.resource-content {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.6;
}

/* Slide animation for history sidebar */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .workspace-container {
    max-width: 1000px;
}

  .fact-check-area.with-history {
    margin-right: 0;
}

  .history-sidebar {
    position: fixed;
    z-index: 100;
    right: 16px; /* Reduced from 24px */
    top: 100px; /* Reduced from 120px */
    width: 260px; /* Reduced from 280px */
    max-height: calc(100vh - 120px);
  }
}

@media (max-width: 900px) {
  .workspace-container {
    width: 100%;
    padding: var(--spacing-2);
  }
  
  .history-sidebar {
    width: 240px;
    right: 8px;
  }
}

/* Update header positioning */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-background);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
}

/* Add margin to workspace to account for fixed header */
.workspace {
  margin-top: 80px;
  min-height: calc(100vh - 80px);
  background-color: var(--color-background);
  position: relative;
}

/* Update workspace nav positioning */
.workspace-nav {
  position: sticky;
  top: 64px;
  z-index: 900;
  background: var(--color-background);
  padding: 16px 0;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  gap: var(--spacing-2);
  backdrop-filter: blur(10px);
}

/* Update feed page layout */
.tab-content {
  min-height: calc(100vh - 160px);
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* Update empty state to maintain full height */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: var(--color-card);
  border-radius: 12px;
  margin: var(--spacing-4);
  min-height: 400px;
}

.empty-state p {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-4);
}

/* Update loading state to maintain full height */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: var(--color-card);
  border-radius: 12px;
  margin: var(--spacing-4);
  min-height: 400px;
}

.loading-state p {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-4);
}

/* Update feed grid container */
.feed-grid-container {
  flex: 1;
  width: 100%;
  padding: var(--spacing-4);
  background: var(--color-background);
}

/* Update workspace container */
.workspace-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: var(--spacing-4);
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header {
    padding: 12px 16px;
  }
  
  .workspace {
    margin-top: 64px;
  }
  
  .workspace-nav {
    top: 48px;
    padding: 12px 0;
  }
  
  .empty-state,
  .loading-state {
    margin: var(--spacing-2);
  }
}

.verdict-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.verdict-banner {
  flex: 1;
  padding: 16px 24px;
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: glowPulse 2s infinite;
}

.verdict-banner.real {
  background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), transparent);
  color: #44ff44;
  border-left: 4px solid #44ff44;
}

.verdict-banner.partially-verified {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.1), transparent);
  color: #ffa500;
  border-left: 4px solid #ffa500;
}

.verdict-banner.false {
  background: linear-gradient(135deg, rgba(255, 0, 0, 0.1), transparent);
  color: #ff4444;
  border-left: 4px solid #ff4444;
}

.voice-control-wrapper {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 2;
}

.voice-control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.voice-control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.voice-control-button.speaking {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.4);
  animation: pulse 1.5s infinite;
}

.voice-icon {
  font-size: 20px;
}

/* Add styles for partially verified sections */
.fact-section.partially-verified {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.05), rgba(0, 0, 0, 0.2));
  border-left: 4px solid #ffa500;
}

.partially-verified .section-title {
  color: #ffa500;
}

.partially-verified .fact-item {
  background: rgba(255, 165, 0, 0.05);
}

.partially-verified .fact-icon {
  background: rgba(255, 165, 0, 0.1);
  color: #ffa500;
}

/* Update confidence badge for partially verified */
.confidence-badge.medium {
  background: linear-gradient(135deg, #ffa500, #ff8c00);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(255, 165, 0, 0.2);
}

@media (max-width: 768px) {
  .voice-control-wrapper {
    position: relative;
    top: 0;
    right: 0;
    margin-top: 16px;
}

  .verdict-section {
    flex-direction: column;
    align-items: stretch;
  }
}

.fact-check-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.fact-row {
  display: flex;
  gap: 24px;
  width: 100%;
}

.fact-section {
  flex: 1;
  padding: 24px;
  border-radius: 12px;
  background: var(--color-card);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  animation: slideDown 0.5s ease forwards;
  opacity: 0;
  transform: translateY(20px);
}

.fact-section:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.fact-section.verified {
  border-left: 5px solid var(--color-success);
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.2));
}

.fact-section.unverified {
  border-left: 5px solid #ff9800;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.2));
}

.fact-section.contradiction {
  border-left: 5px solid var(--color-error);
  background: linear-gradient(135deg, rgba(213, 0, 0, 0.1), rgba(213, 0, 0, 0.2));
}

.fact-section.resources {
  border-left: 5px solid var(--color-primary);
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.2));
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.fact-icon {
  width: 24px;
  height: 24px;
}

.fact-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.topics-container {
  max-width: 800px;
  margin: 32px auto;
  padding: 24px;
  background: var(--color-card);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.topics-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  min-height: 60px;
}

.topic-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.remove-topic {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-topic:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.add-topic {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.add-topic input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  transition: all 0.2s ease;
}

.add-topic input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.add-topic input::placeholder {
  color: var(--color-text-secondary);
}

.add-topic button {
  padding: 12px 24px;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-topic button:hover {
  background: var(--color-secondary);
  transform: translateY(-2px);
}

.add-topic button:active {
  transform: translateY(0);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .topics-container {
    margin: 16px;
    padding: 16px;
  }

  .add-topic {
    flex-direction: column;
  }

  .add-topic button {
    width: 100%;
  }
}
.fact-item {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.fact-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.history-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background: linear-gradient(135deg, var(--color-card), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
}

.history-sidebar.active {
  transform: translateX(0);
}

.history-item {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.history-item .timestamp {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.history-item .verdict {
  font-weight: 600;
  margin-top: 4px;
}

.history-item .verdict.real {
  color: var(--color-success);
}

.history-item .verdict.partially-verified {
  color: #ff9800;
}

.history-item .verdict.false {
  color: var(--color-error);
}

.clear-history {
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--color-error);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-history:hover {
  background: #c62828;
}

@keyframes slideDown {
  to {
    opacity: 1;
    transform: translateY(0);
}
}

@media (max-width: 768px) {
  .fact-row {
    flex-direction: column;
}

  .fact-section {
    width: 100%;
}

  .history-sidebar {
    width: 100%;
  }
}

.empty-history {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

/* Adjust main content when history is shown */
.fact-check-area.with-history {
  margin-right: 340px;
}

@media (max-width: 1200px) {
  .fact-check-area.with-history {
    margin-right: 0;
  }
  
  .history-sidebar {
    width: 280px;
    right: 16px;
  }
}

@media (max-width: 768px) {
  .history-sidebar {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 320px;
    max-height: 80vh;
  }
}

.fact-item a {
  color: var(--color-primary);
  text-decoration: none;
  transition: all 0.2s ease;
  border-bottom: 1px dashed var(--color-primary);
}

.fact-item a:hover {
  color: var(--color-secondary);
  border-bottom-color: var(--color-secondary);
}

/* Specific colors for different sections */
.verified-facts .fact-item a {
  color: #44ff44;
  border-bottom-color: #44ff44;
}

.verified-facts .fact-item a:hover {
  color: #66ff66;
  border-bottom-color: #66ff66;
}

.unverified-claims .fact-item a {
  color: #ffd700;
  border-bottom-color: #ffd700;
}

.unverified-claims .fact-item a:hover {
  color: #ffe44d;
  border-bottom-color: #ffe44d;
}

.contradictions .fact-item a {
  color: #ff4444;
  border-bottom-color: #ff4444;
}

.contradictions .fact-item a:hover {
  color: #ff6666;
  border-bottom-color: #ff6666;
}

/* Add some spacing between icon and text */
.fact-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.fact-item .fact-icon {
  flex-shrink: 0;
}

/* Make sure links break properly */
.fact-item span {
  word-break: break-word;
}

/* Add these styles at the end of your style section */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.modal-content.fact-check-modal {
  background: var(--color-card);
  border-radius: 16px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
}
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.modal-header {
  margin-bottom: 24px;
  padding-right: 40px;
}

.modal-title {
  font-size: 24px;
  color: var(--color-text);
  margin-bottom: 8px;
}

.source-meta {
  display: flex;
  gap: 12px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.source-name {
  color: var(--color-primary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-content.fact-check-modal {
    width: 95%;
    padding: 16px;
}

  .fact-row {
    flex-direction: column;
  }

  .modal-title {
    font-size: 20px;
  }
}
</style>