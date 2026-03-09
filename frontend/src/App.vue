<template>
  <div class="h-screen flex flex-col transition-colors duration-300" :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'" style="border-right: none !important; outline: none !important;">
    <!-- 戰情儀表板導航欄 -->
    <nav class="border-b flex-shrink-0 transition-colors duration-300" 
         :class="isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'">
      <div class="w-full px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- 左側：系統標題 -->
          <div class="flex items-center">
              <div>
              <h1 class="text-lg font-semibold leading-tight transition-colors duration-300" 
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  GeoPORTech 山區公路防災預警系統
                </h1>
              <p class="text-xs font-normal transition-colors duration-300 mt-0.5" 
                 :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
                  數位科技整合應用戰情儀表板
                </p>
            </div>
          </div>
          
          <!-- 中間：功能模組導航 -->
          <div class="flex-1 flex items-center justify-center">
          <div class="flex items-center space-x-2">
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
          
          <!-- 右側：控制面板 -->
          <div class="flex items-center">
            
            <!-- 系統時間顯示 -->
            <div class="hidden xl:flex items-center ml-4 pl-4 border-l transition-colors duration-300" 
                 :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
              <div class="text-right">
                <div class="text-sm font-mono font-medium transition-colors duration-300" 
                     :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
                  {{ currentTime }}
                </div>
                <div class="text-xs transition-colors duration-300" 
                     :class="isDarkMode ? 'text-slate-500' : 'text-gray-500'">
                  台北標準時間
                </div>
              </div>
            </div>
            
            <!-- 控制面板觸發按鈕 -->
            <div class="control-panel-container relative flex items-center ml-4 pl-4 border-l transition-colors duration-300" 
                 :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
              <button 
                @click="toggleControlPanel"
                class="p-2 rounded-md transition-all duration-200 hover:bg-opacity-80 cursor-pointer"
                :class="isDarkMode ? 'bg-slate-700/50 hover:bg-slate-600/70' : 'bg-surface-100 hover:bg-surface-200'"
                title="控制面板"
              >
                <svg class="w-5 h-5 transition-colors duration-300" 
                     :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
              
              <!-- 可縮放控制面板 -->
              <div v-if="showControlPanel" class="absolute top-full right-0 mt-2 z-[1100] transition-all duration-200 ease-in-out opacity-100 scale-100">
              <div class="rounded-lg shadow-lg border min-w-64 transition-colors duration-300 overflow-hidden"
                   :class="isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-surface-200'">
                <!-- Brand accent strip -->
                <div class="h-1" style="background:linear-gradient(90deg,#1e5c8a,#3378b5)"></div>
                <div class="p-4">
                <!-- 面板標題 -->
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-semibold transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">控制面板</h3>
                  <button 
                    @click="toggleControlPanel"
                    class="p-1 rounded-lg transition-colors duration-200"
                    :class="isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-surface-100'"
                  >
                    <svg class="w-4 h-4 transition-colors duration-300" 
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                
                <!-- 控制選項 -->
                <div class="space-y-4">
                  <!-- 主題切換 -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">主題模式</span>
                    <button 
                      @click="toggleTheme"
                      class="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105"
                      :class="isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-surface-100 hover:bg-surface-200'"
                    >
                      <svg v-if="isDarkMode" class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                      </svg>
                      <svg v-else class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                      </svg>
                      <span class="text-xs font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
                        {{ isDarkMode ? '深色' : '淺色' }}
                      </span>
                    </button>
                  </div>
                  
                  <!-- 字體大小 -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">字體大小</span>
                    <div class="flex items-center space-x-1">
                      <button 
                        @click="setFontSize('small')"
                        class="px-2 py-1 text-xs rounded transition-all duration-300 hover:scale-105"
                        :class="fontSize === 'small' ? 
                          'text-white' : 
                          (isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-surface-200 text-gray-600 hover:bg-surface-300')"
                        :style="fontSize === 'small' ? { backgroundColor: '#1e5c8a' } : {}"
                        title="小字體"
                      >
                        A
                      </button>
                      <button 
                        @click="setFontSize('medium')"
                        class="px-2 py-1 text-sm rounded transition-all duration-300 hover:scale-105"
                        :class="fontSize === 'medium' ? 
                          'text-white' : 
                          (isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-surface-200 text-gray-600 hover:bg-surface-300')"
                        :style="fontSize === 'medium' ? { backgroundColor: '#1e5c8a' } : {}"
                        title="中字體"
                      >
                        A
                      </button>
                      <button 
                        @click="setFontSize('large')"
                        class="px-2 py-1 text-base rounded transition-all duration-300 hover:scale-105"
                        :class="fontSize === 'large' ? 
                          'text-white' : 
                          (isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-surface-200 text-gray-600 hover:bg-surface-300')"
                        :style="fontSize === 'large' ? { backgroundColor: '#1e5c8a' } : {}"
                        title="大字體"
                      >
                        A
                      </button>
                    </div>
                  </div>
                  
                  <!-- 登入狀態 -->
                  <div class="flex items-center justify-between">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                      {{ isLoggedIn ? (currentUser?.displayName || currentUser?.username || '已登入') : '未登入' }}
                    </span>
                    <button 
                      @click="isLoggedIn ? handleLogout() : $router.push('/login')"
                      class="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105"
                      :class="isLoggedIn ? 
                        (isDarkMode ? 'bg-green-900/60 hover:bg-red-900/60' : 'bg-green-50 hover:bg-red-50 border border-green-200 hover:border-red-200') : 
                        (isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'hover:bg-brand-light border border-surface-200')"
                      :style="!isLoggedIn && !isDarkMode ? { color: '#1e5c8a' } : {}"
                    >
                      <svg v-if="!isLoggedIn" class="w-4 h-4 transition-colors duration-300" 
                           :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                      </svg>
                      <svg v-else class="w-4 h-4 transition-colors duration-300" 
                           :class="isDarkMode ? 'text-green-400' : 'text-green-600'" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                      </svg>
                      <span class="text-xs font-medium transition-colors duration-300" 
                            :class="isLoggedIn ? 
                              (isDarkMode ? 'text-green-300' : 'text-green-700') : 
                              (isDarkMode ? 'text-gray-400' : 'text-gray-600')">
                        {{ isLoggedIn ? '登出' : '登入' }}
                      </span>
                    </button>
                  </div>
                  
                  <!-- 使用者管理（管理員才顯示） -->
                  <div v-if="isAdmin" class="pt-2 border-t transition-colors duration-300"
                       :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
                    <button @click="$router.push('/users'); showControlPanel = false"
                            class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200"
                            :class="isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-brand hover:bg-brand-light'">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                      使用者管理
                    </button>
                  </div>
                </div>
                </div><!-- /p-4 wrapper -->
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
/* 字體大小控制 */
.font-small {
  font-size: 14px;
}

.font-small h1, .font-small .text-lg {
  font-size: 16px;
}

.font-small h2, .font-small .text-base {
  font-size: 14px;
}

.font-small h3, .font-small .text-sm {
  font-size: 12px;
}

.font-small .text-xs {
  font-size: 10px;
}

.font-medium {
  font-size: 16px;
}

.font-medium h1, .font-medium .text-lg {
  font-size: 18px;
}

.font-medium h2, .font-medium .text-base {
  font-size: 16px;
}

.font-medium h3, .font-medium .text-sm {
  font-size: 14px;
}

.font-medium .text-xs {
  font-size: 12px;
}

.font-large {
  font-size: 18px;
}

.font-large h1, .font-large .text-lg {
  font-size: 20px;
}

.font-large h2, .font-large .text-base {
  font-size: 18px;
}

.font-large h3, .font-large .text-sm {
  font-size: 16px;
}

.font-large .text-xs {
  font-size: 14px;
}

/* 響應式字體大小調整 */
@media (max-width: 1024px) {
  .font-small {
    font-size: 13px;
  }
  
  .font-medium {
    font-size: 15px;
  }
  
  .font-large {
    font-size: 17px;
  }
}

@media (max-width: 768px) {
  .font-small {
    font-size: 12px;
  }
  
  .font-medium {
    font-size: 14px;
  }
  
  .font-large {
    font-size: 16px;
  }
}
</style> 