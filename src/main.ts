import { createPinia } from 'pinia'
import { createApp } from 'vue'
import 'vue-sonner/style.css'

import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
