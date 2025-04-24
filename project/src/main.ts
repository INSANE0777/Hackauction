import { createApp } from 'vue'
import './style.css'
import AppWrapper from './AppWrapper.vue'
import router from './router'

createApp(AppWrapper).use(router).mount('#app')
