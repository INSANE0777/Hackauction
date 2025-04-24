import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Auth from './components/Auth.vue'
import Workspace from './components/Workspace.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: App
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: Workspace,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token') !== null
  
  if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to auth page
    next({ name: 'Auth' })
  } else {
    next()
  }
})

export default router