<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('fact-check') // 'fact-check', 'topics', or 'feed'
const newsInput = ref('')
const isProcessing = ref(false)
const topics = ref([])
const feedArticles = ref([])
const GNEWS_API_KEY = '326ebe6753972b25c146d6d9171a6aa6'

const processingSteps = ref([
  { id: 1, text: 'Reading your news', completed: false, current: false },
  { id: 2, text: 'Reading articles', completed: false, current: false },
  { id: 3, text: 'Calling the fact-checking agent', completed: false, current: false },
  { id: 4, text: 'Collecting reports', completed: false, current: false }
])
const report = ref(null)
const errorMessage = ref('')

const submitNews = async () => {
  if (!newsInput.value.trim() || isProcessing.value) return

  isProcessing.value = true
  report.value = null
  errorMessage.value = ''

  // Reset processing steps
  processingSteps.value.forEach(step => {
    step.completed = false
    step.current = false
  })

  try {
    // Step 1: Reading news
    processingSteps.value[0].current = true
    await new Promise(resolve => setTimeout(resolve, 1000)) // Add a small delay for UX

    const response = await fetch('http://localhost:3001/api/agent/fact-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: newsInput.value })
    })

    if (!response.ok) {
      throw new Error(`Failed to get fact check report: ${response.status}`)
    }

    processingSteps.value[0].completed = true
    processingSteps.value[0].current = false

    // Step 2: Reading articles
    processingSteps.value[1].current = true
    await new Promise(resolve => setTimeout(resolve, 1000)) // Add a small delay for UX

    const result = await response.json()
    console.log('API Response:', result) // Add debugging

    processingSteps.value[1].completed = true
    processingSteps.value[1].current = false

    // Step 3: Fact checking
    processingSteps.value[2].current = true
    await new Promise(resolve => setTimeout(resolve, 1000)) // Add a small delay for UX
    processingSteps.value[2].completed = true
    processingSteps.value[2].current = false

    // Step 4: Collecting reports
    processingSteps.value[3].current = true
    console.log('Raw API Response:', result) // Debug log for entire response

    // Fix: Access the report from the correct path in the response
    const reportData = result.result?.report || ''
    console.log('Report Data to Parse:', reportData) // Debug log for what we're parsing

    // Parse the report using the new structure
    const parsedReport = parseReportFromText(reportData)

    report.value = {
      verdict: parsedReport.verdict || 'Not Available',
      confidence: parsedReport.confidence || 'Low',
      analysis: {
        verified: parsedReport.verified,
        unverified: parsedReport.unverified,
        contradictions: parsedReport.contradictions
      },
      sources: (result.result?.search_results || []).map(source => ({
        tier: determineTier(source.score || 0),
        name: source.title || 'Unknown Source',
        note: source.snippet || source.content || '',
        url: source.url || '#',
        type: determineSourceType(source.url || '')
      }))
    }

    console.log('Final Parsed Report:', report.value) // Debug log for final parsed data

    processingSteps.value[3].completed = true
    processingSteps.value[3].current = false

  } catch (error) {
    console.error('Error processing news:', error)
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'

    // Reset processing steps on error
    processingSteps.value.forEach(step => {
      step.completed = false
      step.current = false
    })
  } finally {
    isProcessing.value = false
  }
}

// Update the parseReportFromText function to be more robust
const parseReportFromText = (reportText: string) => {
  if (!reportText || typeof reportText !== 'string') {
    console.warn('Invalid report text:', reportText)
    return {
      verdict: 'Not Available',
      confidence: 'Low',
      verified: [],
      unverified: [],
      contradictions: []
    }
  }

  // Clean the report text
  const cleanedText = reportText.trim()

  // Try to match verdict with multiple possible formats
  const verdictMatch =
    cleanedText.match(/\*\*Verdict:\*\* ([^\n]+)/) ||
    cleanedText.match(/Verdict: ([^\n]+)/) ||
    cleanedText.match(/verdict: ([^\n]+)/)

  // Try to match confidence with multiple possible formats
  const confidenceMatch =
    cleanedText.match(/\*\*Confidence Level:\*\* ([^\n]+)/) ||
    cleanedText.match(/Confidence: ([^\n]+)/) ||
    cleanedText.match(/confidence: ([^\n]+)/)

  // Try to match verified elements with multiple possible formats
  const verifiedMatch =
    cleanedText.match(/\*\*Verified Elements:\*\*\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/Verified Elements:\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/verified elements:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Try to match unverified elements with multiple possible formats
  const unverifiedMatch =
    cleanedText.match(/\*\*Unverified Elements:\*\*\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/Unverified Claims:\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/unverified claims:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Try to match contradictions with multiple possible formats
  const contradictionsMatch =
    cleanedText.match(/\*\*Contradictions:\*\*\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/Contradictions:\n((?:[\s-]*[^\n]+\n?)+)/) ||
    cleanedText.match(/contradictions:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i)

  // Enhanced helper to safely split and map matched groups
  const splitAndMap = (matchResult: RegExpMatchArray | null) => {
    if (!matchResult || !matchResult[1]) return []
    return matchResult[1].split('\n')
      .map(line => line.replace(/^[\s-]*/, '').trim()) // Handle leading spaces, hyphens, etc.
      .filter(line => line.length > 0) // Remove empty lines
  }

  const result = {
    verdict: verdictMatch ? verdictMatch[1].trim() : 'Not Available',
    confidence: confidenceMatch ? confidenceMatch[1].trim() : 'Low',
    verified: splitAndMap(verifiedMatch),
    unverified: splitAndMap(unverifiedMatch),
    contradictions: splitAndMap(contradictionsMatch)
  }

  // If we got no data from the parsing, log the input for debugging
  if (!verdictMatch && !confidenceMatch && !verifiedMatch && !unverifiedMatch && !contradictionsMatch) {
    console.warn('Failed to parse report text:', cleanedText)
  }

  return result
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
})

const fetchNewsByTopic = async (topic: string) => {
  try {
    const response = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&token=${GNEWS_API_KEY}&lang=en`)
    if (!response.ok) {
      throw new Error('Failed to fetch news')
    }
    const data = await response.json()
    return data.articles || []
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

const updateFeed = async () => {
  const allArticles = []
  for (const topic of topics.value) {
    const articles = await fetchNewsByTopic(topic)
    allArticles.push(...articles)
  }
  feedArticles.value = allArticles
}
</script>

<template>
  <section class="workspace">
    <div class="nav-buttons">
      <button @click="goToHome" class="nav-button home-button">
        <span class="button-icon">🏠</span> Home
      </button>
      <button @click="signOut" class="nav-button sign-out-button">
        <span class="button-icon">🚪</span> Sign Out
      </button>
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
        <h1 class="workspace-title">Say the news you heard...<span class="cursor">|</span></h1>
        <p class="workspace-subtitle">
          Paste the news below to get the authenticity report. It takes some time to generate the report.
        </p>

        <div class="news-input-container brutalist-card">
          <textarea
            v-model="newsInput"
            class="news-input"
            placeholder="NASA chairman recently told in an interview that he likes to drink coffee with cream..."
            :disabled="isProcessing"
          ></textarea>
          <button class="submit-button" @click="submitNews" :disabled="isProcessing">
            <span class="icon">↗</span>
          </button>
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

        <div v-if="report" class="report-container brutalist-card">
          <h2 class="report-title">Fact Check Report</h2>

          <div
            class="report-verdict"
            :class="report?.verdict ? report.verdict.toLowerCase().replace(' ', '-') : ''"
          >
            <strong>Verdict:</strong> {{ report?.verdict }}
            <span class="confidence-badge">{{ report?.confidence }} Confidence</span>
          </div>

          <div class="report-analysis">
            <h3>Analysis</h3>

            <div class="analysis-section">
              <h4>Verified Elements:</h4>
              <ul>
                <li v-for="(item, index) in report.analysis?.verified" :key="`verified-${index}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div class="analysis-section">
              <h4>Unverified Claims:</h4>
              <ul>
                <li v-for="(item, index) in report.analysis.unverified" :key="`unverified-${index}`">
                  {{ item }}
                </li>
              </ul>
            </div>

            <div class="analysis-section">
              <h4>Contradictions:</h4>
              <ul>
                <li v-for="(item, index) in report.analysis.contradictions" :key="`contradiction-${index}`">
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>

          <div class="report-sources">
            <h3>Sources</h3>
            <div
              v-for="(source, index) in report.sources"
              :key="`source-${index}`"
              class="source-item"
              :class="[source.tier.toLowerCase().replace(' ', '-'), source.type]"
            >
              <div class="source-tier">{{ source.tier }}</div>
              <div class="source-details">
                <div class="source-name">
                  <a :href="source.url" target="_blank" rel="noopener noreferrer">
                    <span class="source-icon" v-if="source.type === 'video'">📺</span>
                    <span class="source-icon" v-else-if="source.type === 'wiki'">📚</span>
                    <span class="source-icon" v-else-if="source.type === 'image'">📷</span>
                    <span class="source-icon" v-else>📰</span>
                    {{ source.name }}
                  </a>
                </div>
                <div class="source-note">{{ source.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Topics Tab -->
      <div v-if="activeTab === 'topics'" class="tab-content">
        <h1 class="workspace-title">Manage Your Topics<span class="cursor">|</span></h1>
        <div class="topics-container brutalist-card">
          <div class="topics-list">
            <div v-for="topic in topics" :key="topic" class="topic-item">
              <span>{{ topic }}</span>
              <button @click="topics = topics.filter(t => t !== topic)" class="remove-topic">×</button>
            </div>
          </div>
          <div class="add-topic">
            <input 
              v-model="newTopic" 
              placeholder="Enter a new topic..." 
              @keyup.enter="topics.push(newTopic); newTopic = ''"
            />
            <button @click="topics.push(newTopic); newTopic = ''">Add</button>
          </div>
        </div>
      </div>

      <!-- Feed Tab -->
      <div v-if="activeTab === 'feed'" class="tab-content">
        <h1 class="workspace-title">Your News Feed<span class="cursor">|</span></h1>
        <div class="feed-container">
          <div v-for="article in feedArticles" :key="article.url" class="article-card brutalist-card">
            <img v-if="article.image" :src="article.image" :alt="article.title" class="article-image">
            <div class="article-content">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-description">{{ article.description }}</p>
              <div class="article-meta">
                <span class="article-source">{{ article.source.name }}</span>
                <a :href="article.url" target="_blank" rel="noopener noreferrer" class="read-more">Read More</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace {
  min-height: 100vh;
  background-color: var(--color-background);
  padding-top: var(--spacing-6);
  position: relative;
}

.nav-buttons {
  position: fixed;
  top: var(--spacing-3);
  right: var(--spacing-3);
  display: flex;
  gap: var(--spacing-2);
  z-index: 100;
}

.nav-button {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  border: var(--border-size) solid var(--color-secondary);
  background-color: var(--color-card);
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
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

.workspace-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-4);
}

.workspace-title {
  text-align: center;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-mono);
  position: relative;
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
  margin-bottom: var(--spacing-4);
  overflow: hidden;
}

.news-input {
  flex: 1;
  padding: var(--spacing-3);
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 1rem;
  resize: none;
  min-height: 100px;
  outline: none;
}

.submit-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: 0 var(--spacing-3);
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button:hover {
  background-color: var(--color-secondary);
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.icon {
  font-size: 1.5rem;
}

.processing-container {
  margin-bottom: var(--spacing-4);
}

.processing-step {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-2);
  opacity: 0.5;
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
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease;
}

.analysis-section:hover {
  transform: translateX(5px);
}

.analysis-section h4 {
  color: var(--color-primary);
  font-size: 1.2rem;
  margin-bottom: var(--spacing-2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.analysis-section h4::before {
  content: '→';
  color: var(--color-secondary);
}

.analysis-section ul {
  padding-left: var(--spacing-4);
  list-style: none;
}

.analysis-section li {
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  padding-left: 24px;
}

.analysis-section li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--color-primary);
}

.analysis-section li:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(5px);
}

.source-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-2);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  display: flex;
  gap: var(--spacing-3);
}

.source-item:hover {
  transform: translateX(8px);
  background: rgba(255, 255, 255, 0.08);
}

.source-tier {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.source-name a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
}

.source-name a:hover {
  color: var(--color-secondary);
}

.source-icon {
  font-size: 1.4em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.source-item.tier-1 {
  background-color: rgba(0, 200, 83, 0.1);
}

.source-item.tier-2 {
  background-color: rgba(255, 152, 0, 0.1);
}

.source-item.tier-3 {
  background-color: rgba(213, 0, 0, 0.1);
}

.source-tier {
  font-weight: 600;
  margin-right: var(--spacing-2);
  min-width: 60px;
  color: var(--color-secondary);
}

.source-name {
  font-weight: 600;
  margin-bottom: 2px;
  color: var(--color-text);
}

.source-note {
  font-size: 0.9rem;
  opacity: 0.8;
  color: var(--color-text);
}

.error-message {
  color: var(--color-error);
  margin-top: var(--spacing-2);
  margin-bottom: var(--spacing-4);
  text-align: center;
  font-weight: 600;
  padding: var(--spacing-2);
  border: 1px solid var(--color-error);
  border-radius: 4px;
  background-color: rgba(213, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .report-verdict {
    flex-direction: column;
    align-items: flex-start;
  }

  .confidence-badge {
    margin-top: var(--spacing-1);
  }

  .nav-buttons {
    position: static;
    justify-content: flex-end;
    padding: var(--spacing-2) var(--spacing-3);
  }
}
</style>
