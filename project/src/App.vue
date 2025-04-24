<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Header from './components/Header.vue'
import Hero from './components/Hero.vue'
import Features from './components/Features.vue'
import Demo from './components/Demo.vue'
import Testimonials from './components/Testimonials.vue'
import Cta from './components/Cta.vue'
import Footer from './components/Footer.vue'
import { useScroll } from './composables/useScroll'

const { initScroll, destroyScroll } = useScroll()

onMounted(() => {
  initScroll()
})

onUnmounted(() => {
  destroyScroll()
})
</script>

<template>
  <div class="app">
    <Header/>
    <main>
      <Hero />
      <Features />
      <Demo />
      <Testimonials />
      <Cta />
    </main>
    <Footer />
  </div>
</template>

<style>
:root {
  --color-primary: #FF3D00;
  --color-secondary: #161616;
  --color-accent: #4A00E0;
  --color-success: #00C853;
  --color-warning: #FFD600;
  --color-error: #D50000;
  --color-text: #121212;
  --color-text-light: #FFFFFF;
  --color-background: #F5F5F5;
  --color-background-rgb: 245, 245, 245;
  --color-card: #FFFFFF;
  --color-border: #E0E0E0;

  --spacing-1: 8px;
  --spacing-2: 16px;
  --spacing-3: 24px;
  --spacing-4: 32px;
  --spacing-5: 48px;
  --spacing-6: 64px;
  
  --font-mono: 'Space Mono', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
  
  --shadow-sm: 4px 4px 0 rgba(0, 0, 0, 0.8);
  --shadow-md: 8px 8px 0 rgba(0, 0, 0, 0.8);
  --shadow-lg: 12px 12px 0 rgba(0, 0, 0, 0.8);
  
  --border-size: 2px;
  --border-radius: 4px;
  
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: var(--font-sans);
  background-color: var(--color-background);
  color: var(--color-text);
  overflow-x: hidden;
}

body {
  display: block;
  margin: 0;
  min-height: 100vh;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-mono);
  line-height: 1.2;
  font-weight: 700;
  margin-bottom: var(--spacing-3);
}

h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
}

h2 {
  font-size: clamp(2rem, 4vw, 3rem);
}

h3 {
  font-size: clamp(1.5rem, 3vw, 2rem);
}

p {
  line-height: 1.6;
  margin-bottom: var(--spacing-2);
}

.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-3);
}

.brutalist-card {
  background-color: var(--color-card);
  border: var(--border-size) solid var(--color-secondary);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.brutalist-card:hover {
  transform: translate(-4px, -4px);
  box-shadow: var(--shadow-lg);
}

.brutalist-button {
  font-family: var(--font-mono);
  background-color: var(--color-primary);
  color: var(--color-text-light);
  border: var(--border-size) solid var(--color-secondary);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.brutalist-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}

.brutalist-button:active {
  transform: translate(0, 0);
  box-shadow: var(--shadow-sm);
}

section {
  padding: var(--spacing-6) 0;
}

#app {
  max-width: 100%;
  margin: 0;
  padding: 0;
  text-align: left;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #121212;
    --color-background-rgb: 18, 18, 18;
    --color-text: #FFFFFF;
    --color-text-light: #FFFFFF;
    --color-card: #1E1E1E;
    --color-border: #333333;
  }
}
</style>