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
        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] z-10 flex flex-col">
          <!-- 標題欄 -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ inspectionType === 'routine' ? '經常巡查記錄' : '特別巡查記錄' }}
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
          
          <!-- 點位資訊 -->
          <div v-if="pointInfo" class="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <p>路線: {{ pointInfo.roadSection || '-' }}</p>
              <p>里程數: {{ pointInfo.mileage || '-' }}</p>
              <p>位置: {{ pointInfo.location || '-' }}</p>
            </div>
          </div>
          
          <!-- 內容區域 -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <!-- 工具欄 -->
            <div class="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                共 {{ records.length }} 筆記錄
              </div>
              <button
                @click="showAddForm = true"
                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                + 新增記錄
              </button>
            </div>
            
            <!-- 記錄列表 -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <div v-if="loading" class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600 dark:text-gray-400">載入中...</span>
              </div>
              
              <div v-else-if="records.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                <p class="mb-4">尚無{{ inspectionType === 'routine' ? '經常' : '特別' }}巡查記錄</p>
                <p class="text-sm">點擊「新增記錄」按鈕開始添加</p>
              </div>
              
              <div v-else class="space-y-3">
                <div
                  v-for="record in records"
                  :key="record.record_id"
                  class="rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  :class="record.is_disaster 
                    ? 'border-2 border-red-500 dark:border-red-500' 
                    : 'border border-gray-200 dark:border-gray-700'"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <span class="px-2 py-1 text-xs font-medium rounded"
                          :class="record.inspection_type === 'routine' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'"
                        >
                          {{ record.inspection_type === 'routine' ? '經常巡查' : '特別巡查' }}
                        </span>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {{ formatDate(record) }}
                        </span>
                        <!-- 災害標記 -->
                        <span 
                          v-if="record.is_disaster"
                          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          title="標註為災害"
                        >
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                          災害
                        </span>
                      </div>
                      
                      <div v-if="record.inspection_data" class="text-sm text-gray-700 dark:text-gray-300">
                        <div v-if="record.inspection_data.eventName" class="mb-1">
                          <span class="font-medium">事件名稱：</span>
                          {{ record.inspection_data.eventName }}
                        </div>
                        <div v-if="record.inspection_data.description">
                          <span class="font-medium">說明：</span>
                          {{ record.inspection_data.description }}
                        </div>
                        <div v-else-if="record.inspection_data.value">
                          <span class="font-medium">內容：</span>
                          {{ record.inspection_data.value }}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 ml-4">
                      <button
                        @click="editRecord(record)"
                        class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                        title="編輯記錄"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        @click="deleteRecord(record.record_id)"
                        class="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        title="刪除記錄"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- 新增/編輯記錄表單（根據類型顯示對應的模態框） -->
    <RoutineInspectionModal
      v-if="inspectionType === 'routine'"
      :is-visible="showAddForm && inspectionType === 'routine'"
      :point-info="pointInfo"
      :region-code="regionCode"
      :editing-record="editingRecord"
      :mileage-points="mileagePoints"
      @close="handleCloseForm"
      @success="handleRecordAdded"
      @navigate-to-point="handleNavigateToPoint"
    />
    
    <SpecialInspectionModal
      v-if="inspectionType === 'special'"
      :is-visible="showAddForm && inspectionType === 'special'"
      :point-info="pointInfo"
      :region-code="regionCode"
      :editing-record="editingRecord"
      :mileage-points="mileagePoints"
      @close="handleCloseForm"
      @success="handleRecordAdded"
      @navigate-to-point="handleNavigateToPoint"
    />
  </Teleport>
</template>

<script>
import axios from 'axios'
import RoutineInspectionModal from './RoutineInspectionModal.vue'
import SpecialInspectionModal from './SpecialInspectionModal.vue'
import { confirm as showConfirm, alert as showAlert, error as showError } from '@/utils/simpleAlertService'

export default {
  name: 'InspectionRecordsView',
  components: {
    RoutineInspectionModal,
    SpecialInspectionModal
  },
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
    inspectionType: {
      type: String,
      required: true,
      validator: (value) => ['routine', 'special'].includes(value)
    },
    mileagePoints: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'navigate-to-point', 'record-updated'],
  inject: ['isDarkMode'],
  data() {
    return {
      records: [],
      loading: false,
      showAddForm: false,
      editingRecord: null
    }
  },
  mounted() {
    if (this.isVisible) {
      this.loadRecords()
    }
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        this.loadRecords()
        this.showAddForm = false
        this.editingRecord = null
      }
    },
    pointInfo: {
      handler(newVal) {
        if (this.isVisible && newVal) {
          this.loadRecords()
        }
      },
      deep: true
    },
    regionCode(newVal) {
      if (this.isVisible && newVal) {
        this.loadRecords()
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    async loadRecords() {
      if (!this.pointInfo || !this.regionCode) {
        return
      }
      
      this.loading = true
      
      try {
        
        const response = await axios.get(
          `/api/warning-regions/${this.regionCode}/inspection-records`
        )
        
        
        if (response.data.success) {
          // 過濾出該里程數和類型的記錄
          // 注意：里程數格式可能不同，需要精確匹配
          const pointMileage = String(this.pointInfo.mileage || '').trim()
          
          
          this.records = response.data.data.filter(record => {
            const recordMileage = String(record.mileage || '').trim()
            const typeMatch = record.inspection_type === this.inspectionType
            
            if (!typeMatch) {
              return false
            }
            
            // 1. 完全匹配（優先）
            if (recordMileage === pointMileage) {
              return true
            }
            
            // 2. 處理 "022K+500" 格式匹配 "22.5K" 格式
            // 如果點位是 "022K+500" 格式，轉換為 "22.5K"
            if (pointMileage.match(/^0*(\d+)K\+(\d+)$/)) {
              const match = pointMileage.match(/^0*(\d+)K\+(\d+)$/)
              const km = parseInt(match[1])
              const meter = parseInt(match[2])
              
              // 將米數轉換為小數點（例如：500米 = 0.5K）
              const decimal = meter / 1000
              const totalKm = km + decimal
              
              // 精確匹配：只匹配完全相等的里程數
              // 例如："022K+500" (22.5K) 只匹配 "22.5K"，不匹配 "22.1K", "22.2K" 等
              const convertedMileage = `${totalKm}K`
              
              // 移除記錄中的前導零和空格，進行精確匹配
              const cleanRecordMileage = recordMileage.replace(/^0+/, '').trim()
              
              // 提取記錄中的數字部分進行比較
              const recordNumMatch = cleanRecordMileage.match(/^(\d+\.?\d*)K/)
              if (recordNumMatch) {
                const recordValue = parseFloat(recordNumMatch[1])
                // 允許小數點誤差（例如：22.5 和 22.500）
                if (Math.abs(recordValue - totalKm) < 0.001) {
                  return true
                }
              }
            }
            
            // 3. 處理 "022K+000" 格式匹配 "22K" 格式（精確匹配，不匹配小數點）
            if (pointMileage.match(/^0*(\d+)K\+000$/)) {
              const match = pointMileage.match(/^0*(\d+)K\+000$/)
              const km = parseInt(match[1])
              const convertedMileage = `${km}K`
              
              // 只匹配完全相等的 "22K"，不匹配 "22.1K", "22.2K" 等
              if (recordMileage === convertedMileage) {
                return true
              }
            }
            
            // 4. 處理範圍格式（例如：點位是 "022K+000"，記錄是 "22.07-22.2K"）
            // 檢查記錄是否在點位的範圍內
            if (pointMileage.match(/^0*(\d+)K\+(\d+)$/)) {
              const match = pointMileage.match(/^0*(\d+)K\+(\d+)$/)
              const km = parseInt(match[1])
              const meter = parseInt(match[2])
              const pointValue = km + meter / 1000
              
              // 檢查記錄是否為範圍格式（例如：22.07-22.2K）
              const rangeMatch = recordMileage.match(/(\d+\.?\d*)-(\d+\.?\d*)K/)
              if (rangeMatch) {
                const start = parseFloat(rangeMatch[1])
                const end = parseFloat(rangeMatch[2])
                if (pointValue >= start && pointValue <= end) {
                  return true
                }
              }
            }
            
            return false
          })
          
          
          // 解析 inspection_data JSON
          this.records = this.records.map(record => {
            if (typeof record.inspection_data === 'string') {
              try {
                record.inspection_data = JSON.parse(record.inspection_data)
              } catch (e) {
                record.inspection_data = {}
              }
            }
            return record
          })
        }
      } catch (error) {
        console.error('載入巡查記錄失敗:', error)
        console.error('錯誤詳情:', error.response?.data || error.message)
        this.records = []
      } finally {
        this.loading = false
      }
    },
    formatDate(record) {
      // 經常巡查只顯示年月，不顯示日
      if (record.inspection_type === 'routine') {
        if (record.inspection_year && record.inspection_month) {
          return `${record.inspection_year}年${record.inspection_month}月`
        } else if (record.inspection_year) {
          return `${record.inspection_year}年`
        }
      } else {
        // 特別巡查顯示完整日期
        if (record.inspection_date) {
          const date = new Date(record.inspection_date)
          return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
        } else if (record.inspection_year && record.inspection_month) {
          return `${record.inspection_year}年${record.inspection_month}月`
        } else if (record.inspection_year) {
          return `${record.inspection_year}年`
        }
      }
      return '-'
    },
    async deleteRecord(recordId) {
      const confirmed = await showConfirm('確定要刪除這筆記錄嗎？', '確認刪除', this.isDarkMode)
      if (!confirmed) {
        return
      }
      
      try {
        const response = await axios.delete(`/api/warning-regions/${this.regionCode}/inspection-records/${recordId}`)
        if (response.data.success) {
          await this.loadRecords()
        } else {
          throw new Error(response.data.message || '刪除失敗')
        }
      } catch (error) {
        console.error('刪除記錄失敗:', error)
        const errorMessage = error.response?.data?.message || error.message || '未知錯誤'
        await showError('刪除失敗：' + errorMessage, '刪除失敗', this.isDarkMode)
      }
    },
    editRecord(record) {
      // 確保 inspection_data 已解析
      if (typeof record.inspection_data === 'string') {
        try {
          record.inspection_data = JSON.parse(record.inspection_data)
        } catch (e) {
          console.warn('解析 inspection_data 失敗:', e)
          record.inspection_data = {}
        }
      }
      this.editingRecord = record
      this.showAddForm = true
    },
    handleCloseForm() {
      this.showAddForm = false
      this.editingRecord = null
      // 关闭表单后，保持 InspectionRecordsView 显示状态（不关闭整个视图）
      // 确保 isVisible 仍然是 true，这样 InspectionRecordsView 会继续显示
    },
    handleRecordAdded() {
      this.showAddForm = false
      this.editingRecord = null
      this.loadRecords()
      // 通知父組件記錄已更新，需要刷新熱力圖
      this.$emit('record-updated')
    },
    handleNavigateToPoint(newPointInfo) {
      this.$emit('navigate-to-point', newPointInfo)
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

