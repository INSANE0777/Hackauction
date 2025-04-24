<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import { onMounted } from 'vue'

// Form state
const isLogin = ref(true)
const email = ref('')
const password = ref('')
const name = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const successMessage = ref('')

// Toggle between login and signup forms
const toggleForm = () => {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
  successMessage.value = ''
}

// Handle form submission
const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true
  
  try {
    const endpoint = isLogin.value 
      ? 'http://localhost:3000/api/login' 
      : 'http://localhost:3000/api/signup'
    
    const payload = isLogin.value 
      ? { email: email.value, password: password.value }
      : { name: name.value, email: email.value, password: password.value }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed')
    }
    
    // Handle successful authentication
    successMessage.value = isLogin.value 
      ? 'Login successful! Redirecting...' 
      : 'Account created successfully! You can now log in.'
    
    if (isLogin.value) {
      // Store token or user data in localStorage/sessionStorage
      localStorage.setItem('token', data.token)
      // Redirect to workspace page after a short delay
      setTimeout(() => {
        window.location.href = '/workspace'
      }, 1500)
    } else {
      // Switch to login form after successful signup
      setTimeout(() => {
        isLogin.value = true
      }, 1500)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // Animate auth form in
  gsap.from('.auth-container', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section class="auth">
    <div class="container">
      <div class="auth-container brutalist-card">
        <div class="auth-header">
          <h2 class="auth-title">{{ isLogin ? 'Sign In' : 'Create Account' }}</h2>
          <p class="auth-subtitle">
            {{ isLogin ? 'Welcome back to PopNews!' : 'Join PopNews for personalized AI news' }}
          </p>
        </div>
        
        <form @submit.prevent="handleSubmit" class="auth-form">
          <!-- Name field (signup only) -->
          <div v-if="!isLogin" class="form-group">
            <label for="name">Full Name</label>
            <input 
              type="text" 
              id="name" 
              v-model="name" 
              class="form-input" 
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <!-- Email field -->
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              class="form-input" 
              placeholder="Enter your email address"
              required
            />
          </div>
          
          <!-- Password field -->
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              class="form-input" 
              placeholder="Enter your password"
              required
              minlength="6"
            />
          </div>
          
          <!-- Error message -->
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          
          <!-- Success message -->
          <div v-if="successMessage" class="success-message">
            {{ successMessage }}
          </div>
          
          <!-- Submit button -->
          <button 
            type="submit" 
            class="brutalist-button auth-button" 
            :disabled="isLoading"
          >
            {{ isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account') }}
          </button>
        </form>
        
        <!-- Toggle between login/signup -->
        <div class="auth-toggle">
          <p>
            {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
            <a href="#" @click.prevent="toggleForm">
              {{ isLogin ? "Sign Up" : "Sign In" }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--spacing-6);
  background-color: var(--color-background);
}

.auth-container {
  max-width: 500px;
  width: 100%;
  margin: 0 auto;
  padding: var(--spacing-4);
}

.auth-header {
  text-align: center;
  margin-bottom: var(--spacing-4);
}

.auth-title {
  margin-bottom: var(--spacing-1);
}

.auth-subtitle {
  color: var(--color-text);
  opacity: 0.8;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.form-group label {
  font-family: var(--font-mono);
  font-weight: 600;
}

.form-input {
  padding: var(--spacing-2);
  border: var(--border-size) solid var(--color-secondary);
  background-color: var(--color-card);
  font-family: var(--font-sans);
  transition: box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  box-shadow: var(--shadow-sm);
}

.auth-button {
  margin-top: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2);
}

.auth-toggle {
  margin-top: var(--spacing-4);
  text-align: center;
}

.auth-toggle a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.error-message {
  background-color: rgba(213, 0, 0, 0.1);
  border-left: 3px solid var(--color-error);
  padding: var(--spacing-2);
  color: var(--color-error);
}

.success-message {
  background-color: rgba(0, 200, 83, 0.1);
  border-left: 3px solid var(--color-success);
  padding: var(--spacing-2);
  color: var(--color-success);
}
</style>