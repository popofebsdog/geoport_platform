import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import DisasterCollection from '@/views/DisasterCollection.vue'
import EarlyWarning from '@/views/EarlyWarning.vue'
import ProjectManagement from '@/views/ProjectManagement.vue'
import ProjectDetail from '@/views/ProjectDetail.vue'
import Login from '@/views/Login.vue'
import UserManagement from '@/views/UserManagement.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true, title: '登入' }
  },
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
    path: '/projects/:id',
    name: 'project-detail',
    component: ProjectDetail,
    meta: { title: '專案詳情' }
  },
  {
    path: '/early-warning',
    name: 'EarlyWarning',
    component: EarlyWarning,
    meta: { title: '預警分析平台' }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { title: '使用者管理', requireAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    return next()
  }
  const token = localStorage.getItem('authToken')
  if (!token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.meta.requireAdmin) {
    try {
      const user = JSON.parse(localStorage.getItem('authUser') || '{}')
      if (user?.role !== 'admin') return next({ path: '/' })
    } catch {
      return next({ path: '/' })
    }
  }
  next()
})

export default router