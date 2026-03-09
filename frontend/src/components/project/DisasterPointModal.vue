<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 transition-opacity duration-300"
        :class="isDarkMode ? 'bg-black/70' : 'bg-black/50'"
        @click="handleClose"
      ></div>
      
      <!-- 模態框內容 -->
      <div 
        class="relative w-full max-w-md rounded-2xl shadow-2xl transition-all duration-300 transform"
        :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
      >
        <!-- 標題列 -->
        <div 
          class="flex items-center justify-between p-6 border-b"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <div class="flex items-center space-x-3">
            <!-- 災點圖標 -->
            <div class="p-2 rounded-lg" :class="isDarkMode ? 'bg-red-600/20' : 'bg-red-100'">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ isEditMode ? '編輯災點紀錄' : '新增災點紀錄' }}
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                {{ isEditMode ? '修改災點資訊和照片' : '在地圖上標記災點位置' }}
              </p>
            </div>
          </div>
          
          <!-- 關閉按鈕 -->
          <button
            @click="handleClose"
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
          <!-- 座標資訊（可編輯） -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span class="text-sm font-medium" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  座標位置 (WGS84)
                </span>
              </div>
              <!-- GPS 定位按鈕 -->
              <button
                type="button"
                @click="getGPSLocation"
                :disabled="isGettingGPS"
                class="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                :class="isDarkMode
                  ? 'text-green-400 border-green-700 hover:bg-green-900/30 active:bg-green-900/50'
                  : 'text-green-700 border-green-400 hover:bg-green-50 active:bg-green-100'"
                title="使用裝置 GPS 自動填入目前座標"
              >
                <!-- 載入中 spinner -->
                <svg v-if="isGettingGPS" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <!-- GPS 圖示 -->
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></circle>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
                </svg>
                <span>{{ isGettingGPS ? '定位中...' : '裝置 GPS' }}</span>
              </button>
            </div>

            <!-- GPS 狀態訊息 -->
            <div v-if="gpsMessage" class="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs"
                 :class="gpsMessageType === 'success'
                   ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700')
                   : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')">
              <svg v-if="gpsMessageType === 'success'" class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <svg v-else class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ gpsMessage }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  緯度 (Latitude) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="formData.latitude"
                  type="number"
                  step="0.000001"
                  placeholder="24.675700"
                  class="w-full px-3 py-2 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  經度 (Longitude) <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="formData.longitude"
                  type="number"
                  step="0.000001"
                  placeholder="121.408700"
                  class="w-full px-3 py-2 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                />
              </div>
            </div>
            <p class="text-xs" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
              提示：可直接輸入座標、點擊地圖位置，或按「裝置 GPS」自動取得目前位置
            </p>
          </div>
          
          <!-- 災點名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              災點名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="請輸入災點名稱..."
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
          </div>
          
          <!-- 災點描述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              災點描述
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              placeholder="請描述災點的情況..."
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            ></textarea>
          </div>
          
          <!-- 災害時間 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              災害時間
            </label>
            <input
              v-model="formData.disaster_time"
              type="datetime-local"
              class="w-full px-4 py-2.5 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'"
            />
            <p class="mt-1 text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              選擇災害發生的日期和時間（可選）
            </p>
          </div>
          
          <!-- 照片和影片上傳 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              照片與影片
            </label>
            
            <!-- 上傳按鈕區域 -->
            <div class="flex space-x-3 mb-3">
              <!-- 照片上傳 -->
              <label class="flex-1">
                <input
                  ref="photoInput"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handlePhotoUpload"
                  class="hidden"
                />
                <div class="flex items-center justify-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300"
                     :class="isDarkMode ? 
                       'border-slate-600 hover:border-red-500 bg-slate-700/50 hover:bg-slate-700' : 
                       'border-gray-300 hover:border-red-500 bg-white hover:bg-red-50'">
                  <div class="flex items-center space-x-2"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span class="text-sm font-medium">上傳照片</span>
                  </div>
                </div>
              </label>
              
              <!-- 影片上傳 -->
              <label class="flex-1">
                <input
                  ref="videoInput"
                  type="file"
                  accept="video/*"
                  multiple
                  @change="handleVideoUpload"
                  class="hidden"
                />
                <div class="flex items-center justify-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300"
                     :class="isDarkMode ? 
                       'border-slate-600 hover:border-red-500 bg-slate-700/50 hover:bg-slate-700' : 
                       'border-gray-300 hover:border-red-500 bg-white hover:bg-red-50'">
                  <div class="flex items-center space-x-2"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span class="text-sm font-medium">上傳影片</span>
                  </div>
                </div>
              </label>
            </div>
            
            <!-- 已上傳媒體預覽 -->
            <div v-if="uploadedMedia.filter(m => !m.pendingDelete).length > 0" class="space-y-2">
              <div class="text-xs font-medium" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                已上傳 {{ uploadedMedia.filter(m => !m.pendingDelete).length }} 個檔案
              </div>
              
              <div class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                <div
                  v-for="(media, index) in uploadedMedia"
                  v-show="!media.pendingDelete"
                  :key="media.id"
                  class="relative group aspect-square rounded-lg overflow-hidden border-2"
                  :class="isDarkMode ? 'border-slate-600' : 'border-gray-300'"
                >
                  <!-- 照片預覽 -->
                  <img
                    v-if="media.type === 'image'"
                    :src="media.previewUrl"
                    :alt="media.name"
                    class="w-full h-full object-cover"
                  />
                  
                  <!-- 影片預覽 -->
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center"
                    :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'"
                  >
                    <svg class="w-8 h-8" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  
                  <!-- 刪除按鈕 -->
                  <button
                    @click.stop="removeMedia(index)"
                    class="absolute top-1 right-1 z-10 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    :title="media.isExisting ? '刪除照片（將從伺服器刪除）' : '移除照片'"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                  
                  <!-- 檔案名稱提示 -->
                  <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ media.name }}
                  </div>
                  
                  <!-- 上傳進度 -->
                  <div
                    v-if="media.progress < 100"
                    class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50"
                  >
                    <div
                      class="h-full bg-red-500 transition-all duration-300"
                      :style="{ width: `${media.progress}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部按鈕 -->
        <div 
          class="flex items-center justify-end space-x-3 p-6 border-t"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <button
            @click="handleClose"
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
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-red-500 text-white hover:bg-red-600'"
          >
            <span v-if="isSubmitting" class="flex items-center space-x-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isEditMode ? '更新中...' : '建立中...' }}</span>
            </span>
            <span v-else>{{ isEditMode ? '更新災點紀錄' : '建立災點紀錄' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 錯誤提示對話框 -->
    <CustomAlert
      :show="showErrorAlert"
      type="error"
      title="操作失敗"
      :message="errorMessage"
      :is-dark-mode="isDarkMode"
      @confirm="showErrorAlert = false"
      @close="showErrorAlert = false"
    />
    
    <!-- 成功提示對話框 -->
    <CustomAlert
      :show="showSuccessAlert"
      type="success"
      title="操作成功"
      :message="successMessage"
      :is-dark-mode="isDarkMode"
      @confirm="showSuccessAlert = false"
      @close="showSuccessAlert = false"
    />
  </Teleport>
</template>

<script>
import api from '@/services/api.js'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import CustomAlert from '@/components/CustomAlert.vue'

export default {
  name: 'DisasterPointModal',
  components: {
    CustomAlert
  },
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    location: {
      type: Object,
      default: null
    },
    project: {
      type: Object,
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    isEditMode: {
      type: Boolean,
      default: false
    },
    editingDisasterPoint: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'created', 'updated'],
  setup(props, { emit }) {
    const formData = ref({
      name: '',
      description: '',
      disaster_time: '',
      latitude: null,
      longitude: null
    })
    
    const uploadedMedia = ref([])
    const originalMedia = ref([]) // 保存原始照片列表，用於取消時恢復
    const photoInput = ref(null)
    const videoInput = ref(null)
    const isSubmitting = ref(false)
    const showErrorAlert = ref(false)
    const errorMessage = ref('')
    const showSuccessAlert = ref(false)
    const successMessage = ref('')
    const isGettingGPS = ref(false)
    const gpsMessage = ref('')
    const gpsMessageType = ref('success') // 'success' | 'error'
    
    const isFormValid = computed(() => {
      return formData.value.name.trim() !== '' && 
             formData.value.latitude !== null && 
             formData.value.longitude !== null &&
             !isNaN(formData.value.latitude) && 
             !isNaN(formData.value.longitude)
    })
    
    const applyPosition = (position) => {
      const { latitude, longitude, accuracy } = position.coords
      formData.value.latitude = parseFloat(latitude.toFixed(6))
      formData.value.longitude = parseFloat(longitude.toFixed(6))
      isGettingGPS.value = false
      gpsMessageType.value = 'success'
      gpsMessage.value = `定位成功，精確度約 ${Math.round(accuracy)} 公尺`
      setTimeout(() => { gpsMessage.value = '' }, 3000)
    }

    const getGPSLocation = () => {
      if (!navigator.geolocation) {
        gpsMessage.value = '此裝置或瀏覽器不支援 GPS 定位'
        gpsMessageType.value = 'error'
        return
      }

      isGettingGPS.value = true
      gpsMessage.value = ''

      // 先嘗試高精度（GPS 硬體），逾時後自動 fallback 到網路定位
      navigator.geolocation.getCurrentPosition(
        applyPosition,
        (error) => {
          if (error.code === 3) {
            // 高精度逾時 → fallback 到低精度（IP/WiFi）
            gpsMessage.value = 'GPS 訊號弱，改用網路定位中...'
            gpsMessageType.value = 'success'
            navigator.geolocation.getCurrentPosition(
              applyPosition,
              (err) => {
                isGettingGPS.value = false
                gpsMessageType.value = 'error'
                const messages = {
                  1: '已拒絕位置存取權限，請在瀏覽器設定中允許',
                  2: '無法取得位置資訊，請確認網路或 GPS 是否開啟',
                  3: '定位逾時，請確認位置服務是否開啟後再試'
                }
                gpsMessage.value = messages[err.code] || '定位失敗，請手動輸入座標'
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            )
          } else {
            isGettingGPS.value = false
            gpsMessageType.value = 'error'
            const messages = {
              1: '已拒絕位置存取權限，請在瀏覽器設定中允許',
              2: '無法取得位置資訊，請確認位置服務是否開啟'
            }
            gpsMessage.value = messages[error.code] || '定位失敗，請手動輸入座標'
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    }

    const handleClose = () => {
      if (!isSubmitting.value) {
        // 恢復被標記為待刪除的照片
        uploadedMedia.value.forEach(media => {
          if (media.pendingDelete) {
            media.pendingDelete = false
          }
        })
        
        formData.value = {
          name: '',
          description: '',
          disaster_time: '',
          latitude: null,
          longitude: null
        }
        uploadedMedia.value = []
        originalMedia.value = []
        // 重置文件輸入
        if (photoInput.value) {
          photoInput.value.value = ''
        }
        if (videoInput.value) {
          videoInput.value.value = ''
        }
        emit('close')
      }
    }
    
    const handlePhotoUpload = (event) => {
      const files = Array.from(event.target.files)
      if (files.length === 0) return
      
      files.forEach(file => {
        if (!file.type.startsWith('image/')) {
          console.warn('不是有效的圖片文件:', file.name)
          return
        }
        
        addMediaFile(file, 'image')
      })
      
      // 重置 input
      if (photoInput.value) {
        photoInput.value.value = ''
      }
    }
    
    const handleVideoUpload = (event) => {
      const files = Array.from(event.target.files)
      if (files.length === 0) return
      
      files.forEach(file => {
        if (!file.type.startsWith('video/')) {
          console.warn('不是有效的影片文件:', file.name)
          return
        }
        
        addMediaFile(file, 'video')
      })
      
      // 重置 input
      if (videoInput.value) {
        videoInput.value.value = ''
      }
    }
    
    const addMediaFile = (file, type) => {
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const previewUrl = URL.createObjectURL(file)
      
      const mediaItem = {
        id: mediaId,
        file: file,
        type: type,
        name: file.name,
        previewUrl: previewUrl,
        progress: 100, // 目前使用本地預覽，所以進度直接設為 100
        size: file.size
      }
      
      uploadedMedia.value.push(mediaItem)
    }
    
    const removeMedia = (index) => {
      const media = uploadedMedia.value[index]
      
      // 如果是已存在的照片（有 media_id），標記為待刪除（不立即刪除）
      if (media.isExisting && media.media_id && props.isEditMode) {
        // 標記為待刪除，前端隱藏，但保留在列表中
        media.pendingDelete = true
      } else {
        // 如果是新上傳的文件，直接從列表中移除
        // 釋放預覽 URL（僅對本地創建的 URL）
        if (media.previewUrl && !media.isExisting) {
          URL.revokeObjectURL(media.previewUrl)
        }
        uploadedMedia.value.splice(index, 1)
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
          disaster_time: formData.value.disaster_time || null,
          latitude: parseFloat(formData.value.latitude),
          longitude: parseFloat(formData.value.longitude),
          project_id: props.project?.projectId || props.project?.project_id
        }
        
        
        let response
        
        if (props.isEditMode) {
          // 編輯模式：調用更新 API
          const disasterPointId = props.editingDisasterPoint?.disaster_point_id || props.editingDisasterPoint?.id
          
          // 先刪除標記為待刪除的照片
          const mediaToDelete = uploadedMedia.value.filter(media => media.pendingDelete && media.media_id)
          if (mediaToDelete.length > 0) {
            try {
              for (const media of mediaToDelete) {
                await api.delete(
                  `/disaster-points/${disasterPointId}/media/${media.media_id}`
                )
              }
            } catch (error) {
              console.error('刪除照片失敗:', error)
              errorMessage.value = `刪除照片失敗：${error.response?.data?.message || error.message || '未知錯誤'}`
              showErrorAlert.value = true
              isSubmitting.value = false
              return
            }
          }
          
          // 如果有新增的媒體文件，需要使用 FormData
          const hasNewMedia = uploadedMedia.value.some(media => media.file && !media.pendingDelete)
          
          if (hasNewMedia) {
            const formDataToSend = new FormData()
            formDataToSend.append('name', submitData.name)
            formDataToSend.append('description', submitData.description || '')
            if (submitData.disaster_time) {
              formDataToSend.append('disaster_time', submitData.disaster_time)
            }
            formDataToSend.append('latitude', submitData.latitude.toString())
            formDataToSend.append('longitude', submitData.longitude.toString())
            if (submitData.project_id) {
              formDataToSend.append('project_id', submitData.project_id)
            }
            
            uploadedMedia.value.forEach((media) => {
              if (media.file && !media.pendingDelete) {
                formDataToSend.append('media_files', media.file)
              }
            })
            
            response = await api.put(`/disaster-points/${disasterPointId}`, formDataToSend, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } else {
            // 沒有新增媒體文件，使用 JSON
            // 移除 project_id，因為更新時不需要
            const updateData = {
              name: submitData.name,
              description: submitData.description,
              disaster_time: submitData.disaster_time,
              latitude: submitData.latitude,
              longitude: submitData.longitude
            }
            response = await api.put(`/disaster-points/${disasterPointId}`, updateData)
          }
          
          if (response.success) {
            successMessage.value = '災點紀錄更新成功！'
            showSuccessAlert.value = true
            // 延遲關閉模態框，讓用戶看到成功提示
            setTimeout(() => {
              emit('updated', response.data)
              handleClose()
            }, 1500)
          } else {
            throw new Error(response.message || '更新失敗')
          }
        } else {
          // 新增模式：調用創建 API
          // 如果有媒體文件，需要使用 FormData
          if (uploadedMedia.value.length > 0) {
            const formDataToSend = new FormData()
            formDataToSend.append('name', submitData.name)
            formDataToSend.append('description', submitData.description || '')
            if (submitData.disaster_time) {
              formDataToSend.append('disaster_time', submitData.disaster_time)
            }
            formDataToSend.append('latitude', submitData.latitude.toString())
            formDataToSend.append('longitude', submitData.longitude.toString())
            formDataToSend.append('project_id', submitData.project_id)
            
            uploadedMedia.value.forEach((media) => {
              formDataToSend.append('media_files', media.file)
            })
            
            response = await api.post('/disaster-points', formDataToSend, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } else {
            // 沒有媒體文件，使用 JSON
            response = await api.post('/disaster-points', submitData)
          }
          
          if (response.success) {
            successMessage.value = '災點紀錄創建成功！'
            showSuccessAlert.value = true
            // 延遲關閉模態框，讓用戶看到成功提示
            setTimeout(() => {
              emit('created', response.data)
              handleClose()
            }, 1500)
          } else {
            throw new Error(response.message || '創建失敗')
          }
        }
      } catch (error) {
        console.error(props.isEditMode ? '更新災點紀錄失敗:' : '創建災點紀錄失敗:', error)
        errorMessage.value = `${props.isEditMode ? '更新' : '創建'}失敗: ${error.response?.data?.message || error.message || '未知錯誤'}`
        showErrorAlert.value = true
      } finally {
        isSubmitting.value = false
      }
    }
    
    // 當模態框顯示時，重置表單或從地圖點擊位置/編輯數據填充
    const stopWatchVisible = watch(() => props.isVisible, (visible) => {
      if (visible) {
        if (props.isEditMode && props.editingDisasterPoint) {
          // 編輯模式：填充現有災點數據
          const dp = props.editingDisasterPoint
          // 處理災害時間：將 ISO 格式轉換為 datetime-local 格式
          let disasterTimeValue = ''
          if (dp.disaster_time) {
            const disasterDate = new Date(dp.disaster_time)
            if (!isNaN(disasterDate.getTime())) {
              // 轉換為本地時間的 datetime-local 格式 (YYYY-MM-DDTHH:mm)
              const year = disasterDate.getFullYear()
              const month = String(disasterDate.getMonth() + 1).padStart(2, '0')
              const day = String(disasterDate.getDate()).padStart(2, '0')
              const hours = String(disasterDate.getHours()).padStart(2, '0')
              const minutes = String(disasterDate.getMinutes()).padStart(2, '0')
              disasterTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`
            }
          }
          formData.value = {
            name: dp.name || '',
            description: dp.description || '',
            disaster_time: disasterTimeValue,
            latitude: dp.latitude ? parseFloat(dp.latitude) : null,
            longitude: dp.longitude ? parseFloat(dp.longitude) : null
          }
          
          // 載入現有的媒體文件（過濾掉已刪除的）
          uploadedMedia.value = []
          originalMedia.value = []
          if (dp.media_files && Array.isArray(dp.media_files)) {
            dp.media_files
              .filter(media => media.storage_path && media.storage_path.trim() !== '') // 過濾已刪除的照片
              .forEach(media => {
                const mediaItem = {
                  id: media.media_id || media.id,
                  media_id: media.media_id || media.id, // 保存 media_id 用於刪除
                  file: null, // 現有文件沒有 File 對象
                  type: media.media_type || 'image',
                  name: media.original_name || media.name,
                  previewUrl: media.storage_path || media.thumbnail_path || '',
                  progress: 100,
                  size: media.file_size || 0,
                  isExisting: true, // 標記為現有文件
                  pendingDelete: false // 標記為待刪除狀態
                }
                uploadedMedia.value.push(mediaItem)
                // 保存原始副本用於取消時恢復
                originalMedia.value.push({ ...mediaItem })
              })
          }
        } else if (props.location) {
          // 新增模式：如果從地圖點擊，填充座標
          formData.value = {
            name: '',
            description: '',
            disaster_time: '',
            latitude: parseFloat(props.location.lat),
            longitude: parseFloat(props.location.lng)
          }
          // 重置媒體文件
          uploadedMedia.value.forEach(media => {
            if (media.previewUrl && !media.isExisting) {
              URL.revokeObjectURL(media.previewUrl)
            }
          })
          uploadedMedia.value = []
        } else {
          // 新增模式：如果手動打開，重置為空
          formData.value = {
            name: '',
            description: '',
            disaster_time: '',
            latitude: null,
            longitude: null
          }
          // 重置媒體文件
          uploadedMedia.value.forEach(media => {
            if (media.previewUrl && !media.isExisting) {
              URL.revokeObjectURL(media.previewUrl)
            }
          })
          uploadedMedia.value = []
        }
      }
    })
    
    // 監聽 location 變化，自動填充座標
    const stopWatchLocation = watch(() => props.location, (newLocation) => {
      if (newLocation && props.isVisible) {
        formData.value.latitude = parseFloat(newLocation.lat)
        formData.value.longitude = parseFloat(newLocation.lng)
      }
    }, { immediate: true })
    
    // 清理函數
    onBeforeUnmount(() => {
      stopWatchVisible()
      stopWatchLocation()
      // 清理所有媒體預覽 URL
      uploadedMedia.value.forEach(media => {
        if (media.previewUrl) {
          URL.revokeObjectURL(media.previewUrl)
        }
      })
    })
    
    return {
      formData,
      uploadedMedia,
      photoInput,
      videoInput,
      isSubmitting,
      isFormValid,
      showErrorAlert,
      errorMessage,
      showSuccessAlert,
      successMessage,
      isGettingGPS,
      gpsMessage,
      gpsMessageType,
      isEditMode: computed(() => props.isEditMode),
      handleClose,
      handleSubmit,
      handlePhotoUpload,
      handleVideoUpload,
      removeMedia,
      getGPSLocation,
      applyPosition
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

