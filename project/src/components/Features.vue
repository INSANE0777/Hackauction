<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FeatureCard from './FeatureCard.vue'

gsap.registerPlugin(ScrollTrigger)

const features = [
  {
    id: 1,
    title: 'Personalized News Feed',
    description: 'Add or remove topics to build a custom news feed tailored to your interests.',
    icon: '🔍'
  },
  {
    id: 2,
    title: 'Real-time Updates',
    description: 'Get breaking news and headlines as they happen using the GNews API.',
    icon: '⚡'
  },
  {
    id: 3,
    title: 'AI Summarization',
    description: 'Each article is summarized in 2-3 bullet points using the Gemini API for quick reading.',
    icon: '🤖'
  },
  {
    id: 4,
    title: 'Fake News Detection',
    description: 'Our AI helps flag potentially misleading or fake news using advanced reasoning.',
    icon: '🛡️'
  }
]

onMounted(() => {
  // Animate features in staggered sequence
  gsap.from('.features-title', {
    scrollTrigger: {
      trigger: '.features-title',
      start: 'top 80%',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
  
  gsap.from('.feature-card', {
    scrollTrigger: {
      trigger: '.features-grid',
      start: 'top 70%',
    },
    y: 100,
    opacity: 0,
    stagger: 0.2,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section id="features" class="features">
    <div class="container">
      <h2 class="features-title">Smart Features, <span class="highlight">Smarter News</span></h2>
      
      <div class="features-grid">
        <FeatureCard
          v-for="feature in features"
          :key="feature.id"
          :title="feature.title"
          :description="feature.description"
          :icon="feature.icon"
          class="feature-card"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  background-color: var(--color-background);
  position: relative;
}

.features-title {
  text-align: center;
  margin-bottom: var(--spacing-5);
}

.highlight {
  color: var(--color-primary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>