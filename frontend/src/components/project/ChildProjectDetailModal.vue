<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black bg-opacity-50 p-4"
         @click.self="closeModal">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
           @click.stop>
        
        <!-- 標題欄 -->
        <div class="flex items-center justify-between p-6 border-b"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <div class="flex items-center space-x-3">
            <div class="p-2 rounded-lg"
                 :class="isDarkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-600'">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                事件詳情
              </h2>
              <p class="text-sm mt-0.5"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                查看事件紀錄的完整資訊
              </p>
            </div>
          </div>
          
          <button @click="closeModal"
                  class="p-2 rounded-lg transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 內容區域 -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="space-y-6">
            <!-- 事件名稱 -->
            <div>
              <label class="block text-sm font-semibold mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                事件名稱
              </label>
              <div class="p-3 rounded-lg border transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                {{ childProject?.name || '未設定' }}
              </div>
            </div>
            
            <!-- 事件描述 -->
            <div>
              <label class="block text-sm font-semibold mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                事件描述
              </label>
              <div class="p-3 rounded-lg border transition-colors duration-300 min-h-[80px] whitespace-pre-wrap"
                   :class="isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                {{ childProject?.description || '無描述' }}
              </div>
            </div>
            
            <!-- 事件時間 -->
            <div>
              <label class="block text-sm font-semibold mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                事件時間
              </label>
              <div class="p-3 rounded-lg border transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                {{ formatEventDate(childProject?.event_date) }}
              </div>
            </div>
            
            <!-- 座標資訊 -->
            <div>
              <label class="block text-sm font-semibold mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                座標位置 (WGS84)
              </label>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    緯度 (Latitude)
                  </label>
                  <div class="p-3 rounded-lg border transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                    {{ formatCoordinate(childProject?.latitude || getLatitudeFromGeometry(childProject)) }}
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    經度 (Longitude)
                  </label>
                  <div class="p-3 rounded-lg border transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                    {{ formatCoordinate(childProject?.longitude || getLongitudeFromGeometry(childProject)) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部按鈕 -->
        <div class="flex items-center justify-end space-x-3 p-6 border-t"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <button
            @click="closeModal"
            class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300"
            :class="isDarkMode 
              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { inject } from 'vue'

export default {
  name: 'ChildProjectDetailModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    childProject: {
      type: Object,
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', props.isDarkMode)
    
    const closeModal = () => {
      emit('close')
    }
    
    // 格式化事件日期
    const formatEventDate = (dateString) => {
      if (!dateString) return '未設定'
      
      try {
        let date = null
        if (typeof dateString === 'string') {
          // 處理 PostgreSQL 格式
          if (dateString.includes(' ')) {
            dateString = dateString.replace(' ', 'T')
          }
          date = new Date(dateString)
        } else {
          date = new Date(dateString)
        }
        
        if (isNaN(date.getTime())) {
          return '日期格式錯誤'
        }
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        
        return `${year}/${month}/${day} ${hours}:${minutes}`
      } catch (error) {
        console.warn('格式化日期失敗:', error)
        return '日期格式錯誤'
      }
    }
    
    // 格式化座標
    const formatCoordinate = (coord) => {
      if (coord === null || coord === undefined || coord === '') {
        return '未設定'
      }
      const num = parseFloat(coord)
      if (isNaN(num)) {
        return '格式錯誤'
      }
      return num.toFixed(7)
    }
    
    // 從 location_geometry 獲取緯度
    const getLatitudeFromGeometry = (project) => {
      if (!project) return null
      if (project.location_geometry && project.location_geometry.coordinates) {
        // GeoJSON 格式：[longitude, latitude]
        return project.location_geometry.coordinates[1]
      }
      return null
    }
    
    // 從 location_geometry 獲取經度
    const getLongitudeFromGeometry = (project) => {
      if (!project) return null
      if (project.location_geometry && project.location_geometry.coordinates) {
        // GeoJSON 格式：[longitude, latitude]
        return project.location_geometry.coordinates[0]
      }
      return null
    }
    
    return {
      isDarkMode,
      closeModal,
      formatEventDate,
      formatCoordinate,
      getLatitudeFromGeometry,
      getLongitudeFromGeometry
    }
  }
}
</script>

<style scoped>
/* 自定義滾動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

:global(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

:global(.dark) .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

