import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import DisasterCollection from '@/views/DisasterCollection.vue'
import EarlyWarning from '@/views/EarlyWarning.vue'
import TestAlert from '@/views/TestAlert.vue'
import ApiTest from '@/views/ApiTest.vue'
import ProjectManagement from '@/views/ProjectManagement.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/disaster-collection',
    name: 'DisasterCollection',
    component: DisasterCollection,
    meta: { title: '災情資料搜集資訊平台' }
  },
  {
    path: '/projects',
    name: 'ProjectManagement',
    component: ProjectManagement,
    meta: { title: '專案管理' }
  },
  {
    path: '/early-warning',
    name: 'EarlyWarning',
    component: EarlyWarning,
    meta: { title: '預警分析平台' }
  },
  {
    path: '/test-alert',
    name: 'TestAlert',
    component: TestAlert,
    meta: { title: 'Alert 測試' }
  },
  {
    path: '/api-test',
    name: 'ApiTest',
    component: ApiTest,
    meta: { title: 'API 測試' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 