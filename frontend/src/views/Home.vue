<template>
  <div class="min-h-full transition-colors duration-300" :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'">
    <!-- 英雄區域 -->
    <div class="relative overflow-hidden">
      <!-- 背景漸變 -->
      <div class="absolute inset-0 bg-gradient-to-br transition-all duration-1000"
           :class="isDarkMode ? 
             'from-slate-900 via-blue-900/20 to-slate-800' : 
             'from-blue-50 via-white to-cyan-50'">
      </div>
      
      <!-- 動態背景元素 -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 transition-all duration-1000"
             :class="isDarkMode ? 'bg-blue-500' : 'bg-blue-400'"
             style="animation: float 6s ease-in-out infinite;"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 transition-all duration-1000"
             :class="isDarkMode ? 'bg-cyan-500' : 'bg-cyan-400'"
             style="animation: float 8s ease-in-out infinite reverse;"></div>
      </div>
      
      <!-- 主要內容 -->
      <div class="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
          <!-- 標題區域 -->
          <div class="text-center mb-16">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 transition-all duration-300"
                 :class="isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'">
              <svg class="w-10 h-10 transition-colors duration-300"
                   :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
            </div>
            
            <h1 class="text-5xl md:text-6xl font-bold mb-6 transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              <span class="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                GeoPort
              </span>
            </h1>
            
            <h2 class="text-2xl md:text-3xl font-semibold mb-4 transition-colors duration-300"
                :class="isDarkMode ? 'text-slate-200' : 'text-gray-700'">
              山區公路防災預警系統
            </h2>
            
            <p class="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed transition-colors duration-300"
               :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
              整合數位科技與地理資訊系統，提供即時災情監控、預警分析與資料管理功能，
              守護山區公路安全，保障用路人生命財產。
            </p>
            
            <!-- 系統狀態指示器 -->
            <div class="flex justify-center items-center space-x-8 mt-8">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span class="text-sm font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">系統正常</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <span class="text-sm font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">即時監控</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50"></div>
                <span class="text-sm font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">預警模式</span>
              </div>
            </div>
          </div>
          
          <!-- 功能模組卡片 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <!-- 災情資料搜集 -->
            <div class="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 cursor-pointer"
                 :class="isDarkMode ? 
                   'bg-slate-800/50 border border-slate-700 hover:border-blue-500/50' : 
                   'bg-white/80 border border-gray-200 hover:border-blue-300'"
                 @click="navigateTo('DisasterCollection')">
              
              <!-- 卡片背景效果 -->
              <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div class="relative p-8">
                <!-- 圖標 -->
                <div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300"
                     :class="isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'">
                  <svg class="w-8 h-8 transition-colors duration-300"
                       :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                
                <h3 class="text-2xl font-bold mb-4 transition-colors duration-300"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  災情資料搜集
                </h3>
                
                <p class="text-base leading-relaxed mb-6 transition-colors duration-300"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
                  收集與管理災害相關數據，包括災害類型、影響範圍、損失評估等資訊。
                  提供完整的資料上傳、分類、搜尋與分析功能。
                </p>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2 text-blue-600 group-hover:text-blue-700 transition-colors duration-300">
                    <span class="font-medium">進入平台</span>
                    <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                  
                  <!-- 功能標籤 -->
                  <div class="flex space-x-2">
                    <span class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-300"
                          :class="isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'">
                      資料管理
                    </span>
                    <span class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-300"
                          :class="isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'">
                      即時上傳
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 預警分析平台 -->
            <div class="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105 cursor-pointer"
                 :class="isDarkMode ? 
                   'bg-slate-800/50 border border-slate-700 hover:border-orange-500/50' : 
                   'bg-white/80 border border-gray-200 hover:border-orange-300'"
                 @click="navigateTo('EarlyWarning')">
              
              <!-- 卡片背景效果 -->
              <div class="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div class="relative p-8">
                <!-- 圖標 -->
                <div class="flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300"
                     :class="isDarkMode ? 'bg-orange-600/20' : 'bg-orange-100'">
                  <svg class="w-8 h-8 transition-colors duration-300"
                       :class="isDarkMode ? 'text-orange-400' : 'text-orange-600'"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                
                <h3 class="text-2xl font-bold mb-4 transition-colors duration-300"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  預警分析平台
                </h3>
                
                <p class="text-base leading-relaxed mb-6 transition-colors duration-300"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
                  基於歷史數據和即時監測，提供災害預警分析和風險評估功能。
                  智能預測潛在風險，及時發出預警通知。
                </p>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2 text-orange-600 group-hover:text-orange-700 transition-colors duration-300">
                    <span class="font-medium">進入平台</span>
                    <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                  
                  <!-- 功能標籤 -->
                  <div class="flex space-x-2">
                    <span class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-300"
                          :class="isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'">
                      智能預警
                    </span>
                    <span class="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-300"
                          :class="isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'">
                      風險評估
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 地圖預覽區域 -->
          <div class="relative overflow-hidden rounded-2xl transition-all duration-300"
               :class="isDarkMode ? 
                 'bg-slate-800/50 border border-slate-700' : 
                 'bg-white/80 border border-gray-200'">
            
            <!-- 地圖標題 -->
            <div class="p-6 border-b transition-colors duration-300"
                 :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-bold transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    即時地圖監控
                  </h3>
                  <p class="text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
                    查看當前監控區域與專案分布
                  </p>
                </div>
                
                <!-- 地圖控制按鈕 -->
                <div class="flex items-center space-x-2">
                  <button class="p-2 rounded-lg transition-colors duration-300"
                          :class="isDarkMode ? 
                            'bg-slate-700 hover:bg-slate-600 text-slate-300' : 
                            'bg-gray-100 hover:bg-gray-200 text-gray-600'"
                          title="全螢幕查看">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 地圖組件 -->
            <div class="relative">
              <MapComponent 
                :height="500"
                :show-controls="true"
                :interactive="true"
                :isDarkMode="isDarkMode"
              />
              
              <!-- 地圖覆蓋信息 -->
              <div class="absolute top-4 left-4 flex space-x-2">
                <div class="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300"
                     :class="isDarkMode ? 'bg-green-900/80 text-green-300' : 'bg-green-100 text-green-700'">
                  監控中
                </div>
                <div class="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300"
                     :class="isDarkMode ? 'bg-blue-900/80 text-blue-300' : 'bg-blue-100 text-blue-700'">
                  即時更新
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { toRef } from 'vue'
import MapComponent from '@/components/MapComponent.vue'

export default {
  name: 'Home',
  components: {
    MapComponent
  },
  inject: ['isDarkMode'],
  methods: {
    navigateTo(routeName) {
      this.$router.push({ name: routeName })
    }
  }
}
</script>

<style scoped>
/* 浮動動畫 */
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

/* 漸變文字動畫 */
@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

/* 卡片懸停效果 */
.group:hover .transform {
  transform: translateY(-2px);
}

/* 響應式調整 */
@media (max-width: 768px) {
  .text-5xl {
    font-size: 2.5rem;
  }
  
  .text-6xl {
    font-size: 3rem;
  }
  
  .text-2xl {
    font-size: 1.5rem;
  }
  
  .text-3xl {
    font-size: 1.875rem;
  }
}

/* 深色模式特殊效果 */
.dark .bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, 
    rgba(15, 23, 42, 0.8), 
    rgba(30, 41, 59, 0.4), 
    rgba(15, 23, 42, 0.8));
}

/* 淺色模式特殊效果 */
.light .bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, 
    rgba(239, 246, 255, 0.8), 
    rgba(255, 255, 255, 0.9), 
    rgba(236, 254, 255, 0.8));
}

/* 玻璃效果 */
.backdrop-blur {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 陰影效果增強 */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dark .shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 
              0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

/* 脈衝動畫增強 */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 漸變邊框效果 */
.gradient-border {
  position: relative;
  background: linear-gradient(45deg, #3b82f6, #06b6d4);
  padding: 2px;
  border-radius: 1rem;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 2px;
  background: inherit;
  border-radius: inherit;
  z-index: -1;
}
</style> 