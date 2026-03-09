<template>
  <div v-if="show" class="fixed inset-0 z-[1200] bg-black bg-opacity-50 flex items-center justify-center">
    <div class="w-[1000px] max-w-[95vw] mx-4 rounded-lg shadow-2xl transition-colors duration-300 flex flex-col"
         :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
      <!-- 模態框標題 -->
      <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <h3 class="text-lg font-semibold transition-colors duration-300"
            :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          {{ isEditMode ? '編輯圖層' : '上傳圖層' }}
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
      <div class="flex-1 flex">
        <!-- 基本表單 -->
        <div class="p-6 transition-colors duration-300"
             :class="[
               isDarkMode ? 'border-slate-700' : 'border-gray-200',
               form.dataType === 'potential_analysis' && analysisData ? 'flex-1 border-r' : 'w-full'
             ]">
          <form @submit.prevent="handleUpload" class="space-y-4">
          <!-- 資料名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料名稱
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
              placeholder="請輸入資料名稱"
            />
          </div>

          <!-- 資料敘述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料敘述
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
              placeholder="請輸入資料敘述"
            ></textarea>
          </div>

          <!-- 資料時間 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料時間
            </label>
            <DateInput
              :value="form.date"
              @input="(value) => handleDateInput(value)"
              :is-dark-mode="isDarkMode"
            />
          </div>

          <!-- 資料類型 -->
          <div v-if="!isEditMode">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料類型
            </label>
            <select
              v-model="form.dataType"
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
            >
              <option value="general">一般圖層</option>
              <option value="potential_analysis">潛勢評估</option>
              <option value="profile_observation">剖面觀測</option>
            </select>
          </div>
          
          <!-- 編輯模式下顯示資料類型（只讀） -->
          <div v-if="isEditMode">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料類型
            </label>
            <div class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-500 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'">
              {{ getDataTypeLabel(form.dataType) }}
            </div>
          </div>

          <!-- 圖層顏色選擇 (潛勢評估類型不顯示) -->
          <ColorPicker
            v-if="form.dataType !== 'potential_analysis'"
            v-model="form.color"
            :is-dark-mode="isDarkMode"
            label="圖層顏色"
            @change="onColorChange"
          />

          <!-- 檔案選擇 -->
          <div v-if="!isEditMode">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              選擇檔案
            </label>
            <input
              ref="fileInput"
              type="file"
              @change="handleFileSelect"
              @click="console.log('文件輸入被點擊')"
              accept=".geojson,.csv,.json,.shp,.kml,.gpx"
              class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
              :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
            />
            <div v-if="form.file" class="mt-2 text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              已選擇: {{ form.file.name }} ({{ formatFileSize(form.file.size) }})
            </div>
          </div>
          
          <!-- 編輯模式下顯示檔案信息（只讀） -->
          <div v-if="isEditMode && editingData">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              檔案信息
            </label>
            <div class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-500 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'">
              {{ editingData.original_name || editingData.file_name }}
            </div>
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
              :disabled="!form.name || !form.date || (!isEditMode && !form.file)"
              class="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>{{ isEditMode ? '更新圖層' : '上傳圖層' }}</span>
            </button>
          </div>
        </form>
        </div>

        <!-- 右側：顏色區間設定 -->
        <div v-if="form.dataType === 'potential_analysis' && analysisData" 
             class="w-80 p-4 transition-colors duration-300"
             :class="isDarkMode ? 'bg-slate-750' : 'bg-gray-50'">
          
          <!-- 數值欄位選擇 -->
          <select v-if="analysisData.numericFields.length > 1" v-model="selectedNumericField" 
                  class="w-full px-3 py-2 mb-4 border rounded-lg transition-colors duration-300"
                  :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'">
            <option v-for="field in analysisData.numericFields" :key="field" :value="field">
              {{ field }}
            </option>
          </select>

          <!-- 區間設定 -->
          <div v-if="selectedNumericField" class="space-y-2">
            <div class="flex justify-end mb-3">
              <button type="button" @click="addInterval" 
                      class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-300">
                新增
              </button>
            </div>
            
            <div class="space-y-2 max-h-80 overflow-y-auto">
              <div v-for="(interval, index) in intervals[selectedNumericField]" :key="index" 
                   class="flex items-center space-x-2 p-2 rounded transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-600' : 'bg-white border border-gray-200'">
                <input v-model.number="interval.min" type="number" step="0.01" 
                       class="w-16 px-2 py-1 text-xs border rounded transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-500 border-slate-400 text-white' : 'bg-white border-gray-300 text-gray-900'"
                       placeholder="min" />
                <span class="text-xs transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">-</span>
                <input v-model.number="interval.max" type="number" step="0.01" 
                       class="w-16 px-2 py-1 text-xs border rounded transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-500 border-slate-400 text-white' : 'bg-white border-gray-300 text-gray-900'"
                       placeholder="max" />
                <input v-model="interval.color" type="color" 
                       class="w-6 h-6 border rounded cursor-pointer" />
                <button type="button" @click="removeInterval(index)" 
                        class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-300">
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DateInput from '@/components/DateInput.vue'
import { useAlert } from '@/composables/useAlert'
import { dataFileAPI } from '@/services/api.js'
import ColorPicker from '@/components/ColorPicker.vue'

export default {
  name: 'LayerUploadModal',
  components: {
    DateInput,
    ColorPicker
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
    },
    editingData: {
      type: Object,
      default: null
    },
    isEditMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'upload-success', 'color-changed'],
  setup() {
    const { showAlert } = useAlert()
    return { showAlert }
  },
  data() {
    return {
      form: {
        name: '',
        description: '',
        date: '',
        dataType: 'general',
        file: null,
        color: '#3388ff' // 預設藍色
      },
      analysisData: null,
      selectedNumericField: null,
      intervals: {}
    }
  },
  watch: {
    show: {
      handler(newVal) {
        if (newVal && !this.isEditMode) {
          // 模態框打開且不是編輯模式時，重置表單
          this.resetForm()
        }
      },
      immediate: true
    },
    'form.dataType': {
      async handler(newType) {
        // 當切換到潛勢評估類型且已有檔案時，自動分析
        if (newType === 'potential_analysis' && this.form.file && this.form.file.type === 'application/geo+json') {
          try {
            this.analysisData = await this.analyzeGeoJSONForPotential(this.form.file)
            this.selectedNumericField = this.analysisData.numericFields[0] || null
            this.intervals = this.analysisData.intervals
          } catch (error) {
            console.error('分析 GeoJSON 失敗:', error)
          }
        } else if (newType !== 'potential_analysis') {
          // 切換到其他類型時清除分析數據
          this.analysisData = null
          this.selectedNumericField = null
          this.intervals = {}
        }
      }
    },
    editingData: {
      handler(newData) {
        if (newData && this.isEditMode) {
          // 預填充編輯數據
          this.form.name = newData.file_name || ''
          this.form.description = newData.metadata?.data_description || ''
          this.form.date = newData.metadata?.data_date || ''
          this.form.dataType = newData.file_type || 'geojson'
          this.form.color = newData.metadata?.layer_color || '#3388ff'
          
          // 如果是潛勢評估圖層，載入分析數據和區間設定
          if (newData.file_type === 'potential_analysis' && newData.metadata?.analysis_data) {
            this.analysisData = newData.metadata.analysis_data
            this.selectedNumericField = this.analysisData.numericFields?.[0] || null
            this.intervals = this.analysisData.intervals || {}
          }
          
        }
      },
      immediate: true
    }
  },
  methods: {
    closeModal() {
      this.resetForm()
      this.$emit('close')
    },

    getDataTypeLabel(dataType) {
      const labels = {
        'general': '一般圖層',
        'potential_analysis': '潛勢評估',
        'profile_observation': '剖面觀測'
      }
      return labels[dataType] || dataType
    },

    resetForm() {
      this.form = {
        name: '',
        description: '',
        date: '',
        dataType: 'general',
        file: null,
        color: '#3388ff' // 重置為預設藍色
      }
      this.analysisData = null
      this.selectedNumericField = null
      this.intervals = {}
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    handleDateInput(value) {
      // 確保 value 是字符串，而不是 Event 對象
      const dateValue = typeof value === 'string' ? value : value.target?.value || ''
      this.form.date = dateValue
    },

    onColorChange(newColor) {
      // 手動更新 form.color 以確保響應式
      this.form.color = newColor
      
      // 如果是編輯模式且不是潛勢評估類型，立即更新地圖上的圖層顏色
      if (this.isEditMode && this.editingData && this.form.dataType !== 'potential_analysis') {
        this.$emit('color-changed', {
          fileId: this.editingData.file_id,
          newColor: newColor
        })
      }
    },

    async handleFileSelect(event) {
      
      const file = event.target.files[0]
      
      if (file) {
        // 檢查檔案類型
        const allowedTypes = ['.geojson', '.csv', '.json', '.shp', '.kml', '.gpx']
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
        
        if (!allowedTypes.includes(fileExtension)) {
          this.showAlert({
            type: 'error',
            title: '檔案類型錯誤',
            message: '請選擇支援的檔案格式：GeoJSON, CSV, JSON, Shapefile, KML, GPX'
          })
          event.target.value = ''
          return
        }
        
        this.form.file = file
        
        // 如果是潛勢評估類型且是 GeoJSON 檔案，自動分析
        if (this.form.dataType === 'potential_analysis' && file.type === 'application/geo+json') {
          try {
            this.analysisData = await this.analyzeGeoJSONForPotential(file)
            this.selectedNumericField = this.analysisData.numericFields[0] || null
            this.intervals = this.analysisData.intervals
          } catch (error) {
            console.error('分析 GeoJSON 失敗:', error)
            this.showAlert({
              type: 'error',
              title: '分析失敗',
              message: '無法分析 GeoJSON 檔案，請檢查檔案格式'
            })
          }
        }
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
      // 編輯模式下的驗證（不需要檔案）
      if (this.isEditMode) {
        if (!this.form.name || !this.form.date) {
          this.showAlert({
            type: 'warning',
            title: '表單不完整',
            message: '請填寫資料名稱和資料時間'
          })
          return
        }
      } else {
        // 上傳模式下的驗證（需要檔案）
        if (!this.form.name || !this.form.date || !this.form.file) {
          this.showAlert({
            type: 'warning',
            title: '表單不完整',
            message: '請填寫所有必填欄位'
          })
          return
        }
      }

      try {
        if (this.isEditMode) {
          // 編輯模式：調用更新 API
          const updateData = {
            data_name: this.form.name,
            data_description: this.form.description,
            data_date: this.form.date,
            layer_color: this.form.color
          }

          const response = await fetch(`http://localhost:3001/api/data/${this.editingData.file_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          })

          const result = await response.json()

          if (result.success) {
            this.showAlert({
              type: 'success',
              title: '更新成功',
              message: '圖層資料已成功更新'
            })
            
            this.closeModal()
            this.$emit('upload-success')
          } else {
            throw new Error(result.message || '更新失敗')
          }
        } else {
          // 上傳模式：調用上傳 API
          // 如果是潛勢評估類型，使用用戶設定的區間數據
          let analysisData = null
          if (this.form.dataType === 'potential_analysis' && this.analysisData) {
            analysisData = {
              ...this.analysisData,
              intervals: this.intervals
            }
          }

          const formData = new FormData()
          formData.append('data_name', this.form.name)
          formData.append('data_description', this.form.description)
          formData.append('data_date', this.form.date)
          formData.append('data_type', this.form.dataType)
          formData.append('layer_color', this.form.color)
          // 檢查文件是否存在
          if (!this.form.file) {
            console.error('錯誤：form.file 為空:', this.form.file)
            this.showAlert({
              type: 'error',
              title: '上傳失敗',
              message: '請選擇要上傳的文件'
            })
            return
          }
          
          formData.append('file', this.form.file)
          formData.append('project_id', this.projectId)
          
          // 檢查文件是否存在
          if (!this.form.file) {
            console.error('錯誤：沒有選擇文件')
            this.showAlert({
              type: 'error',
              title: '上傳失敗',
              message: '請選擇要上傳的文件'
            })
            return
          }

          // 如果有分析數據，添加到表單中
          if (analysisData) {
            formData.append('analysis_data', JSON.stringify(analysisData))
          }

          const result = await dataFileAPI.upload(formData)

          if (result.success) {
            this.showAlert({
              type: 'success',
              title: '上傳成功',
              message: '圖層已成功上傳'
            })
            
            this.closeModal()
            this.$emit('upload-success')
          } else {
            throw new Error(result.message || '上傳失敗')
          }
        }
      } catch (error) {
        console.error(this.isEditMode ? '更新圖層錯誤:' : '上傳圖層錯誤:', error)
        
        // 處理不同類型的錯誤響應
        let errorMessage = '上傳過程中發生錯誤'
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.message) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        }
        
        // 顯示更詳細的錯誤信息
        console.error('詳細錯誤信息:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        })
        
        this.showAlert({
          type: 'error',
          title: this.isEditMode ? '更新失敗' : '上傳失敗',
          message: errorMessage
        })
      }
    },

    // 分析 GeoJSON 數據用於潛勢評估
    async analyzeGeoJSONForPotential(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const geojson = JSON.parse(e.target.result)
            const analysis = this.analyzeNumericFields(geojson)
            resolve(analysis)
          } catch (error) {
            reject(new Error('無法解析 GeoJSON 檔案'))
          }
        }
        reader.onerror = () => reject(new Error('無法讀取檔案'))
        reader.readAsText(file)
      })
    },

    // 分析數值欄位
    analyzeNumericFields(geojsonData) {
      if (!geojsonData.features || geojsonData.features.length === 0) {
        return { numericFields: [], intervals: [] }
      }

      const numericFields = []
      const fieldStats = {}

      // 分析第一個 feature 的屬性
      const firstFeature = geojsonData.features[0]
      if (firstFeature.properties) {
        Object.keys(firstFeature.properties).forEach(key => {
          const value = firstFeature.properties[key]
          if (typeof value === 'number' && !isNaN(value)) {
            numericFields.push(key)
            fieldStats[key] = {
              values: [],
              min: value,
              max: value
            }
          }
        })
      }

      // 收集所有數值並計算統計
      geojsonData.features.forEach(feature => {
        if (feature.properties) {
          numericFields.forEach(field => {
            const value = feature.properties[field]
            if (typeof value === 'number' && !isNaN(value)) {
              fieldStats[field].values.push(value)
              fieldStats[field].min = Math.min(fieldStats[field].min, value)
              fieldStats[field].max = Math.max(fieldStats[field].max, value)
            }
          })
        }
      })

      // 生成默認區間和顏色
      const intervals = this.generateDefaultIntervals(fieldStats)

      return {
        numericFields,
        fieldStats,
        intervals
      }
    },

    // 生成默認區間和漸層顏色
    generateDefaultIntervals(fieldStats) {
      const intervals = {}
      
      Object.keys(fieldStats).forEach(field => {
        const stats = fieldStats[field]
        const min = stats.min
        const max = stats.max
        const range = max - min
        
        // 生成 5 個區間
        const intervalCount = 5
        const intervalSize = range / intervalCount
        
        const fieldIntervals = []
        const colors = [
          '#1e40af', // 藍色
          '#3b82f6', // 淺藍色
          '#10b981', // 綠色
          '#f59e0b', // 橙色
          '#ef4444'  // 紅色
        ]
        
        for (let i = 0; i < intervalCount; i++) {
          const start = min + (i * intervalSize)
          const end = min + ((i + 1) * intervalSize)
          
          fieldIntervals.push({
            min: i === 0 ? start : start,
            max: i === intervalCount - 1 ? max : end,
            color: colors[i],
            label: `${start.toFixed(2)} - ${end.toFixed(2)}`
          })
        }
        
        intervals[field] = fieldIntervals
      })
      
      return intervals
    },

    // 新增區間
    addInterval() {
      if (!this.selectedNumericField) return
      
      const fieldStats = this.analysisData.fieldStats[this.selectedNumericField]
      const currentIntervals = this.intervals[this.selectedNumericField] || []
      const maxValue = Math.max(...currentIntervals.map(i => i.max), fieldStats.max)
      
      this.intervals[this.selectedNumericField].push({
        min: maxValue,
        max: maxValue + 1,
        color: '#cccccc',
        label: `${maxValue} - ${maxValue + 1}`
      })
    },

    // 刪除區間
    removeInterval(index) {
      if (!this.selectedNumericField) return
      
      if (this.intervals[this.selectedNumericField].length > 1) {
        this.intervals[this.selectedNumericField].splice(index, 1)
      } else {
        this.showAlert({
          type: 'warning',
          title: '無法刪除',
          message: '至少需要保留一個區間'
        })
      }
    }
  }
}
</script>
