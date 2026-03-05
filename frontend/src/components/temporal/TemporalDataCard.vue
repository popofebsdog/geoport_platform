<template>
  <div
    class="p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg backdrop-blur-sm cursor-move"
    :class="[
      isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300',
      isActive ? (isDarkMode ? 'ring-2 ring-blue-400/60 shadow-blue-400/20' : 'ring-2 ring-blue-500/60 shadow-blue-500/20') : ''
    ]"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-2">
          <!-- 時序資料圖標 -->
          <div class="flex-shrink-0">
            <svg class="w-4 h-4" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          
          <h4 class="text-sm font-medium transition-colors duration-300 truncate"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ temporalData.name }}
          </h4>
        </div>
        
        <div class="flex items-center space-x-2 mt-1">
          <p class="text-xs transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            {{ formatDate(temporalData.created_at) }}
          </p>
          
          <!-- 資料類型標籤 -->
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                :class="getTypeClass(temporalData.data_type)">
            {{ getTypeLabel(temporalData.data_type) }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center space-x-1 ml-2">
        <!-- 可見性開關 -->
        <label class="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            class="sr-only peer" 
            :checked="isVisible"
            @change="toggleVisibility"
          >
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        
        <!-- 操作按鈕 -->
        <div class="flex items-center space-x-1">
          <!-- 定位按鈕 -->
          <button @click="locateTemporalData"
                  class="p-1 rounded-lg transition-all duration-300 hover:scale-110"
                  :class="isDarkMode 
                    ? 'text-gray-400 hover:text-green-400 hover:bg-green-400/10' 
                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'"
                  :title="temporalData.data_type === 'gnss' ? 'GNSS 定位' : '定位到時序資料'">
            <!-- GNSS 衛星定位圖標 -->
            <svg v-if="temporalData.data_type === 'gnss'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <!-- 衛星軌道 -->
              <circle cx="12" cy="12" r="8" stroke-width="1.5" opacity="0.3"></circle>
              <circle cx="12" cy="12" r="5" stroke-width="1.5" opacity="0.3"></circle>
              <!-- 中心點 -->
              <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
              <!-- 衛星點 -->
              <circle cx="12" cy="4" r="1" fill="currentColor"></circle>
              <circle cx="20" cy="12" r="1" fill="currentColor"></circle>
              <circle cx="12" cy="20" r="1" fill="currentColor"></circle>
              <circle cx="4" cy="12" r="1" fill="currentColor"></circle>
              <!-- 連接線 -->
              <path stroke-width="1" opacity="0.4" d="M12 4L12 8M20 12L16 12M12 20L12 16M4 12L8 12"></path>
            </svg>
            <!-- 一般定位圖標 -->
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
          
          <!-- 刪除按鈕 -->
          <button @click="deleteTemporalData"
                  class="p-1 rounded-lg transition-all duration-300 hover:scale-110"
                  :class="isDarkMode 
                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' 
                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'"
                  title="刪除時序資料">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 拖拽指示器 -->
    <div v-if="isDragging" class="mt-2 p-2 rounded-lg border-2 border-dashed transition-colors duration-300"
         :class="isDarkMode ? 'border-blue-400/50 bg-blue-400/5' : 'border-blue-500/50 bg-blue-50'">
      <p class="text-xs text-center transition-colors duration-300"
         :class="isDarkMode ? 'text-blue-300' : 'text-blue-600'">
        拖拽到這裡調整順序
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TemporalDataCard',
  props: {
    temporalData: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    isDragging: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'toggle-visibility',
    'locate-temporal-data',
    'delete-temporal-data',
    'drag-start',
    'drag-end',
    'drag-enter',
    'drag-leave',
    'drag-over',
    'drop'
  ],
  methods: {
    formatDate(date) {
      if (!date) return '未知日期'
      const d = new Date(date)
      return d.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    },
    
    getTypeClass(type) {
      const classes = {
        'insar': 'bg-purple-100 text-purple-800',
        'gnss': 'bg-blue-100 text-blue-800',
        'weather': 'bg-blue-100 text-blue-800',
        'earthquake': 'bg-red-100 text-red-800',
        'rainfall': 'bg-green-100 text-green-800',
        'temperature': 'bg-orange-100 text-orange-800',
        'humidity': 'bg-purple-100 text-purple-800',
        'wind': 'bg-cyan-100 text-cyan-800',
        'pressure': 'bg-gray-100 text-gray-800'
      }
      return classes[type] || 'bg-gray-100 text-gray-800'
    },
    
    getTypeLabel(type) {
      const labels = {
        'insar': 'InSAR',
        'gnss': 'GNSS',
        'weather': '氣象',
        'earthquake': '地震',
        'rainfall': '降雨',
        'temperature': '溫度',
        'humidity': '濕度',
        'wind': '風速',
        'pressure': '氣壓'
      }
      return labels[type] || '其他'
    },
    
    toggleVisibility() {
      this.$emit('toggle-visibility', this.temporalData)
    },
    
    locateTemporalData() {
      this.$emit('locate-temporal-data', this.temporalData)
    },
    
    deleteTemporalData() {
      this.$emit('delete-temporal-data', this.temporalData)
    },
    
    handleDragStart(event) {
      this.$emit('drag-start', event, this.temporalData)
    },
    
    handleDragEnd(event) {
      this.$emit('drag-end', event, this.temporalData)
    },
    
    handleDragEnter(event) {
      this.$emit('drag-enter', event, this.temporalData)
    },
    
    handleDragLeave(event) {
      this.$emit('drag-leave', event, this.temporalData)
    },
    
    handleDragOver(event) {
      this.$emit('drag-over', event, this.temporalData)
    },
    
    handleDrop(event) {
      this.$emit('drop', event, this.temporalData)
    }
  }
}
</script>
