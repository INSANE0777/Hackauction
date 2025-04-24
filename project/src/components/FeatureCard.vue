<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon: string
}>()
</script>

<template>
  <div class="feature-card brutalist-card">
    <div class="feature-icon">{{ icon }}</div>
    <h3 class="feature-title">{{ title }}</h3>
    <p class="feature-description">{{ description }}</p>
  </div>
</template>

<style scoped>
.feature-card {
  background-color: var(--color-card);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: var(--spacing-2);
}

.feature-title {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  margin-bottom: var(--spacing-2);
}

.feature-description {
  line-height: 1.6;
  margin-top: auto;
}
</style>