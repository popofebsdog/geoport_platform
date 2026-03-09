<template>
  <div class="temporal-chart-container">
    <!-- 圖表控制面板 -->
    <div class="chart-controls mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 時間範圍選擇 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
            時間範圍:
          </label>
          <select v-model="selectedTimeRange" 
                  @change="onTimeRangeChange"
                  class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'">
            <option value="project">專案時間範圍</option>
            <option value="all">全部數據</option>
            <option value="custom">自定義範圍</option>
          </select>
        </div>

        <!-- 自定義時間範圍 -->
        <div v-if="selectedTimeRange === 'custom'" class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <input v-model="customStartDate" 
                   type="date" 
                   class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   :class="isDarkMode 
                     ? 'bg-slate-700 border-slate-600 text-white' 
                     : 'bg-white border-gray-300 text-gray-900'">
            <input v-model="customStartTime" 
                   type="time" 
                   step="1"
                   class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   :class="isDarkMode 
                     ? 'bg-slate-700 border-slate-600 text-white' 
                     : 'bg-white border-gray-300 text-gray-900'">
          </div>
          <span class="text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">至</span>
          <div class="flex items-center gap-1">
            <input v-model="customEndDate" 
                   type="date" 
                   class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   :class="isDarkMode 
                     ? 'bg-slate-700 border-slate-600 text-white' 
                     : 'bg-white border-gray-300 text-gray-900'">
            <input v-model="customEndTime" 
                   type="time" 
                   step="1"
                   class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   :class="isDarkMode 
                     ? 'bg-slate-700 border-slate-600 text-white' 
                     : 'bg-white border-gray-300 text-gray-900'">
          </div>
        </div>

        <!-- 數據列選擇 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
            顯示數據:
          </label>
          <div class="flex flex-wrap gap-2">
            <label v-for="column in availableColumns" :key="column" 
                   class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="selectedColumns" 
                     :value="column" 
                     type="checkbox" 
                     class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                     :class="isDarkMode ? 'bg-slate-600 border-slate-500' : 'bg-gray-100 border-gray-300'">
              <span class="text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                {{ getColumnLabel(column) }}
              </span>
            </label>
          </div>
        </div>

        <!-- 圖表類型選擇 -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
            圖表類型:
          </label>
          <select v-model="chartType" 
                  @change="updateChart"
                  class="px-3 py-1.5 text-sm border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'">
            <option value="line">折線圖</option>
            <option value="bar">柱狀圖</option>
            <option value="scatter">散點圖</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 圖表容器 -->
    <div class="chart-wrapper">
      <div v-if="isLoading" class="flex items-center justify-center h-96">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
            載入圖表中...
          </p>
        </div>
      </div>
      
      <div v-else-if="filteredData.length === 0" class="flex items-center justify-center h-96">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p class="text-lg font-medium transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
            沒有可顯示的數據
          </p>
          <p class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            請調整時間範圍或選擇數據列
          </p>
        </div>
      </div>

      <div v-else class="relative">
        <canvas ref="chartCanvas" class="w-full h-96"></canvas>
      </div>
    </div>

    <!-- 數據統計 -->
    <div v-if="filteredData.length > 0" class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-lg border transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'">
        <div class="text-sm font-medium transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">數據點數</div>
        <div class="text-2xl font-bold transition-colors duration-300"
             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          {{ filteredData.length.toLocaleString() }}
        </div>
      </div>
      
      <div class="p-4 rounded-lg border transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'">
        <div class="text-sm font-medium transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">時間範圍</div>
        <div class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          {{ formatDateRange(actualTimeRange.start, actualTimeRange.end) }}
        </div>
      </div>
      
      <div class="p-4 rounded-lg border transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'">
        <div class="text-sm font-medium transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">顯示列數</div>
        <div class="text-2xl font-bold transition-colors duration-300"
             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          {{ selectedColumns.length }}
        </div>
      </div>
      
      <div class="p-4 rounded-lg border transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'">
        <div class="text-sm font-medium transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">圖表類型</div>
        <div class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          {{ getChartTypeLabel(chartType) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

export default {
  name: 'TemporalChart',
  props: {
    chartData: {
      type: Object,
      required: true
    },
    projectTimeRange: {
      type: Object,
      default: () => ({ start: null, end: null })
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['time-range-changed'],
  setup(props, { emit }) {
    const chartCanvas = ref(null)
    const chart = ref(null)
    const isLoading = ref(false)
    
    // 圖表配置
    const selectedTimeRange = ref('project')
    const customStartDate = ref('')
    const customStartTime = ref('00:00:00')
    const customEndDate = ref('')
    const customEndTime = ref('23:59:59')
    const selectedColumns = ref([])
    const chartType = ref('line')
    
    // 可用的數據列
    const availableColumns = computed(() => {
      if (!props.chartData?.valueColumns) return []
      return props.chartData.valueColumns
    })
    
    // 實際的時間範圍
    const actualTimeRange = computed(() => {
      if (selectedTimeRange.value === 'project' && props.projectTimeRange.start && props.projectTimeRange.end) {
        return {
          start: new Date(props.projectTimeRange.start),
          end: new Date(props.projectTimeRange.end)
        }
      } else if (selectedTimeRange.value === 'custom' && customStartDate.value && customEndDate.value) {
        // 組合日期和時間
        const startDateTime = `${customStartDate.value}T${customStartTime.value}`
        const endDateTime = `${customEndDate.value}T${customEndTime.value}`
        return {
          start: new Date(startDateTime),
          end: new Date(endDateTime)
        }
      }
      return { start: null, end: null }
    })
    
    // 過濾後的數據
    const filteredData = computed(() => {
      if (!props.chartData?.chartData) {
        return []
      }
      
      // 確保 chartData 是數組
      let data = props.chartData.chartData
      if (!Array.isArray(data)) {
        console.error('chartData 不是數組:', data)
        return []
      }
      
      
      // 根據時間範圍過濾
      if (actualTimeRange.value.start && actualTimeRange.value.end) {
        data = data.filter(item => {
          const itemDate = new Date(item.time)
          return itemDate >= actualTimeRange.value.start && itemDate <= actualTimeRange.value.end
        })
      }
      
      // 根據選擇的列過濾
      if (selectedColumns.value.length > 0) {
        data = data.map(item => ({
          ...item,
          values: Object.fromEntries(
            Object.entries(item.values).filter(([key]) => selectedColumns.value.includes(key))
          )
        }))
      }
      
      return data
    })
    
    // 初始化選擇的列
    watch(availableColumns, (newColumns) => {
      if (newColumns.length > 0 && selectedColumns.value.length === 0) {
        // 優先選擇 TWD97-N、TWD97-E、高程
        const preferredColumns = ['TWD97-N', 'TWD97-E', '高程']
        const selected = []
        
        // 先選擇優先列
        preferredColumns.forEach(col => {
          if (newColumns.includes(col)) {
            selected.push(col)
          }
        })
        
        // 如果優先列不足3個，補充其他列
        if (selected.length < 3) {
          newColumns.forEach(col => {
            if (!preferredColumns.includes(col) && selected.length < 3) {
              selected.push(col)
            }
          })
        }
        
        selectedColumns.value = selected
      }
    }, { immediate: true })
    
    // 初始化自定義日期和時間
    watch(() => props.projectTimeRange, (newRange) => {
      if (newRange.start && newRange.end) {
        const startDate = new Date(newRange.start)
        const endDate = new Date(newRange.end)
        
        customStartDate.value = startDate.toISOString().split('T')[0]
        customStartTime.value = startDate.toTimeString().split(' ')[0]
        customEndDate.value = endDate.toISOString().split('T')[0]
        customEndTime.value = endDate.toTimeString().split(' ')[0]
      }
    }, { immediate: true })
    
    // 監聽時間範圍變化
    watch(actualTimeRange, (newRange) => {
      emit('time-range-changed', newRange)
    }, { deep: true })
    
    // 監聽數據變化，重新渲染圖表
    watch([filteredData, selectedColumns, chartType], () => {
      nextTick(() => {
        updateChart()
      })
    }, { deep: true })
    
    // 方法
    const onTimeRangeChange = () => {
      updateChart()
    }
    
    const getColumnLabel = (column) => {
      const labels = {
        '日期': '日期',
        '時間': '時間',
        '傾斜計X': '傾斜計 X',
        '傾斜計Y': '傾斜計 Y',
        '雨量計': '雨量計',
        'TWD97-N': 'TWD97 北向 (m)',
        'TWD97-E': 'TWD97 東向 (m)',
        '高程': '高程 (m)',
        'longitude': '經度',
        'latitude': '緯度'
      }
      return labels[column] || column
    }
    
    const getChartTypeLabel = (type) => {
      const labels = {
        'line': '折線圖',
        'bar': '柱狀圖',
        'scatter': '散點圖'
      }
      return labels[type] || type
    }
    
    const formatDateRange = (start, end) => {
      if (!start || !end) return '未設定'
      const startStr = start.toLocaleDateString('zh-TW')
      const endStr = end.toLocaleDateString('zh-TW')
      return `${startStr} - ${endStr}`
    }
    
    const updateChart = async () => {
      if (!chartCanvas.value) {
        return
      }
      
      if (!Array.isArray(filteredData.value)) {
        console.error('filteredData 不是數組:', filteredData.value)
        return
      }
      
      if (filteredData.value.length === 0) {
        return
      }
      
      isLoading.value = true
      
      try {
        // 動態導入 Chart.js
        const { Chart, registerables } = await import('chart.js')
        Chart.register(...registerables)
        
        // 銷毀現有圖表
        if (chart.value) {
          chart.value.destroy()
        }
        
        // 準備數據
        const labels = filteredData.value.map(item => item.time)
        
        const datasets = selectedColumns.value.map((column, index) => {
          const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
          ]
          
          return {
            label: getColumnLabel(column),
            data: filteredData.value.map(item => item.values[column] || null),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            fill: false,
            tension: 0.1
          }
        })
        
        // 創建圖表
        const ctx = chartCanvas.value.getContext('2d')
        chart.value = new Chart(ctx, {
          type: chartType.value,
          data: {
            labels,
            datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: props.isDarkMode ? '#d1d5db' : '#374151',
                  usePointStyle: true
                }
              },
              title: {
                display: true,
                text: `${props.chartData.name || '時序圖表'} - ${getChartTypeLabel(chartType.value)}`,
                color: props.isDarkMode ? '#d1d5db' : '#374151',
                font: {
                  size: 16,
                  weight: 'bold'
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: '時間',
                  color: props.isDarkMode ? '#d1d5db' : '#374151'
                },
                ticks: {
                  color: props.isDarkMode ? '#d1d5db' : '#374151',
                  maxTicksLimit: 10
                },
                grid: {
                  color: props.isDarkMode ? '#374151' : '#e5e7eb'
                }
              },
              y: {
                title: {
                  display: true,
                  text: '數值',
                  color: props.isDarkMode ? '#d1d5db' : '#374151'
                },
                ticks: {
                  color: props.isDarkMode ? '#d1d5db' : '#374151'
                },
                grid: {
                  color: props.isDarkMode ? '#374151' : '#e5e7eb'
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        })
        
      } catch (error) {
        console.error('圖表渲染失敗:', error)
      } finally {
        isLoading.value = false
      }
    }
    
    // 組件掛載時初始化圖表
    onMounted(() => {
      nextTick(() => {
        updateChart()
      })
    })
    
    // 組件卸載時清理圖表
    onUnmounted(() => {
      if (chart.value) {
        chart.value.destroy()
      }
    })
    
    return {
      chartCanvas,
      isLoading,
      selectedTimeRange,
      customStartDate,
      customStartTime,
      customEndDate,
      customEndTime,
      selectedColumns,
      chartType,
      availableColumns,
      actualTimeRange,
      filteredData,
      onTimeRangeChange,
      getColumnLabel,
      getChartTypeLabel,
      formatDateRange,
      updateChart
    }
  }
}
</script>

<style scoped>
.temporal-chart-container {
  @apply w-full;
}

.chart-controls {
  @apply p-4 rounded-lg border transition-colors duration-300;
  @apply bg-gray-50 border-gray-200;
}

.dark .chart-controls {
  @apply bg-slate-800 border-slate-600;
}

.chart-wrapper {
  @apply relative;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .chart-controls .flex {
    @apply flex-col items-start gap-3;
  }
  
  .chart-controls .flex > div {
    @apply w-full;
  }
}
</style>
