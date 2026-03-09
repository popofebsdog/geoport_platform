<template>
  <div v-if="isVisible" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
         :class="isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'">
      
      <!-- 標題欄 -->
      <div class="flex items-center justify-between p-4 border-b"
           :class="isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'">
        <h3 class="text-base font-semibold transition-colors duration-300"
            :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          專案資訊
        </h3>
        <button @click="closeModal"
                class="p-1.5 rounded-md transition-colors duration-300"
                :class="isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 內容區域 -->
      <div class="p-4 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
           :class="isDarkMode ? 'bg-slate-800 scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500' : 'bg-white scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400'">
        <div class="space-y-6">
          
          <!-- 專案基本資訊 -->
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600"></div>
              <h4 class="text-sm font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                基本資訊
              </h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 專案名稱 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  專案名稱
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  {{ project?.name || '未設定' }}
                </div>
              </div>
            </div>
            
            <!-- 專案描述 -->
            <div>
              <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                專案描述
              </label>
              <div class="p-2 rounded-md border transition-colors duration-300 min-h-[60px]"
                   :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                {{ project?.description || '無描述' }}
              </div>
            </div>
          </div>
          
          <!-- 分隔線 -->
          <div class="h-px transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-200'"></div>
          
          <!-- 道路資訊 -->
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-green-600"></div>
              <h4 class="text-sm font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                道路資訊
              </h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 道路類型 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  道路類型
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  {{ getRoadTypeLabel(project?.roadType) }}
                </div>
              </div>
              
              <!-- 道路編號 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  道路編號
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  {{ project?.roadNumber || '未設定' }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分隔線 -->
          <div class="h-px transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-200'"></div>
          
          <!-- 時間資訊 -->
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-purple-600"></div>
              <h4 class="text-sm font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                時間資訊
              </h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 開始時間 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  開始時間
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  {{ formatDateTime(project?.startDate) }}
                </div>
              </div>
              
              <!-- 結束時間 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  結束時間
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  {{ formatDateTime(project?.endDate) }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分隔線 -->
          <div class="h-px transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-200'"></div>
          
          <!-- 位置資訊 -->
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-1 h-4 rounded-full bg-gradient-to-b from-orange-500 to-orange-600"></div>
              <h4 class="text-sm font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                位置資訊
              </h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 緯度 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  緯度
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  <span class="font-mono text-sm">{{ getLatitude() }}</span>
                </div>
              </div>
              
              <!-- 經度 -->
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  經度
                </label>
                <div class="p-2 rounded-md border transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                  <span class="font-mono text-sm">{{ getLongitude() }}</span>
                </div>
              </div>
            </div>
          </div>
          
          
        </div>
      </div>
      
      <!-- 底部按鈕 -->
      <div class="flex items-center justify-end space-x-3 p-4 border-t"
           :class="isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'">
        <button @click="closeModal"
                class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-300"
                :class="isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-slate-700' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'">
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectInfoModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    project: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  mounted() {
    // 調試：顯示專案物件結構
  },
  methods: {
    closeModal() {
      this.$emit('close')
    },
    
    formatDateTime(date) {
      if (!date) return '未設定'
      const d = new Date(date)
      return d.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    formatDate(date) {
      if (!date) return '未設定'
      const d = new Date(date)
      return d.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    },
    
    getLatitude() {
      // 優先檢查 location 對象
      if (this.project?.location?.lat) {
        return this.project.location.lat.toFixed(6)
      }
      // 檢查直接的 latitude 屬性
      if (this.project?.latitude) {
        return this.project.latitude.toFixed(6)
      }
      // 檢查 locationGeometry 中的座標
      if (this.project?.locationGeometry?.coordinates && this.project.locationGeometry.coordinates.length >= 2) {
        return this.project.locationGeometry.coordinates[1].toFixed(6) // 緯度是第二個元素
      }
      return '未設定'
    },
    
    getLongitude() {
      // 優先檢查 location 對象
      if (this.project?.location?.lng) {
        return this.project.location.lng.toFixed(6)
      }
      // 檢查直接的 longitude 屬性
      if (this.project?.longitude) {
        return this.project.longitude.toFixed(6)
      }
      // 檢查 locationGeometry 中的座標
      if (this.project?.locationGeometry?.coordinates && this.project.locationGeometry.coordinates.length >= 2) {
        return this.project.locationGeometry.coordinates[0].toFixed(6) // 經度是第一個元素
      }
      return '未設定'
    },
    
    
    getRoadTypeLabel(roadType) {
      const labels = {
        'highway': '公路',
        'national': '國道',
        'railway': '鐵路',
        'other': '其他'
      }
      return labels[roadType] || '未設定'
    }
  }
}
</script>
