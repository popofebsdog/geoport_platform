import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'
import api, { projectAPI, dataAPI, dataFileAPI, reportAPI, authAPI } from './services/api.js'

const app = createApp(App)

// 注入 API 服務到所有組件
app.config.globalProperties.$api = {
  ...api,
  projectAPI,
  dataAPI,
  dataFileAPI,
  reportAPI,
  authAPI,
  // 為了向後兼容，保留直接的 api 方法
  get: api.get,
  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete
}

app.use(router).mount('#app') 