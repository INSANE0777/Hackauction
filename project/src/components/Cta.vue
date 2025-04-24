<script setup lang="ts">
import { onMounted } from 'vue'
import { gsap } from 'gsap'

onMounted(() => {
  // Animate CTA section
  gsap.from('.cta-content', {
    scrollTrigger: {
      trigger: '.cta-content',
      start: 'top 80%',
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section id="cta" class="cta">
    <div class="container">
      <div class="cta-content brutalist-card">
        <h2 class="cta-title">Ready to Transform Your News Experience?</h2>
        <p class="cta-text">
          Join thousands of users who enjoy personalized, AI-powered news updates 
          delivered straight to their device. Stay informed, save time, and cut through the noise.
        </p>
        
        <form class="cta-form">
          <div class="form-group">
            <input type="email" placeholder="Enter your email address" class="form-input" required />
            <button type="submit" class="brutalist-button">Get Early Access</button>
          </div>
          <p class="form-note">* We'll notify you when PopNews launches. No spam, ever.</p>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta {
  background-color: var(--color-background);
  position: relative;
}

.cta-content {
  padding: var(--spacing-5);
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.cta-title {
  margin-bottom: var(--spacing-3);
}

.cta-text {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: var(--spacing-4);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  margin-bottom: var(--spacing-2);
}

.form-input {
  flex: 1;
  padding: var(--spacing-2);
  border: var(--border-size) solid var(--color-secondary);
  font-family: var(--font-sans);
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-note {
  font-size: 0.9rem;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .form-group {
    flex-direction: column;
    gap: var(--spacing-2);
  }
  
  .form-input, .brutalist-button {
    width: 100%;
  }
}
</style>