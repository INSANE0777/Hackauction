<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const testimonials = [
  {
    id: 1,
    text: "PopNews has completely transformed how I consume news. The AI summaries save me so much time, and I love how it flags potentially misleading information.",
    name: "Sarah K.",
    role: "Journalist"
  },
  {
    id: 2,
    text: "As someone who's always looking to stay informed but doesn't have hours to read articles, this app is a game-changer. The personalized topics feature is exactly what I needed.",
    name: "Michael T.",
    role: "Software Engineer"
  },
  {
    id: 3,
    text: "The fake news detection is surprisingly accurate. In today's world of information overload, having an AI assistant to help sort through the noise is invaluable.",
    name: "Priya M.",
    role: "Data Scientist"
  }
]

onMounted(() => {
  // Animate testimonials section
  gsap.from('.testimonials-title', {
    scrollTrigger: {
      trigger: '.testimonials-title',
      start: 'top 80%',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
  
  gsap.from('.testimonial-card', {
    scrollTrigger: {
      trigger: '.testimonials-grid',
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
  <section id="testimonials" class="testimonials">
    <div class="container">
      <h2 class="testimonials-title">What Our Users <span class="highlight">Are Saying</span></h2>
      
      <div class="testimonials-grid">
        <div
          v-for="testimonial in testimonials"
          :key="testimonial.id"
          class="testimonial-card brutalist-card"
        >
          <div class="quote-mark">"</div>
          <p class="testimonial-text">{{ testimonial.text }}</p>
          <div class="testimonial-author">
            <div class="author-name">{{ testimonial.name }}</div>
            <div class="author-role">{{ testimonial.role }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testimonials {
  background-color: var(--color-secondary);
  color: var(--color-text-light);
}

.testimonials-title {
  text-align: center;
  margin-bottom: var(--spacing-5);
  color: var(--color-text-light);
}

.highlight {
  color: var(--color-primary);
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.testimonial-card {
  background-color: var(--color-card);
  color: var(--color-text);
  position: relative;
  padding-top: var(--spacing-4);
}

.quote-mark {
  position: absolute;
  top: -30px;
  left: 20px;
  font-family: var(--font-mono);
  font-size: 6rem;
  color: var(--color-primary);
  line-height: 1;
  opacity: 0.8;
}

.testimonial-text {
  position: relative;
  z-index: 1;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: var(--spacing-3);
}

.testimonial-author {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-2);
}

.author-name {
  font-weight: 700;
  font-family: var(--font-mono);
}

.author-role {
  font-size: 0.9rem;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .testimonials-grid {
    grid-template-columns: 1fr;
  }
}
</style>