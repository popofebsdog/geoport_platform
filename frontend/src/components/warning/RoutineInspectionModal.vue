<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <!-- 霧面背景 -->
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
        
        <!-- 模態框內容 -->
        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full z-10 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ editingRecord ? '編輯經常巡查' : '經常巡查' }}
            </h3>
            <button 
              @click="handleClose"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div v-if="pointInfo" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p>路線: {{ pointInfo.roadSection || '-' }}</p>
                <p>里程數: {{ pointInfo.mileage || '-' }}</p>
                <p>位置: {{ pointInfo.location || '-' }}</p>
              </div>
              <!-- 導航按鈕（編輯模式下顯示） -->
              <div v-if="editingRecord" class="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  @click="navigateToPrevious"
                  :disabled="!hasPreviousPoint || !mileagePoints || mileagePoints.length === 0"
                  class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="上一個里程點"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <button
                  @click="navigateToNext"
                  :disabled="!hasNextPoint || !mileagePoints || mileagePoints.length === 0"
                  class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="下一個里程點"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <!-- 選擇年份 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                選擇年份 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formData.year"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option :value="null">請選擇年份</option>
                <option v-for="y in availableYears" :key="y" :value="y">{{ y }}年</option>
              </select>
            </div>
            
            <!-- 選擇月份 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                選擇月份 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="formData.month"
                :disabled="!formData.year"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option :value="null">請選擇月份</option>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
            
            <!-- 說明文字 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                說明文字 <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="formData.description"
                rows="4"
                placeholder="請輸入巡查說明..."
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
            </div>
            
            <!-- 標註災害 -->
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDisaster"
                v-model="formData.isDisaster"
                class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label for="isDisaster" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                標註災害
              </label>
            </div>
          </div>
          
          <!-- 按鈕 -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="handleClose"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleSubmit"
              :disabled="submitting || !formData.year || !formData.month || !formData.description.trim()"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import axios from 'axios'
import { alert as showAlert, error as showError } from '@/utils/simpleAlertService'

export default {
  name: 'RoutineInspectionModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    pointInfo: {
      type: Object,
      default: null
    },
    regionCode: {
      type: String,
      default: ''
    },
    editingRecord: {
      type: Object,
      default: null
    },
    mileagePoints: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'success', 'navigate-to-point'],
  inject: ['isDarkMode'],
  data() {
    return {
      formData: {
        year: null,
        month: null,
        description: '',
        isDisaster: false
      },
      submitting: false
    }
  },
  computed: {
    availableYears() {
      const currentYear = new Date().getFullYear()
      const years = []
      // 生成過去10年到未來2年的年份選項
      for (let i = -10; i <= 2; i++) {
        years.push(currentYear + i)
      }
      return years.reverse()
    },
    currentPointIndex() {
      if (!this.pointInfo || !this.mileagePoints || !this.mileagePoints.length) return -1
      const currentMileage = String(this.pointInfo.mileage || '').trim()
      return this.mileagePoints.findIndex(point => {
        const pointMileage = String(point.mileage || '').trim()
        return pointMileage === currentMileage
      })
    },
    hasPreviousPoint() {
      return this.currentPointIndex > 0
    },
    hasNextPoint() {
      return this.currentPointIndex >= 0 && this.currentPointIndex < this.mileagePoints.length - 1
    }
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        console.log('RoutineInspectionModal opened')
        console.log('mileagePoints:', this.mileagePoints, 'length:', this.mileagePoints?.length)
        console.log('editingRecord:', !!this.editingRecord)
        console.log('pointInfo:', this.pointInfo)
        if (this.editingRecord) {
          // 編輯模式：填充現有數據
          console.log('編輯模式 - editingRecord:', this.editingRecord)
          // 確保 inspection_data 已解析
          let data = this.editingRecord.inspection_data || {}
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data)
            } catch (e) {
              console.warn('解析 inspection_data 失敗:', e)
              data = {}
            }
          }
          console.log('解析後的 data:', data)
          // 說明文字可能在 description 或 value 字段中
          const description = data.description || data.value || ''
          this.formData = {
            year: this.editingRecord.inspection_year || null,
            month: this.editingRecord.inspection_month || null,
            description: description,
            isDisaster: this.editingRecord.is_disaster || false
          }
          console.log('填充後的 formData:', this.formData)
        } else {
          // 新增模式：重置表單，預設為當前年份
          this.formData = {
            year: new Date().getFullYear(),
            month: null,
            description: '',
            isDisaster: false
          }
        }
      }
    },
    editingRecord(newVal) {
      if (newVal && this.isVisible) {
        // 編輯模式：填充現有數據
        console.log('editingRecord 變化 - newVal:', newVal)
        // 確保 inspection_data 已解析
        let data = newVal.inspection_data || {}
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch (e) {
            console.warn('解析 inspection_data 失敗:', e)
            data = {}
          }
        }
        console.log('解析後的 data:', data)
        // 說明文字可能在 description 或 value 字段中
        const description = data.description || data.value || ''
        this.formData = {
          year: newVal.inspection_year || null,
          month: newVal.inspection_month || null,
          description: description,
          isDisaster: newVal.is_disaster || false
        }
        console.log('填充後的 formData:', this.formData)
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    navigateToPrevious() {
      if (!this.hasPreviousPoint) return
      const previousPoint = this.mileagePoints[this.currentPointIndex - 1]
      if (previousPoint) {
        this.$emit('navigate-to-point', {
          mileage: previousPoint.mileage,
          roadSection: previousPoint.roadSection,
          location: previousPoint.location,
          coordinates: previousPoint.coordinates,
          properties: previousPoint.properties
        })
      }
    },
    navigateToNext() {
      if (!this.hasNextPoint) return
      const nextPoint = this.mileagePoints[this.currentPointIndex + 1]
      if (nextPoint) {
        this.$emit('navigate-to-point', {
          mileage: nextPoint.mileage,
          roadSection: nextPoint.roadSection,
          location: nextPoint.location,
          coordinates: nextPoint.coordinates,
          properties: nextPoint.properties
        })
      }
    },
    async handleSubmit() {
      if (!this.pointInfo || !this.regionCode) {
        return
      }
      
      if (!this.formData.year || !this.formData.month || !this.formData.description.trim()) {
        await showAlert('請填寫年份、月份和說明文字', '提示', this.isDarkMode)
        return
      }
      
      this.submitting = true
      
      try {
        const inspectionDate = `${this.formData.year}-${String(this.formData.month).padStart(2, '0')}-01`
        
        const payload = {
          mileage: this.pointInfo.mileage,
          inspectionType: 'routine',
          inspectionYear: this.formData.year,
          inspectionMonth: this.formData.month,
          inspectionDate: inspectionDate,
          inspectionData: {
            description: this.formData.description,
            board: null,
            roadSection: this.pointInfo.roadSection
          },
          isDisaster: this.formData.isDisaster || false
        }
        
        let response
        if (this.editingRecord) {
          // 編輯模式：使用 PUT 請求
          response = await axios.put(
            `/api/warning-regions/${this.regionCode}/inspection-records/${this.editingRecord.record_id}`,
            payload
          )
        } else {
          // 新增模式：使用 POST 請求
          response = await axios.post(
            `/api/warning-regions/${this.regionCode}/inspection-records`,
            payload
          )
        }
        
        if (response.data.success) {
          this.$emit('success', response.data.data)
          this.handleClose()
        }
      } catch (error) {
        console.error('保存例行巡查記錄失敗:', error)
        const errorMessage = error.response?.data?.message || error.message || '未知錯誤'
        await showError('保存失敗：' + errorMessage, '保存失敗', this.isDarkMode)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>

