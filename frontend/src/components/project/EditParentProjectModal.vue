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
                編輯地點專案
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                修改「{{ parentProject?.name }}」的資訊
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
          <!-- 專案名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              地點名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="例如：台7線 49.8K 復興區邊坡"
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
          </div>
          
          <!-- 專案描述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              地點描述
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              placeholder="請描述此地點的地理位置、地形特徵、監測目的等..."
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            ></textarea>
          </div>
          
          <!-- 地點名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              行政區域
            </label>
            <input
              v-model="formData.location_name"
              type="text"
              placeholder="例如：桃園市復興區"
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
          </div>
          
          <!-- 地點座標 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              地點座標 (WGS84) <span class="text-red-500">*</span>
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
          
          <!-- 道路類型與編號 -->
          <div>
            <label class="block text-sm font-medium mb-3 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              道路類型與編號
            </label>
            
            <!-- 道路類型選擇 -->
            <div class="grid grid-cols-3 gap-3 mb-3">
              <button
                v-for="type in roadTypes"
                :key="type.value"
                @click="formData.road_type = type.value"
                type="button"
                class="px-4 py-2.5 rounded-lg border-2 transition-all duration-300 font-medium"
                :class="formData.road_type === type.value
                  ? (isDarkMode ? 'border-blue-500 bg-blue-600 text-white' : 'border-blue-500 bg-blue-500 text-white')
                  : (isDarkMode ? 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')"
              >
                {{ type.label }}
              </button>
            </div>
            
            <!-- 道路編號輸入 -->
            <div v-if="formData.road_type">
              <input
                v-model="formData.road_number"
                type="text"
                :placeholder="getRoadNumberPlaceholder()"
                class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
              />
            </div>
            
            <!-- 路段資訊 -->
            <div v-if="formData.road_number" class="mt-3">
              <label class="block text-xs mb-1" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                路段/樁號 (選填)
              </label>
              <input
                v-model="formData.road_section"
                type="text"
                placeholder="例如：49.8K"
                class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
              />
            </div>
          </div>
          
          <!-- 標籤 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              標籤 (選填)
            </label>
            <input
              v-model="formData.tags"
              type="text"
              placeholder="輸入標籤，用逗號分隔。例如：邊坡,監測,重點區域"
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
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
            <span v-else>更新專案資訊</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import api from '@/services/api.js'
import { ref, computed, inject, watch } from 'vue'

export default {
  name: 'EditParentProjectModal',
  props: {
    isVisible: {
      type: Boolean,
      required: true
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
      location_name: '',
      latitude: null,
      longitude: null,
      road_type: '',
      road_number: '',
      road_section: '',
      tags: ''
    })
    
    const isSubmitting = ref(false)
    
    const roadTypes = [
      { value: 'highway', label: '公路' },
      { value: 'national', label: '國道' },
      { value: 'railway', label: '鐵路' }
    ]
    
    // 從 parentProject 填充表單數據
    const populateFormData = () => {
      if (!props.parentProject) {
        return
      }
      
      const project = props.parentProject
      
      // 填充基本資訊
      formData.value.name = project.name || ''
      formData.value.description = project.description || ''
      formData.value.location_name = project.location_name || ''
      
      // 填充座標
      if (project.latitude !== null && project.latitude !== undefined) {
        formData.value.latitude = parseFloat(project.latitude)
      } else if (project.location?.lat) {
        formData.value.latitude = parseFloat(project.location.lat)
      } else if (project.location_geometry?.coordinates) {
        formData.value.latitude = parseFloat(project.location_geometry.coordinates[1])
      }
      
      if (project.longitude !== null && project.longitude !== undefined) {
        formData.value.longitude = parseFloat(project.longitude)
      } else if (project.location?.lng) {
        formData.value.longitude = parseFloat(project.location.lng)
      } else if (project.location_geometry?.coordinates) {
        formData.value.longitude = parseFloat(project.location_geometry.coordinates[0])
      }
      
      // 填充道路資訊
      formData.value.road_type = project.road_type || ''
      formData.value.road_number = project.road_number || ''
      formData.value.road_section = project.road_section || ''
      
      // 填充標籤
      if (project.tags && Array.isArray(project.tags)) {
        formData.value.tags = project.tags.join(', ')
      } else if (typeof project.tags === 'string') {
        formData.value.tags = project.tags
      } else {
        formData.value.tags = ''
      }
      
    }
    
    // 監聽 parentProject 變化
    watch(() => props.parentProject, (newVal) => {
      if (newVal) {
        populateFormData()
      }
    }, { immediate: true })
    
    // 監聽 isVisible 變化
    watch(() => props.isVisible, (newVal) => {
      if (newVal) {
        populateFormData()
      }
    })
    
    const isFormValid = computed(() => {
      return formData.value.name.trim() !== '' &&
             formData.value.latitude !== null &&
             formData.value.longitude !== null &&
             formData.value.latitude >= -90 &&
             formData.value.latitude <= 90 &&
             formData.value.longitude >= -180 &&
             formData.value.longitude <= 180
    })
    
    const getRoadNumberPlaceholder = () => {
      const placeholders = {
        highway: '例如：台7線',
        national: '例如：國道3號',
        railway: '例如：台鐵縱貫線'
      }
      return placeholders[formData.value.road_type] || '請輸入道路編號'
    }
    
    const closeModal = () => {
      if (!isSubmitting.value) {
        emit('close')
      }
    }
    
    const handleSubmit = async () => {
      if (!isFormValid.value || isSubmitting.value) return
      
      isSubmitting.value = true
      
      try {
        // 準備提交資料
        const submitData = {
          name: formData.value.name.trim(),
          description: formData.value.description?.trim() || null,
          location_name: formData.value.location_name?.trim() || null,
          latitude: parseFloat(formData.value.latitude),
          longitude: parseFloat(formData.value.longitude),
          locationGeometry: {
            type: 'Point',
            coordinates: [parseFloat(formData.value.longitude), parseFloat(formData.value.latitude)]
          },
          road_type: formData.value.road_type || null,
          road_number: formData.value.road_number?.trim() || null,
          road_section: formData.value.road_section?.trim() || null,
          tags: formData.value.tags ? formData.value.tags.split(',').map(t => t.trim()).filter(t => t) : []
        }
        
        
        // 調用更新 API
        const response = await api.put(`/parent-projects/${props.parentProject.project_id}`, submitData)
        
        if (response.success) {
          emit('updated', response.data)
          closeModal()
        } else {
          throw new Error(response.message || '更新失敗')
        }
      } catch (error) {
        console.error('更新母專案失敗:', error)
        alert(`更新失敗: ${error.response?.data?.message || error.message || '未知錯誤'}`)
      } finally {
        isSubmitting.value = false
      }
    }
    
    return {
      isDarkMode,
      formData,
      isSubmitting,
      roadTypes,
      isFormValid,
      getRoadNumberPlaceholder,
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

/* 移除數字輸入的上下箭頭 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>

