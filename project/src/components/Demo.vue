<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const selectedTopics = ref(['AI', 'Climate', 'Tech'])
const availableTopics = ref(['Health', 'Politics', 'Sports', 'SpaceX', 'Science'])

const articles = ref([
  {
    id: 1,
    title: 'AI Makes Breakthrough in Medical Research',
    source: 'TechNews',
    topics: ['AI', 'Health'],
    summary: [
      'New AI model predicts drug interactions with 98% accuracy',
      'System trained on 2M+ medical records from global sources',
      'Expected to reduce adverse reactions by 40% in clinical settings'
    ],
    isFake: false
  },
  {
    id: 2,
    title: 'SpaceX Successfully Launches Starship SN20',
    source: 'Space Today',
    topics: ['SpaceX', 'Tech'],
    summary: [
      'Starship reaches orbit for the first time in company history',
      'Reusable rocket design could reduce space travel costs by 90%',
      'Mission paves way for future Mars colonization efforts'
    ],
    isFake: false
  },
  {
    id: 3,
    title: 'Revolutionary Battery Technology Extends EV Range to 1000 Miles',
    source: 'EV Report',
    topics: ['Tech', 'Climate'],
    summary: [
      'New solid-state battery shows 400% improvement over current technology',
      'Claims 5-minute charging time for full capacity',
      'No peer-reviewed studies have confirmed these results yet'
    ],
    isFake: true
  }
])

const addTopic = (topic: string) => {
  selectedTopics.value.push(topic)
  availableTopics.value = availableTopics.value.filter(t => t !== topic)
}

const removeTopic = (topic: string) => {
  availableTopics.value.push(topic)
  selectedTopics.value = selectedTopics.value.filter(t => t !== topic)
}

onMounted(() => {
  // Animate demo section
  gsap.from('.demo-title', {
    scrollTrigger: {
      trigger: '.demo-title',
      start: 'top 80%',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
  
  gsap.from('.topic-selector', {
    scrollTrigger: {
      trigger: '.topic-selector',
      start: 'top 75%',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
  
  gsap.from('.article-card', {
    scrollTrigger: {
      trigger: '.news-feed',
      start: 'top 70%',
    },
    y: 80,
    opacity: 0,
    stagger: 0.3,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section id="demo" class="demo">
    <div class="container">
      <h2 class="demo-title">See <span class="highlight">PopNews</span> in Action</h2>
      
      <div class="topic-selector">
        <div class="selected-topics">
          <h3>Your Topics</h3>
          <div class="topic-chips">
            <div
              v-for="topic in selectedTopics"
              :key="`selected-${topic}`"
              class="topic-chip"
              @click="removeTopic(topic)"
            >
              {{ topic }} <span class="remove-icon">×</span>
            </div>
          </div>
        </div>
        
        <div class="available-topics">
          <h3>Available Topics</h3>
          <div class="topic-chips">
            <div
              v-for="topic in availableTopics"
              :key="`available-${topic}`"
              class="topic-chip available"
              @click="addTopic(topic)"
            >
              {{ topic }} <span class="add-icon">+</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="news-feed">
        <div
          v-for="article in articles"
          :key="article.id"
          class="article-card brutalist-card"
          :class="{ 'fake-news': article.isFake }"
        >
          <div class="article-topics">
            <span
              v-for="topic in article.topics"
              :key="`article-${article.id}-${topic}`"
              class="article-topic"
            >
              {{ topic }}
            </span>
          </div>
          
          <h3 class="article-title">{{ article.title }}</h3>
          <div class="article-source">{{ article.source }}</div>
          
          <div class="article-summary">
            <h4>AI Summary</h4>
            <ul>
              <li v-for="(point, index) in article.summary" :key="index">
                {{ point }}
              </li>
            </ul>
          </div>
          
          <div v-if="article.isFake" class="fake-news-alert">
            <span class="alert-icon">⚠️</span> AI has detected this may contain misleading information
          </div>
          <div v-else class="verified-news">
            <span class="verify-icon">✓</span> Content verified by AI
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo {
  background-color: var(--color-background);
  position: relative;
}

.demo-title {
  text-align: center;
  margin-bottom: var(--spacing-5);
}

.highlight {
  color: var(--color-primary);
}

.topic-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-5);
}

.topic-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.topic-chip {
  display: inline-flex;
  align-items: center;
  background-color: var(--color-primary);
  color: var(--color-text-light);
  padding: 6px 12px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: var(--border-size) solid var(--color-secondary);
  box-shadow: var(--shadow-sm);
}

.topic-chip:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.topic-chip.available {
  background-color: var(--color-card);
  color: var(--color-text);
}

.remove-icon, .add-icon {
  margin-left: 6px;
  font-weight: bold;
}

.news-feed {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
  margin-top: var(--spacing-5);
}

.article-card {
  background-color: var(--color-card);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.article-card.fake-news {
  border-color: var(--color-error);
}

.article-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--spacing-2);
}

.article-topic {
  background-color: var(--color-accent);
  color: white;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 2px;
}

.article-title {
  font-family: var(--font-mono);
  font-size: 1.4rem;
  margin-bottom: var(--spacing-1);
}

.article-source {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: var(--spacing-2);
}

.article-summary {
  margin-top: var(--spacing-2);
}

.article-summary h4 {
  font-size: 1rem;
  margin-bottom: var(--spacing-1);
}

.article-summary ul {
  padding-left: var(--spacing-3);
}

.article-summary li {
  margin-bottom: 6px;
}

.fake-news-alert {
  margin-top: var(--spacing-3);
  padding: var(--spacing-2);
  background-color: rgba(213, 0, 0, 0.1);
  border-left: 3px solid var(--color-error);
  display: flex;
  align-items: center;
  font-weight: 600;
}

.verified-news {
  margin-top: var(--spacing-3);
  padding: var(--spacing-2);
  background-color: rgba(0, 200, 83, 0.1);
  border-left: 3px solid var(--color-success);
  display: flex;
  align-items: center;
  font-weight: 600;
}

.alert-icon, .verify-icon {
  margin-right: var(--spacing-1);
}

@media (max-width: 768px) {
  .topic-selector {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }
  
  .available-topics {
    margin-top: var(--spacing-3);
  }
}
</style>