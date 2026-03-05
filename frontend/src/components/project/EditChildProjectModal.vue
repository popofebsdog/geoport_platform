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
            <!-- 編輯圖標 -->
            <div class="p-2 rounded-lg" :class="isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                編輯時期專案
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                修改「{{ childProject?.name }}」的所有資訊
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
          <!-- 母專案資訊顯示（只顯示，不編輯） -->
          <div class="p-4 rounded-lg" :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'">
            <div class="flex items-center space-x-2 mb-2">
              <svg class="w-5 h-5" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
              </svg>
              <span class="text-sm font-medium" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                所屬地點：{{ parentProject?.name || '未知' }}
              </span>
            </div>
            <div v-if="parentProject?.road_number" class="text-xs" :class="isDarkMode ? 'text-gray-500' : 'text-gray-600'">
              {{ parentProject.road_number }} {{ parentProject.road_section ? `(${parentProject.road_section})` : '' }}
            </div>
          </div>
          
          <!-- 事件名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              事件名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="請輸入事件名稱..."
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
          </div>
          
          <!-- 事件描述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              事件描述 <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              placeholder="請描述事件的內容..."
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
              <span>更新中...</span>
            </span>
            <span v-else>更新時期專案</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, inject, watch, onMounted } from 'vue'

export default {
  name: 'EditChildProjectModal',
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    childProject: {
      type: Object,
      default: null
    },
    parentProject: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'updated'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', ref(false))
    
    const formData = ref({
      name: '',
      description: '',
      event_date: '',
      event_time: '',
      latitude: null,
      longitude: null
    })
    
    const isSubmitting = ref(false)
    
    // 從 childProject 填充表單數據（填充所有可編輯字段）
    const populateFormData = () => {
      if (!props.childProject) {
        return
      }
      
      const project = props.childProject
      
      // 填充基本資訊
      formData.value.name = project.name || ''
      formData.value.description = project.description || ''
      
      // 填充座標
      formData.value.latitude = project.latitude || null
      formData.value.longitude = project.longitude || null
      
      // 填充事件日期與時間
      if (project.event_date) {
        // 處理各種可能的日期格式
        try {
          const dateObj = new Date(project.event_date)
          if (!isNaN(dateObj.getTime())) {
            // 格式化為 YYYY-MM-DD
            const year = dateObj.getFullYear()
            const month = String(dateObj.getMonth() + 1).padStart(2, '0')
            const day = String(dateObj.getDate()).padStart(2, '0')
            formData.value.event_date = `${year}-${month}-${day}`
            
            // 如果有時間部分，提取時間
            const hours = String(dateObj.getHours()).padStart(2, '0')
            const minutes = String(dateObj.getMinutes()).padStart(2, '0')
            if (hours !== '00' || minutes !== '00') {
              formData.value.event_time = `${hours}:${minutes}`
            } else {
              formData.value.event_time = ''
            }
          }
        } catch (error) {
          console.warn('解析事件日期失敗:', error)
          formData.value.event_date = ''
          formData.value.event_time = ''
        }
      } else {
        formData.value.event_date = ''
        formData.value.event_time = ''
      }
    }
    
    // 監聽 childProject 變化，重新填充表單
    watch(() => props.childProject, (newProject) => {
      if (newProject && props.isVisible) {
        populateFormData()
      }
    }, { immediate: true, deep: true })
    
    // 當模態框顯示時，填充數據
    watch(() => props.isVisible, (visible) => {
      if (visible && props.childProject) {
        populateFormData()
      }
    })
    
    // 組件掛載時填充數據
    onMounted(() => {
      if (props.childProject && props.isVisible) {
        populateFormData()
      }
    })
    
    const isFormValid = computed(() => {
      // 驗證所有必填欄位
      return formData.value.name.trim() !== '' &&
             formData.value.description.trim() !== '' &&
             formData.value.event_date !== '' &&
             formData.value.latitude !== null && 
             formData.value.latitude !== '' &&
             !isNaN(formData.value.latitude) &&
             formData.value.longitude !== null && 
             formData.value.longitude !== '' &&
             !isNaN(formData.value.longitude)
    })
    
    const closeModal = () => {
      if (!isSubmitting.value) {
        emit('close')
      }
    }
    
    const handleSubmit = async () => {
      if (!isFormValid.value || isSubmitting.value || !props.childProject) return
      
      isSubmitting.value = true
      
      try {
        // 準備提交資料：提交所有可編輯字段
        // 合併日期和時間
        let event_datetime = formData.value.event_date
        if (formData.value.event_time) {
          event_datetime = `${formData.value.event_date}T${formData.value.event_time}:00`
        } else {
          event_datetime = `${formData.value.event_date}T00:00:00`
        }
        
        const submitData = {
          name: formData.value.name.trim(),
          description: formData.value.description?.trim() || null,
          event_date: event_datetime,
          latitude: parseFloat(formData.value.latitude),
          longitude: parseFloat(formData.value.longitude)
        }
        
        console.log('提交的更新資料:', submitData)
        console.log('子專案 ID:', props.childProject.project_id)
        
        // 調用更新 API
        const response = await window.$api.put(`/child-projects/${props.childProject.project_id}`, submitData)
        
        if (response.success) {
          console.log('子專案更新成功:', response.data)
          emit('updated', response.data)
          closeModal()
        } else {
          throw new Error(response.message || '更新失敗')
        }
      } catch (error) {
        console.error('更新子專案失敗:', error)
        alert(`更新失敗: ${error.response?.data?.message || error.message || '未知錯誤'}`)
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

/* 數字輸入框樣式 */
input[type="number"] {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>

