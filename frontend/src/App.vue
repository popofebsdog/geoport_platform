<template>
  <div class="h-screen flex flex-col transition-colors duration-300" :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'" style="border-right: none !important; outline: none !important;">
    <!-- 頂部導航欄 -->
    <nav class="border-b flex-shrink-0 transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'">
      <div class="w-full px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-stretch h-16">
          <!-- 左側：系統標題（點擊回首頁） -->
          <div class="flex items-stretch pr-6 border-r transition-colors duration-300"
               :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
            <button class="text-left cursor-pointer group flex flex-col justify-center p-0 bg-transparent border-none outline-none h-full"
                    @click="navigateTo('Home')"
                    title="回首頁">
              <h1 class="text-sm font-semibold tracking-tight transition-colors duration-300"
                  :class="isDarkMode
                    ? 'text-white group-hover:text-slate-300'
                    : 'text-gray-900 group-hover:text-brand'">
                GeoPORTech
              </h1>
              <p class="text-xs font-normal tracking-wide uppercase transition-colors duration-300 mt-0.5"
                 :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">
                山區公路防災預警
              </p>
            </button>
          </div>
          
          <!-- 中間：功能模組導航 -->
          <div class="flex-1 flex items-stretch">
            <div class="flex items-stretch">
              <BookmarkTab
                v-for="tab in tabs"
                :key="tab.name"
                :tab="tab"
                :isActive="$route.name === tab.name"
                :isDarkMode="isDarkMode"
                @click="navigateTo(tab.name)"
              />
            </div>
          </div>
          
          <!-- 右側：工具列 -->
          <div class="flex items-center gap-0 pl-4 border-l transition-colors duration-300"
               :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">

            <!-- 系統時間 -->
            <div class="hidden xl:flex flex-col items-end justify-center px-4 border-r transition-colors duration-300"
                 :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
              <span class="text-xs font-mono font-medium tabular-nums transition-colors"
                    :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">{{ currentTime }}</span>
              <span class="text-xs uppercase tracking-widest transition-colors"
                    :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">TST</span>
            </div>

            <!-- 控制面板觸發 -->
            <div class="control-panel-container relative">
              <button
                @click="toggleControlPanel"
                class="flex items-center justify-center w-10 h-10 mx-1 rounded transition-colors duration-150 cursor-pointer"
                :class="showControlPanel
                  ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-900')
                  : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900')"
                title="系統設定"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>

              <!-- 控制面板下拉 -->
              <div v-if="showControlPanel"
                   class="absolute top-full right-0 mt-1 z-[1100] w-60 border rounded shadow-md transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'">
                <div class="px-4 pt-3 pb-1 border-b transition-colors"
                     :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
                  <p class="text-[11px] font-semibold uppercase tracking-widest"
                     :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">系統設定</p>
                </div>

                <div class="p-3 space-y-1">
                  <!-- 主題切換 -->
                  <div class="flex items-center justify-between py-1.5">
                    <span class="text-xs transition-colors"
                          :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">顯示主題</span>
                    <button @click="toggleTheme"
                            class="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors"
                            :class="isDarkMode
                              ? 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'">
                      <svg v-if="isDarkMode" class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                      </svg>
                      {{ isDarkMode ? '淺色' : '深色' }}
                    </button>
                  </div>

                  <!-- 字體大小 -->
                  <div class="flex items-center justify-between py-1.5">
                    <span class="text-xs transition-colors"
                          :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">字體大小</span>
                    <div class="flex items-center gap-0.5">
                      <button v-for="(sz, label) in { 'S': 'small', 'M': 'medium', 'L': 'large' }" :key="sz"
                              @click="setFontSize(sz)"
                              class="w-7 h-7 text-xs font-semibold rounded border transition-colors"
                              :class="fontSize === sz
                                ? 'bg-brand text-white border-brand'
                                : (isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800')">
                        {{ label }}
                      </button>
                    </div>
                  </div>

                  <!-- 登入狀態 -->
                  <div class="flex items-center justify-between py-1.5">
                    <span class="text-xs truncate mr-2 transition-colors"
                          :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
                      {{ isLoggedIn ? (currentUser?.displayName || currentUser?.username || '已登入') : '未登入' }}
                    </span>
                    <button @click="isLoggedIn ? handleLogout() : $router.push('/login')"
                            class="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors flex-shrink-0"
                            :class="isLoggedIn
                              ? (isDarkMode ? 'border-red-900 text-red-400 hover:border-red-700 hover:text-red-300' : 'border-red-200 text-red-600 hover:border-red-400')
                              : (isDarkMode ? 'border-slate-700 text-slate-300 hover:border-slate-500' : 'border-gray-200 text-brand hover:border-brand')">
                      {{ isLoggedIn ? '登出' : '登入' }}
                    </button>
                  </div>

                  <!-- 使用者管理 -->
                  <div v-if="isAdmin" class="pt-1 mt-1 border-t transition-colors"
                       :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
                    <button @click="$router.push('/admin'); showControlPanel = false"
                            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                            :class="isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"/>
                      </svg>
                      資料管理後台
                    </button>
                    <button @click="$router.push('/users'); showControlPanel = false"
                            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                            :class="isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                      使用者管理
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- 主要内容区域 -->
    <main class="flex-1 overflow-hidden">
      <router-view :is-dark-mode="isDarkMode" />
    </main>
    
    <!-- 全局Alert組件 -->
    <GlobalAlert />
  </div>
</template>

<script>
import { toRef, computed } from 'vue'
import BookmarkTab from './components/BookmarkTab.vue'
import GlobalAlert from './components/GlobalAlert.vue'

export default {
  name: 'App',
  components: {
    BookmarkTab,
    GlobalAlert
  },
  data() {
    return {
      isDarkMode: false,
      fontSize: 'medium',
      isLoggedIn: !!localStorage.getItem('authToken'),
      currentUser: JSON.parse(localStorage.getItem('authUser') || 'null'),
      showControlPanel: false,
      currentTime: '',
      timeUpdateInterval: null,
      tabs: [
        {
          name: 'DisasterCollection',
          title: '災情資料搜集',
          subtitle: 'Data Collection',
          icon: '📊',
          color: 'bg-blue-500',
          statusClass: 'online'
        },
        {
          name: 'EarlyWarning',
          title: '預警分析',
          subtitle: 'Early Warning',
          icon: '⚠️',
          color: 'bg-orange-500',
          statusClass: 'warning'
        }
      ]
    }
  },
  methods: {
    navigateTo(routeName) {
      this.$router.push({ name: routeName })
    },
    updateCurrentTime() {
      const now = new Date()
      this.currentTime = now.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      // 保存主題偏好到localStorage
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')
      // 更新html class
      this.updateThemeClass()
    },
    updateThemeClass() {
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    loadTheme() {
      // 從localStorage讀取主題偏好
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
      } else {
        // 如果沒有保存的主題，檢查系統偏好
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      this.updateThemeClass()
    },
    setFontSize(size) {
      this.fontSize = size
      // 保存字體大小偏好到localStorage
      localStorage.setItem('fontSize', size)
      // 更新html class
      this.updateFontSizeClass()
    },
    updateFontSizeClass() {
      // 移除舊的字體大小class
      document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
      // 添加新的字體大小class
      document.documentElement.classList.add(`font-${this.fontSize}`)
    },
    loadFontSize() {
      // 從localStorage讀取字體大小偏好
      const savedFontSize = localStorage.getItem('fontSize')
      if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
        this.fontSize = savedFontSize
      }
      this.updateFontSizeClass()
    },
    syncAuthState() {
      this.isLoggedIn = !!localStorage.getItem('authToken')
      this.currentUser = JSON.parse(localStorage.getItem('authUser') || 'null')
    },
    handleLogout() {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      this.isLoggedIn = false
      this.currentUser = null
      this.showControlPanel = false
      this.$router.push('/login')
    },
    toggleControlPanel() {
      this.showControlPanel = !this.showControlPanel
    },
    handleClickOutside(event) {
      // 如果點擊的不是控制面板相關元素，則關閉面板
      if (this.showControlPanel && !event.target.closest('.control-panel-container')) {
        this.showControlPanel = false
      }
    }
  },
  computed: {
    isAdmin() {
      return this.currentUser?.role === 'admin'
    }
  },
  provide() {
    return {
      isDarkMode: computed(() => this.isDarkMode),
      fontSize: computed(() => this.fontSize),
      isLoggedIn: computed(() => this.isLoggedIn)
    }
  },
  mounted() {
    // 載入主題設定
    this.loadTheme()
    
    // 載入字體大小設定
    this.loadFontSize()
    
    // 初始化時間顯示
    this.updateCurrentTime()
    
    // 設置定時器每秒更新時間
    this.timeUpdateInterval = setInterval(() => {
      this.updateCurrentTime()
    }, 1000)
    
    // 監聽系統主題變化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.isDarkMode = e.matches
        this.updateThemeClass()
      }
    })
    
    // 監聽點擊外部關閉控制面板
    document.addEventListener('click', this.handleClickOutside)

    // Sync login state when localStorage changes (e.g. after login redirect)
    window.addEventListener('storage', this.syncAuthState)
    // Also sync on route change (login page sets token then redirects)
    this.$router.afterEach(() => {
      this.isLoggedIn = !!localStorage.getItem('authToken')
      this.currentUser = JSON.parse(localStorage.getItem('authUser') || 'null')
    })
  },
  beforeUnmount() {
    // 清理定時器
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval)
    }
    
    // 移除事件監聽器
    document.removeEventListener('click', this.handleClickOutside)
    window.removeEventListener('storage', this.syncAuthState)
  }
}
</script>

<style>
/* 字體大小偏好移至 main.css，此處保留空 style 區塊 */
</style> 
