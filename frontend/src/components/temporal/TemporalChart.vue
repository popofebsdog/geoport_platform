<template>
  <div class="temporal-chart-container">
    <!-- 圖表控制面板 -->
    <div class="chart-controls mb-4 p-4 rounded-lg border"
         :class="isDarkMode ? 'bg-slate-700/80 border-slate-600' : 'bg-white border-gray-200'">
      
      <!-- 時間範圍選擇 -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
            開始時間
          </label>
          <input
            v-model="timeRange.start"
            type="datetime-local"
            class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="isDarkMode 
              ? 'bg-slate-600 border-slate-500 text-white' 
              : 'bg-white border-gray-300 text-gray-900'"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
            結束時間
          </label>
          <input
            v-model="timeRange.end"
            type="datetime-local"
            class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="isDarkMode 
              ? 'bg-slate-600 border-slate-500 text-white' 
              : 'bg-white border-gray-300 text-gray-900'"
          />
        </div>
      </div>
      
      <!-- 圖表類型選擇 -->
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
          圖表類型
        </label>
        <div class="flex space-x-2">
          <button
            v-for="chartType in chartTypes"
            :key="chartType.value"
            @click="selectedChartType = chartType.value"
            class="px-3 py-2 text-sm rounded-lg transition-all duration-300"
            :class="selectedChartType === chartType.value
              ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
              : (isDarkMode ? 'bg-slate-600 text-gray-300 hover:bg-slate-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')"
          >
            {{ chartType.label }}
          </button>
        </div>
      </div>
      
      <!-- 數據欄位選擇 -->
      <div v-if="availableColumns.length > 0" class="mb-4">
        <label class="block text-sm font-medium mb-2 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
          顯示欄位
        </label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="column in availableColumns"
            :key="column"
            class="flex items-center space-x-2 cursor-pointer"
          >
            <input
              v-model="selectedColumns"
              :value="column"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              {{ column }}
            </span>
          </label>
        </div>
      </div>
      
      <!-- 操作按鈕 -->
      <div class="flex space-x-2">
        <button
          @click="loadChartData"
          :disabled="isLoading"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-all duration-300 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading" class="flex items-center space-x-2">
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>載入中...</span>
          </span>
          <span v-else>載入圖表</span>
        </button>
        
        <button
          @click="exportChart"
          :disabled="!chartData || chartData.length === 0"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
          :class="isDarkMode 
            ? 'text-gray-300 bg-slate-600 hover:bg-slate-500' 
            : 'text-gray-700 bg-gray-100 hover:bg-gray-200'"
        >
          匯出圖表
        </button>
      </div>
    </div>
    
    <!-- 圖表顯示區域 -->
    <div class="chart-display">
      <div v-if="isLoading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <p class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            載入圖表數據中...
          </p>
        </div>
      </div>
      
      <div v-else-if="error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>
      
      <div v-else-if="!chartData || chartData.length === 0" class="flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-8 h-8 mx-auto mb-2 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <p class="text-sm transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            請選擇時間範圍和欄位，然後點擊「載入圖表」
          </p>
        </div>
      </div>
      
      <div v-else class="chart-container">
        <!-- 線圖 -->
        <LineChart
          v-if="selectedChartType === 'line'"
          :data="processedChartData"
          :options="chartOptions"
          :is-dark-mode="isDarkMode"
        />
        
        <!-- 柱狀圖 -->
        <BarChart
          v-else-if="selectedChartType === 'bar'"
          :data="processedChartData"
          :options="chartOptions"
          :is-dark-mode="isDarkMode"
        />
        
        <!-- 散點圖 -->
        <ScatterChart
          v-else-if="selectedChartType === 'scatter'"
          :data="processedChartData"
          :options="chartOptions"
          :is-dark-mode="isDarkMode"
        />
        
        <!-- 面積圖 -->
        <AreaChart
          v-else-if="selectedChartType === 'area'"
          :data="processedChartData"
          :options="chartOptions"
          :is-dark-mode="isDarkMode"
        />
      </div>
    </div>
  </div>
</template>

<script>
import LineChart from '../charts/LineChart.vue'
import BarChart from '../charts/BarChart.vue'
import ScatterChart from '../charts/ScatterChart.vue'
import AreaChart from '../charts/AreaChart.vue'
import api from '../../services/api'

export default {
  name: 'TemporalChart',
  components: {
    LineChart,
    BarChart,
    ScatterChart,
    AreaChart
  },
  props: {
    temporalData: {
      type: Object,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      timeRange: {
        start: '',
        end: ''
      },
      selectedChartType: 'line',
      selectedColumns: [],
      chartData: [],
      isLoading: false,
      error: null,
      chartTypes: [
        { value: 'line', label: '線圖' },
        { value: 'bar', label: '柱狀圖' },
        { value: 'scatter', label: '散點圖' },
        { value: 'area', label: '面積圖' }
      ]
    }
  },
  computed: {
    availableColumns() {
      return this.temporalData.value_columns || []
    },
    
    processedChartData() {
      if (!this.chartData || this.chartData.length === 0) {
        return { labels: [], datasets: [] }
      }
      
      const labels = this.chartData.map(item => item.time)
      const datasets = []
      
      // 為每個選中的欄位創建一個數據集
      this.selectedColumns.forEach((column, index) => {
        const data = this.chartData.map(item => item.values[column] || null)
        const color = this.getColorForIndex(index)
        
        datasets.push({
          label: column,
          data: data,
          borderColor: color,
          backgroundColor: this.selectedChartType === 'bar' || this.selectedChartType === 'area' 
            ? color + '20' 
            : color,
          fill: this.selectedChartType === 'area',
          tension: 0.1
        })
      })
      
      return { labels, datasets }
    },
    
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: this.temporalData.name,
            color: this.isDarkMode ? '#e2e8f0' : '#374151'
          },
          legend: {
            labels: {
              color: this.isDarkMode ? '#e2e8f0' : '#374151'
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '時間',
              color: this.isDarkMode ? '#e2e8f0' : '#374151'
            },
            ticks: {
              color: this.isDarkMode ? '#e2e8f0' : '#374151'
            },
            grid: {
              color: this.isDarkMode ? '#475569' : '#e5e7eb'
            }
          },
          y: {
            title: {
              display: true,
              text: '數值',
              color: this.isDarkMode ? '#e2e8f0' : '#374151'
            },
            ticks: {
              color: this.isDarkMode ? '#e2e8f0' : '#374151'
            },
            grid: {
              color: this.isDarkMode ? '#475569' : '#e5e7eb'
            }
          }
        }
      }
    }
  },
  mounted() {
    this.initializeTimeRange()
    this.initializeSelectedColumns()
  },
  methods: {
    initializeTimeRange() {
      if (this.temporalData.start_time && this.temporalData.end_time) {
        this.timeRange.start = this.formatDateTimeForInput(this.temporalData.start_time)
        this.timeRange.end = this.formatDateTimeForInput(this.temporalData.end_time)
      }
    },
    
    initializeSelectedColumns() {
      // 預設選擇前3個欄位
      this.selectedColumns = this.availableColumns.slice(0, 3)
    },
    
    formatDateTimeForInput(dateTime) {
      const date = new Date(dateTime)
      return date.toISOString().slice(0, 16)
    },
    
    getColorForIndex(index) {
      const colors = [
        '#3b82f6', // blue
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // yellow
        '#8b5cf6', // purple
        '#06b6d4', // cyan
        '#84cc16', // lime
        '#f97316'  // orange
      ]
      return colors[index % colors.length]
    },
    
    async loadChartData() {
      if (!this.timeRange.start || !this.timeRange.end) {
        this.error = '請選擇時間範圍'
        return
      }
      
      if (this.selectedColumns.length === 0) {
        this.error = '請至少選擇一個數據欄位'
        return
      }
      
      this.isLoading = true
      this.error = null
      
      try {
        const params = {
          startTime: this.timeRange.start,
          endTime: this.timeRange.end,
          columns: this.selectedColumns.join(',')
        }
        
        const response = await api.get(`/temporal-data/${this.temporalData.temporal_id}/chart`, { params })
        
        if (response.data.success) {
          this.chartData = response.data.data.chartData
        } else {
          this.error = response.data.message || '載入圖表數據失敗'
        }
      } catch (error) {
        console.error('載入圖表數據失敗:', error)
        this.error = '載入圖表數據失敗: ' + (error.response?.data?.message || error.message)
      } finally {
        this.isLoading = false
      }
    },
    
    exportChart() {
      if (!this.chartData || this.chartData.length === 0) {
        return
      }
      
      // 創建 CSV 數據
      const headers = ['時間', ...this.selectedColumns]
      const csvContent = [
        headers.join(','),
        ...this.chartData.map(item => [
          item.time,
          ...this.selectedColumns.map(col => item.values[col] || '')
        ].join(','))
      ].join('\n')
      
      // 下載 CSV 文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${this.temporalData.name}_圖表數據.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>

<style scoped>
.chart-container {
  height: 400px;
  position: relative;
}

.temporal-chart-container {
  @apply w-full;
}
</style>
