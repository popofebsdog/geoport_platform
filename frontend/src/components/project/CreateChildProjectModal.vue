<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 transition-opacity duration-300"
        :class="isDarkMode ? 'bg-black/70' : 'bg-black/50'"
        @click="closeModal"
      ></div>
      
      <!-- 模態框內容 -->
      <div 
        class="relative w-full max-w-2xl rounded-2xl shadow-2xl transition-all duration-300 transform"
        :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
      >
        <!-- 標題列 -->
        <div 
          class="flex items-center justify-between p-6 border-b"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <div class="flex items-center space-x-3">
            <!-- 時間圖標 -->
            <div class="p-2 rounded-lg" :class="isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                新增時期專案
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                為「{{ parentProject?.name }}」新增一個時間週期的監測專案
              </p>
            </div>
          </div>
          
          <!-- 關閉按鈕 -->
          <button
            @click="closeModal"
            class="p-2 rounded-lg transition-all duration-300"
            :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 表單內容 -->
        <div class="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <!-- 母專案資訊顯示 -->
          <div class="p-4 rounded-lg" :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'">
            <div class="flex items-center space-x-2 mb-2">
              <svg class="w-5 h-5" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
              </svg>
              <span class="text-sm font-medium" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                所屬地點：{{ parentProject?.name }}
              </span>
            </div>
            <div v-if="parentProject?.road_number" class="text-xs" :class="isDarkMode ? 'text-gray-500' : 'text-gray-600'">
              {{ parentProject.road_number }} {{ parentProject.road_section ? `(${parentProject.road_section})` : '' }}
            </div>
          </div>
          
          <!-- 時期名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              時期名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="例如：2024年度定期監測"
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
          </div>
          
          <!-- 時期描述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              時期描述
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              placeholder="請描述本時期的監測目的、作業內容、預期成果等..."
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            ></textarea>
          </div>
          
          <!-- 重要事件日期與時間 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              重要事件日期與時間 <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-3">
              <!-- 日期 -->
              <div class="col-span-2">
                <label class="block text-xs mb-2" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  日期
                </label>
                <input
                  v-model="formData.event_date"
                  type="date"
                  class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'"
                />
              </div>
              
              <!-- 時間 -->
              <div>
                <label class="block text-xs mb-2" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  時間
                </label>
                <input
                  v-model="formData.event_time"
                  type="time"
                  class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'"
                />
              </div>
            </div>
            <p class="text-xs mt-1" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
              例如：災害發生日期時間、重要監測時間等
            </p>
          </div>
          
          <!-- 座標 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              座標 (WGS84) <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs mb-1" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  緯度 (Latitude)
                </label>
                <input
                  v-model.number="formData.latitude"
                  type="number"
                  step="0.000001"
                  placeholder="24.675700"
                  class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                />
              </div>
              <div>
                <label class="block text-xs mb-1" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  經度 (Longitude)
                </label>
                <input
                  v-model.number="formData.longitude"
                  type="number"
                  step="0.000001"
                  placeholder="121.408700"
                  class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                />
              </div>
            </div>
            <p class="text-xs mt-1" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
              座標系統: WGS84 (EPSG:4326)
            </p>
          </div>
        </div>
        
        <!-- 底部按鈕 -->
        <div 
          class="flex items-center justify-end space-x-3 p-6 border-t"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <button
            @click="closeModal"
            class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300"
            :class="isDarkMode 
              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
          >
            取消
          </button>
          
          <button
            @click="handleSubmit"
            :disabled="!isFormValid || isSubmitting"
            class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isDarkMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            <span v-if="isSubmitting" class="flex items-center space-x-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>創建中...</span>
            </span>
            <span v-else>創建時期專案</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import api from '@/services/api.js'
import { ref, computed, inject } from 'vue'

export default {
  name: 'CreateChildProjectModal',
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    parentProject: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'created'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', ref(false))
    
    const formData = ref({
      name: '',
      description: '',
      event_date: '',
      event_time: '00:00',
      latitude: '',
      longitude: ''
    })
    
    const isSubmitting = ref(false)
    
    const isFormValid = computed(() => {
      return formData.value.name.trim() !== '' &&
             formData.value.event_date !== '' &&
             formData.value.event_time !== '' &&
             formData.value.latitude !== '' &&
             formData.value.longitude !== ''
    })
    
    const closeModal = () => {
      if (!isSubmitting.value) {
        emit('close')
        resetForm()
      }
    }
    
    const resetForm = () => {
      formData.value = {
        name: '',
        description: '',
        event_date: '',
        event_time: '00:00',
        latitude: '',
        longitude: ''
      }
    }
    
    const handleSubmit = async () => {
      if (!isFormValid.value || isSubmitting.value) return
      
      isSubmitting.value = true
      
      try {
        // 準備提交資料：合併日期和時間為 ISO 格式
        let eventDateTime = null
        if (formData.value.event_date && formData.value.event_time) {
          // 合併日期和時間：YYYY-MM-DD + HH:mm -> YYYY-MM-DDTHH:mm:00
          eventDateTime = `${formData.value.event_date}T${formData.value.event_time}:00`
        }
        
        const submitData = {
          name: formData.value.name.trim(),
          description: formData.value.description?.trim() || null,
          start_date: null, // 不再使用時間區間
          end_date: null, // 不再使用時間區間
          event_date: eventDateTime,
          latitude: parseFloat(formData.value.latitude),
          longitude: parseFloat(formData.value.longitude),
          locationGeometry: {
            type: 'Point',
            coordinates: [parseFloat(formData.value.longitude), parseFloat(formData.value.latitude)]
          },
          priority: null, // 不使用優先級
          tags: null // 不使用標籤
        }
        
        
        
        // 調用 API
        const response = await api.post(`/parent-projects/${props.parentProject.project_id}/children`, submitData)
        
        if (response.success) {
          emit('created', response.data)
          closeModal()
        } else {
          throw new Error(response.message || '創建失敗')
        }
      } catch (error) {
        console.error('創建子專案失敗:', error)
        alert(`創建失敗: ${error.response?.data?.message || error.message || '未知錯誤'}`)
      } finally {
        isSubmitting.value = false
      }
    }
    
    return {
      isDarkMode,
      formData,
      isSubmitting,
      isFormValid,
      closeModal,
      handleSubmit
    }
  }
}
</script>

<style scoped>
/* 自訂滾動條 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175); /* gray-400 */
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128); /* gray-500 */
}

/* 暗色模式滾動條 */
:global(.dark) ::-webkit-scrollbar-thumb {
  background-color: rgb(71 85 105); /* slate-600 */
}

:global(.dark) ::-webkit-scrollbar-thumb:hover {
  background-color: rgb(100 116 139); /* slate-500 */
}
</style>

