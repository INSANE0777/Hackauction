<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useScroll } from '../composables/useScroll'

const { scrollTo } = useScroll()
const topics = ref(['AI', 'Climate', 'SpaceX', 'Tech', 'Science', 'Health'])
const currentTopic = ref(0)

const scrollToFeatures = () => {
  scrollTo('#features')
}

const rotateTopic = () => {
  const tl = gsap.timeline()
  tl.to('.topic-text', {
    y: 20,
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      currentTopic.value = (currentTopic.value + 1) % topics.value.length
    }
  })
  tl.to('.topic-text', {
    y: 0,
    opacity: 1,
    duration: 0.3
  })
}

onMounted(() => {
  // Initial animation
  const tl = gsap.timeline()
  
  tl.from('.hero-title', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
  .from('.hero-subtitle', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  }, '-=0.4')
  .from('.hero-cta', {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  }, '-=0.4')
  
  // Set interval for rotating topics
  setInterval(rotateTopic, 2000)
})
</script>

<template>
  <section class="hero">
    <div class="video-background">
      <video autoplay loop muted playsinline>
        <source src="/src/assets/bg.mp4" type="video/mp4">
      </video>
    </div>
    <div class="hero-wrapper">
      <div class="container hero-container">
        <div class="hero-content">
          <h1 class="hero-title">Your AI News Buddy for <span class="topic-container"><span class="topic-text" :key="currentTopic">{{ topics[currentTopic] }}</span></span></h1>
          
          <p class="hero-subtitle">
            PopNews delivers real-time updates on topics you care about,
            summarizes articles, and flags potentially fake news.
          </p>
          
          <div class="hero-cta">
            <button class="brutalist-button" @click="scrollToFeatures">Discover Features</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.hero-wrapper {
  width: 100%;
  padding: var(--spacing-6) 0;
  padding-top: calc(var(--spacing-6) * 2);
  display: flex;
  align-items: center;
}

.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;
  overflow: hidden;
  opacity: 1;
}

.video-background video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 100%;
  min-height: 100%;
}

.hero-container {
  position: relative;
  z-index: 1;
}

.hero-content {
  max-width: 600px;
  background-color: rgba(var(--color-background-rgb), 0.85);
  padding: var(--spacing-4);
  border: var(--border-size) solid var(--color-secondary);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.1;
  margin-bottom: var(--spacing-3);
}

.topic-container {
  display: inline-block;
  color: var(--color-primary);
  position: relative;
}

.topic-text {
  display: inline-block;
}

.hero-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.3rem);
  margin-bottom: var(--spacing-4);
  max-width: 90%;
}

.hero-cta {
  margin-top: var(--spacing-4);
}

@media (max-width: 1024px) {
  .hero-content {
    margin: 0 auto;
    text-align: center;
  }
  
  .hero-subtitle {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .hero {
    padding-top: calc(var(--spacing-6) * 1.5);
  }
  
  .hero-content {
    margin: var(--spacing-3);
  }
}
</style>

Fixing the Spline Background Width Issue

Looking at your Hero component, I can see that the spline background is not taking up the full width of the screen. The issue appears to be with the CSS styling for the spline-viewer element.

In your Hero.vue file, you have the following CSS for the spline background:
vue
.spline-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;
  overflow: hidden;
}

spline-viewer {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
