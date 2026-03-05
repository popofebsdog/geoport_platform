<template>
  <div v-if="show" class="fixed inset-0 z-[1200] bg-black bg-opacity-50 flex items-center justify-center">
    <!-- 全屏載入動畫 -->
    <FullScreenLoader
      :show="isUploading"
      :title="uploadTitle"
      :message="uploadStatus"
      :show-progress="showProgress"
      :progress="uploadProgress"
    />
    
    <div class="w-[600px] max-w-[90vw] mx-4 rounded-lg shadow-2xl transition-colors duration-300 flex flex-col"
         :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
      <!-- 模態框標題 -->
      <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <h3 class="text-lg font-semibold transition-colors duration-300"
            :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          上傳正射影像底圖
        </h3>
        <button @click="closeModal" 
                class="flex items-center justify-center w-8 h-8 transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 模態框內容 -->
      <div class="p-6">
        <form @submit.prevent="handleUpload" class="space-y-4">
          <!-- 底圖名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              底圖名稱
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
              placeholder="請輸入底圖名稱"
            />
          </div>

          <!-- 自動解析的資訊 -->
          <div v-if="parsedInfo" class="p-4 rounded-lg border transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50 border-blue-200'">
            <h4 class="text-sm font-medium mb-3 transition-colors duration-300"
                :class="isDarkMode ? 'text-blue-400' : 'text-blue-700'">
              從檔案名稱自動解析的資訊
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center space-x-2">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">道路編號：</span>
                <span class="transition-colors duration-300"
                      :class="isDarkMode ? 'text-blue-300' : 'text-blue-600'">{{ parsedInfo.roadNumber }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">里程範圍：</span>
                <span class="transition-colors duration-300"
                      :class="isDarkMode ? 'text-blue-300' : 'text-blue-600'">{{ parsedInfo.mileageRange }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">拍攝時間：</span>
                <span class="transition-colors duration-300"
                      :class="isDarkMode ? 'text-blue-300' : 'text-blue-600'">{{ parsedInfo.displayDate }}</span>
              </div>
            </div>
          </div>


          <!-- 底圖時間 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              底圖時間
            </label>
            <DateInput
              :value="form.date"
              @input="(value) => handleDateInput(value)"
              :is-dark-mode="isDarkMode"
            />
          </div>

          <!-- 檔案選擇 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              選擇正射影像檔案
            </label>
            <input
              ref="fileInput"
              type="file"
              @change="handleFileSelect"
              accept=".tif,.tiff"
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
            />
            <div v-if="form.file" class="mt-2 text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              已選擇: {{ form.file.name }} ({{ formatFileSize(form.file.size) }})
            </div>
          </div>

          <!-- COG 優化選項 -->
          <div class="p-4 rounded-lg border transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-green-50 border-green-200'">
            <div class="flex items-center space-x-3">
              <input
                id="cog-optimization"
                v-model="form.enableCOG"
                type="checkbox"
                class="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label for="cog-optimization" class="text-sm font-medium transition-colors duration-300"
                     :class="isDarkMode ? 'text-green-400' : 'text-green-700'">
                啟用 COG 優化 (Cloud Optimized GeoTIFF)
              </label>
            </div>
            <p class="mt-2 text-xs transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              將自動轉換為 COG 格式，大幅提升載入速度和縮放性能
            </p>
          </div>

          <!-- 上傳按鈕 -->
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 border"
              :class="isDarkMode ? 'text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="!form.name || !form.date || !form.file || isUploading"
              class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <!-- 載入動畫 -->
              <div v-if="isUploading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <!-- 正常圖標 -->
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>{{ isUploading ? '處理中...' : '上傳底圖' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import DateInput from '@/components/DateInput.vue'
import FullScreenLoader from '@/components/FullScreenLoader.vue'
import { useAlert } from '@/composables/useAlert'

export default {
  name: 'BaseMapUploadModal',
  components: {
    DateInput,
    FullScreenLoader
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    projectId: {
      type: String,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'upload-success'],
  setup() {
    const { showAlert } = useAlert()
    return { showAlert }
  },
  data() {
    return {
      form: {
        name: '',
        date: '',
        file: null
      },
      parsedInfo: null, // 從檔案名稱解析的資訊
      isUploading: false, // 上傳狀態
      uploadTitle: '正在處理正射影像...', // 載入標題
      uploadStatus: '準備上傳...', // 載入狀態文字
      showProgress: false, // 是否顯示進度條
      uploadProgress: 0 // 上傳進度
    }
  },
  methods: {
    closeModal() {
      this.resetForm()
      this.$emit('close')
    },

    resetForm() {
      this.form = {
        name: '',
        date: '',
        file: null
      }
      this.parsedInfo = null
      this.isUploading = false
      this.uploadTitle = '正在處理正射影像...'
      this.uploadStatus = '準備上傳...'
      this.showProgress = false
      this.uploadProgress = 0
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    handleDateInput(value) {
      console.log('BaseMapUploadModal handleDateInput received:', value, typeof value)
      // 確保 value 是字符串，而不是 Event 對象
      const dateValue = typeof value === 'string' ? value : value.target?.value || ''
      console.log('BaseMapUploadModal setting date to:', dateValue)
      this.form.date = dateValue
    },

    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        // 檢查檔案類型
        const allowedTypes = ['.tif', '.tiff']
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
        
        if (!allowedTypes.includes(fileExtension)) {
          this.showAlert({
            type: 'error',
            title: '檔案類型錯誤',
            message: '請選擇 TIF 或 TIFF 格式的正射影像檔案'
          })
          event.target.value = ''
          return
        }
        
        this.form.file = file
        
        // 解析檔案名稱
        this.parseFileName(file.name)
      }
    },

    // 解析檔案名稱，提取道路編號、里程範圍和時間
    parseFileName(filename) {
      console.log('開始解析檔案名稱:', filename)
      
      try {
        // 檔案名稱格式: 560.T7_0049k+550-0050k+200_ortho_20241107.tif
        // 解析道路編號: T7 -> 台7線
        const roadMatch = filename.match(/\.(T\d+)_/)
        const roadNumber = roadMatch ? `台${roadMatch[1].substring(1)}線` : '未知道路'
        
        // 解析里程範圍: 0049k+550-0050k+200
        const mileageMatch = filename.match(/(\d+)k\+(\d+)-(\d+)k\+(\d+)/)
        const mileageRange = mileageMatch 
          ? `${mileageMatch[1]}K+${mileageMatch[2]}--${mileageMatch[3]}K+${mileageMatch[4]}`
          : '未知里程'
        
        // 解析時間: 20241107 -> 2024-11-07 (DateInput 需要的格式)
        const dateMatch = filename.match(/(\d{8})\.tif$/)
        const date = dateMatch 
          ? `${dateMatch[1].substring(0,4)}-${dateMatch[1].substring(4,6)}-${dateMatch[1].substring(6,8)}`
          : ''
        
        this.parsedInfo = {
          roadNumber,
          mileageRange,
          date,
          displayDate: dateMatch 
            ? `${dateMatch[1].substring(0,4)}/${dateMatch[1].substring(4,6)}/${dateMatch[1].substring(6,8)}`
            : '未知時間'
        }
        
        // 自動填入表單
        if (!this.form.name) {
          this.form.name = `${roadNumber} ${mileageRange} 正射影像`
        }
        if (!this.form.date) {
          this.form.date = date
        }
        
        console.log('解析結果:', this.parsedInfo)
        
      } catch (error) {
        console.error('解析檔案名稱失敗:', error)
        this.parsedInfo = null
      }
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    async handleUpload() {
      if (!this.form.name || !this.form.date || !this.form.file) {
        this.showAlert({
          type: 'warning',
          title: '表單不完整',
          message: '請填寫所有必填欄位'
        })
        return
      }

      // 開始上傳
      this.isUploading = true
      this.uploadTitle = '正在處理正射影像...'
      this.uploadStatus = '準備上傳檔案...'
      this.showProgress = true
      this.uploadProgress = 0

      try {
        // 模擬上傳進度
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += Math.random() * 10
            if (this.uploadProgress < 30) {
              this.uploadStatus = '正在上傳檔案...'
            } else if (this.uploadProgress < 60) {
              this.uploadStatus = '正在轉換為 COG 格式...'
            } else if (this.uploadProgress < 90) {
              this.uploadStatus = '正在優化影像...'
            }
          }
        }, 200)

        const formData = new FormData()
        formData.append('data_name', this.form.name)
        formData.append('data_date', this.form.date)
        formData.append('file', this.form.file)
        formData.append('project_id', this.projectId)
        formData.append('data_type', 'basemap') // 標記為底圖類型

        this.uploadStatus = '正在上傳到伺服器...'
        this.uploadProgress = 20

        const response = await fetch('http://localhost:3001/api/data/upload', {
          method: 'POST',
          body: formData
        })

        this.uploadStatus = '正在處理檔案...'
        this.uploadProgress = 70

        const result = await response.json()

        clearInterval(progressInterval)
        this.uploadProgress = 100
        this.uploadStatus = '處理完成！'

        if (result.success) {
          setTimeout(() => {
            this.showAlert({
              type: 'success',
              title: '上傳成功',
              message: '正射影像底圖已成功上傳'
            })
            
            this.closeModal()
            this.$emit('upload-success')
          }, 500)
        } else {
          throw new Error(result.message || '上傳失敗')
        }
      } catch (error) {
        console.error('上傳自有底圖錯誤:', error)
        this.isUploading = false
        this.showAlert({
          type: 'error',
          title: '上傳失敗',
          message: error.message || '上傳過程中發生錯誤'
        })
      }
    }
  }
}
</script>
