<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden"
         :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
      
      <!-- 標題欄 -->
      <div class="flex items-center justify-between p-6 border-b"
           :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 rounded-full bg-blue-500"></div>
          <h3 class="text-lg font-semibold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ temporalData?.name || '時序資料圖表' }}
          </h3>
        </div>
        <button @click="closeModal"
                class="p-2 rounded-lg transition-colors duration-300 hover:bg-gray-100"
                :class="isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'">
          <svg class="w-5 h-5 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 內容區域 -->
      <div class="flex h-[calc(90vh-120px)]">
        <!-- 左側資訊面板 -->
        <div class="w-80 p-6 overflow-y-auto border-r"
             :class="isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-50'">
          
          <!-- 基本資訊 -->
          <div class="space-y-4">
            <h4 class="text-md font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              基本資訊
            </h4>
            
            <div class="space-y-3 text-sm">
              <div v-if="temporalData?.description">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">描述:</span>
                <p class="mt-1 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  {{ temporalData.description }}
                </p>
              </div>
              
              <div>
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">座標:</span>
                <p class="mt-1 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  {{ temporalData?.longitude?.toFixed(6) }}, {{ temporalData?.latitude?.toFixed(6) }}
                </p>
              </div>
              
              <div>
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">資料筆數:</span>
                <span class="ml-1 transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ temporalData?.total_records || 0 }}
                </span>
              </div>
              
              <div>
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">資料類型:</span>
                <span class="ml-1 transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ temporalData?.data_type?.toUpperCase() || 'CSV' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 軸線配置 -->
          <div class="space-y-4 mt-6">
            <h4 class="text-md font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              軸線配置
            </h4>
            
            <div class="space-y-3 text-sm">
              <div v-if="temporalData?.x_axis_columns">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">X軸:</span>
                <p class="mt-1 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  {{ temporalData.x_axis_columns.join(' + ') }}
                </p>
              </div>
              
              <div v-if="temporalData?.y_axis_columns">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">Y軸:</span>
                <p class="mt-1 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  {{ temporalData.y_axis_columns.join(', ') }}
                </p>
              </div>
              
              <div v-if="temporalData?.time_format">
                <span class="font-medium transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">時間格式:</span>
                <span class="ml-1 transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ temporalData.time_format }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 圖表控制 -->
          <div class="space-y-4 mt-6">
            <h4 class="text-md font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              圖表控制
            </h4>
            
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  圖表標題
                </label>
                <input v-model="chartTitle"
                       type="text"
                       class="w-full px-3 py-2 border rounded-md transition-colors duration-300"
                       :class="isDarkMode 
                         ? 'bg-slate-700 border-slate-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-900'"
                       placeholder="輸入圖表標題">
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  X軸標籤
                </label>
                <input v-model="xAxisLabel"
                       type="text"
                       class="w-full px-3 py-2 border rounded-md transition-colors duration-300"
                       :class="isDarkMode 
                         ? 'bg-slate-700 border-slate-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-900'"
                       placeholder="輸入X軸標籤">
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  Y軸標籤
                </label>
                <input v-model="yAxisLabel"
                       type="text"
                       class="w-full px-3 py-2 border rounded-md transition-colors duration-300"
                       :class="isDarkMode 
                         ? 'bg-slate-700 border-slate-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-900'"
                       placeholder="輸入Y軸標籤">
              </div>
              
              <div class="flex items-center space-x-4">
                <label class="flex items-center">
                  <input v-model="showLegend"
                         type="checkbox"
                         class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                  <span class="ml-2 text-sm transition-colors duration-300"
                        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">顯示圖例</span>
                </label>
                
                <label class="flex items-center">
                  <input v-model="showGrid"
                         type="checkbox"
                         class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                  <span class="ml-2 text-sm transition-colors duration-300"
                        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">顯示網格</span>
                </label>
              </div>
              
              <button @click="updateChart"
                      class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                更新圖表
              </button>
            </div>
          </div>
        </div>
        
        <!-- 右側圖表區域 -->
        <div class="flex-1 p-6 overflow-y-auto"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
          
          <!-- 載入狀態 -->
          <div v-if="isLoading" class="flex items-center justify-center h-96">
            <div class="text-center">
              <svg class="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                正在載入圖表...
              </p>
            </div>
          </div>
          
          <!-- 錯誤狀態 -->
          <div v-else-if="error" class="flex items-center justify-center h-96">
            <div class="text-center">
              <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-sm text-red-600 mb-2">載入圖表失敗</p>
              <p class="text-xs text-gray-500">{{ error }}</p>
              <button @click="loadChart"
                      class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                重新載入
              </button>
            </div>
          </div>
          
          <!-- 圖表容器 -->
          <div v-else class="h-full">
            <div ref="chartContainer" class="w-full h-full min-h-96"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import { ref, watch, onMounted, onUnmounted, inject, nextTick } from 'vue'
import axios from 'axios'

export default {
  name: 'TemporalDataChartModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    temporalData: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', false)
    
    // 響應式數據
    const isLoading = ref(false)
    const error = ref(null)
    const chartContainer = ref(null)
    const chart = ref(null)
    
    // 圖表配置
    const chartTitle = ref('')
    const xAxisLabel = ref('')
    const yAxisLabel = ref('')
    const showLegend = ref(true)
    const showGrid = ref(true)
    
    // 載入 ApexCharts
    let ApexCharts = null
    
    onMounted(async () => {
      // 動態載入 ApexCharts
      if (typeof window !== 'undefined') {
        const ApexChartsModule = await import('apexcharts')
        ApexCharts = ApexChartsModule.default
      }
    })
    
    // 監聽模態框顯示狀態
    watch(() => props.isVisible, (newVal) => {
      if (newVal && props.temporalData) {
        initializeChartSettings()
        loadChart()
      } else {
        destroyChart()
      }
    })
    
    // 監聽深色模式變化
    watch(isDarkMode, () => {
      if (props.isVisible && chart.value) {
        updateChart()
      }
    })
    
    // 初始化圖表設置
    const initializeChartSettings = () => {
      if (props.temporalData) {
        chartTitle.value = props.temporalData.name || ''
        xAxisLabel.value = props.temporalData.x_axis_columns?.join(' + ') || '時間'
        yAxisLabel.value = props.temporalData.y_axis_columns?.join(', ') || '數值'
      }
    }
    
    // 載入圖表
    const loadChart = async () => {
      if (!props.temporalData || !ApexCharts) return
      
      isLoading.value = true
      error.value = null
      
      try {
        // 調用後端 API 生成 ApexCharts 配置
        const response = await axios.post(`/api/temporal-data/${props.temporalData.temporal_id}/chart/apex`, {
          chartType: 'line',
          title: chartTitle.value,
          xAxisLabel: xAxisLabel.value,
          yAxisLabel: yAxisLabel.value,
          showLegend: showLegend.value,
          showGrid: showGrid.value,
          theme: isDarkMode.value ? 'dark' : 'light'
        })
        
        if (response.data.success) {
          await nextTick()
          renderChart(response.data.data.apexConfig)
        } else {
          throw new Error(response.data.message || '生成圖表配置失敗')
        }
      } catch (err) {
        console.error('載入圖表失敗:', err)
        error.value = err.response?.data?.message || err.message || '載入圖表失敗'
      } finally {
        isLoading.value = false
      }
    }
    
    // 渲染圖表
    const renderChart = (config) => {
      if (!chartContainer.value || !ApexCharts) return
      
      // 銷毀現有圖表
      destroyChart()
      
      // 創建新圖表
      chart.value = new ApexCharts(chartContainer.value, config)
      chart.value.render()
    }
    
    // 更新圖表
    const updateChart = () => {
      if (chart.value) {
        loadChart()
      }
    }
    
    // 銷毀圖表
    const destroyChart = () => {
      if (chart.value) {
        chart.value.destroy()
        chart.value = null
      }
    }
    
    // 關閉模態框
    const closeModal = () => {
      emit('close')
    }
    
    // 組件卸載時清理
    onUnmounted(() => {
      destroyChart()
    })
    
    return {
      isDarkMode,
      isLoading,
      error,
      chartContainer,
      chartTitle,
      xAxisLabel,
      yAxisLabel,
      showLegend,
      showGrid,
      loadChart,
      updateChart,
      closeModal
    }
  }
}
</script>

<style scoped>
/* 確保圖表容器有適當的高度 */
.chart-container {
  min-height: 400px;
}
</style>
