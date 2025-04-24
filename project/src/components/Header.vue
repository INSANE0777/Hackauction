<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { useScroll } from '../composables/useScroll'
import { useRouter } from 'vue-router'

const router = useRouter()
const { scrollTo } = useScroll()
const isMenuOpen = ref(false)
const isScrolled = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const handleNavClick = (target: string) => {
  isMenuOpen.value = false
  scrollTo(target)
}

const handleGetStarted = () => {
  const isAuthenticated = localStorage.getItem('token') !== null
  router.push(isAuthenticated ? '/workspace' : '/auth')
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  
  // Animate header in
  gsap.from('.header', {
    y: -100,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <header class="header" :class="{ 'scrolled': isScrolled }">
    <div class="container header-container">
      <div class="logo">
        <span class="logo-text">Pop<span class="logo-highlight">News</span></span>
      </div>
      
      <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <nav class="nav" :class="{ 'nav-open': isMenuOpen }">
        <ul class="nav-list">
          <li><a href="#features" @click.prevent="handleNavClick('#features')">Features</a></li>
          <li><a href="#demo" @click.prevent="handleNavClick('#demo')">Demo</a></li>
          <li><a href="#testimonials" @click.prevent="handleNavClick('#testimonials')">Testimonials</a></li>
          <li><a href="#" @click.prevent="handleGetStarted" class="nav-cta">Get Started</a></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  padding: var(--spacing-3) 0;
  background-color: transparent;
  transition: all 0.3s ease;
}

.header.scrolled {
  background-color: var(--color-background);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  padding: var(--spacing-2) 0;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
}

.logo-text {
  color: var(--color-text);
}

.logo-highlight {
  color: var(--color-primary);
}

.nav-list {
  display: flex;
  list-style: none;
  gap: var(--spacing-3);
  align-items: center;
}

.nav-list a {
  font-family: var(--font-mono);
  font-weight: 600;
  text-decoration: none;
  color: var(--color-text);
  transition: color 0.2s ease;
  position: relative;
}

.nav-list a::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: -4px;
  left: 0;
  background-color: var(--color-primary);
  transition: width 0.3s ease;
}

.nav-list a:hover {
  color: var(--color-primary);
}

.nav-list a:hover::after {
  width: 100%;
}

.nav-cta {
  background-color: var(--color-primary);
  color: var(--color-text-light) !important;
  border: var(--border-size) solid var(--color-secondary);
  box-shadow: var(--shadow-sm);
  padding: var(--spacing-1) var(--spacing-2);
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
}

.nav-cta:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md);
}

.nav-cta::after {
  display: none !important;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  height: 3px;
  width: 100%;
  background-color: var(--color-text);
  border-radius: 3px;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: flex;
    z-index: 110;
  }
  
  .nav {
    position: fixed;
    top: 0;
    right: -100%;
    width: 80%;
    height: 100vh;
    background-color: var(--color-background);
    transition: right 0.3s ease;
    padding: var(--spacing-6) var(--spacing-3);
    box-shadow: -5px 0 30px rgba(0, 0, 0, 0.1);
  }
  
  .nav.nav-open {
    right: 0;
  }
  
  .nav-list {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-4);
    margin-top: var(--spacing-5);
  }
  
  .nav-list li {
    width: 100%;
  }
  
  .nav-list a {
    display: block;
    font-size: 1.2rem;
    padding: var(--spacing-2) 0;
  }
  
  .menu-toggle.open span:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }
  
  .menu-toggle.open span:nth-child(2) {
    opacity: 0;
  }
  
  .menu-toggle.open span:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }
}
</style>