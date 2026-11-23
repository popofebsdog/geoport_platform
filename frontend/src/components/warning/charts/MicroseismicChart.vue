<template>
  <div class="microseismic-chart w-full h-full p-2">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!dataState.available" role="status" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <p class="text-sm">{{ dataState.text }}</p>
      </div>
    </div>
    
    <canvas v-else ref="chartCanvas" class="w-full h-full"></canvas>
  </div>
</template>

<script>
import { getMonitoringState } from '@/utils/monitoringData.js';
import { markRaw } from 'vue';

export default {
  name: 'MicroseismicChart',
  props: {
    data: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    regionCode: {
      type: String,
      default: null
    },
    regionId: {
      type: [String, Number],
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      chart: null,
      renderRequestId: 0,
      updateTimer: null
    };
  },
  computed: {
    dataState() { return getMonitoringState(this.data); }
  },
  watch: {
    regionCode: {
      handler(newVal, oldVal) {
        // 當 regionCode 改變時，清除舊圖表並重新創建
        if (oldVal && oldVal !== newVal && this.chart) {
          try {
            this.chart.destroy();
            this.chart = null;
          } catch (e) {

          }
        }
      }
    },
    isDarkMode() {
      this.updateChart();
    },
    data: {
      deep: true,
      handler() {
        // 使用防抖，避免頻繁更新
        if (this.updateTimer) {
          clearTimeout(this.updateTimer);
        }
        this.updateTimer = setTimeout(() => {
          this.$nextTick(() => {
            this.updateChart();
          });
        }, 100);
      }
    },
    loading(newVal) {
      if (!newVal) {
        // 使用防抖，避免頻繁更新
        if (this.updateTimer) {
          clearTimeout(this.updateTimer);
        }
        this.updateTimer = setTimeout(() => {
          this.$nextTick(() => {
            this.updateChart();
          });
        }, 100);
      }
    }
  },
  mounted() {
    if (this.data && !this.loading) {
      this.createChart();
    }
  },
  beforeUnmount() {
    this.renderRequestId += 1;
    // 清除定時器
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    // 銷毀圖表
    if (this.chart) {
      try {
        this.chart.destroy();
      } catch (e) {

      }
      this.chart = null;
    }
  },
  methods: {
    formatTimeLabel(timeStr) {
      if (!timeStr) return '';
      try {
        // 如果是ISO格式或时间戳
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          // 只顯示時:分:秒
          return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }
        return timeStr;
      } catch (e) {
        return timeStr;
      }
    },
    generateTimeLabels() {
      const labels = [];
      for (let hour = 0; hour < 24; hour++) {
        labels.push(`${String(hour).padStart(2, '0')}:00`);
      }
      return labels;
    },
    // 將時間字符串轉換為小時索引（0-23）
    getHourIndex(timeStr) {
      if (!timeStr) return -1;
      try {
        // 嘗試解析各種時間格式
        // 格式1: ISO格式 (2025-11-17T00:00:00)
        // 格式2: DateTime(UTC+0)格式 (2025-11-17-00-05-02)
        // 格式3: HH:MM:SS格式
        let date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.getHours();
        }
        
        // 嘗試解析 DateTime(UTC+0) 格式：2025-11-17-00-05-02
        const dateTimeMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
        if (dateTimeMatch) {
          const hour = parseInt(dateTimeMatch[4], 10);
          return hour >= 0 && hour < 24 ? hour : -1;
        }
        
        // 嘗試解析 "HH:MM:SS" 或 "HH:MM"
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          return hour >= 0 && hour < 24 ? hour : -1;
        }
        
        return -1;
      } catch (e) {
        return -1;
      }
    },
    getCurrentDateTitle() {
      const now = new Date();
      return now.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    },
    async createChart() {
      const requestId = ++this.renderRequestId;
      const canvas = this.$refs.chartCanvas;
      if (!this.$refs.chartCanvas || !this.data) return;
      
      // 確保先銷毀現有的圖表實例
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {

        }
        this.chart = null;
      }
      
      try {
        const { Chart, registerables } = await import('chart.js');
        const { applyChartDefaults, baseChartOptions, axisScale } = await import('@/utils/chartDefaults.js');
        if (requestId !== this.renderRequestId || this.loading || this.$refs.chartCanvas !== canvas) return;
        Chart.register(...registerables);
        applyChartDefaults(Chart);

        const chartData = this.prepareChartData();
        const dark = this.isDarkMode;
        const base = baseChartOptions(dark);

        const chart = new Chart(canvas, {
          type: 'scatter',
          data: chartData,
          options: {
            ...base,
            clip: false,
            layout: { padding: { bottom: 2, left: 0, right: 6, top: 0 } },
            plugins: {
              ...base.plugins,
              tooltip: {
                ...base.plugins.tooltip,
                mode: 'point',
                intersect: true,
                callbacks: {
                  title(context) {
                    const point = context[0];
                    const hour   = Math.floor(point.parsed.x);
                    const minute = Math.round((point.parsed.x - hour) * 60);
                    return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
                  },
                  label(context) {
                    const typeMap = { 1:'TYPE I', 2:'TYPE II', 3:'TYPE III', 4:'TYPE NOISE', 5:'TYPE EARTHQUAKE', 6:'TYPE IV' };
                    return `類型: ${typeMap[Math.round(context.parsed.y)] || ''}`;
                  }
                }
              }
            },
            scales: {
              x: {
                ...axisScale('x', '', dark),
                type: 'linear',
                position: 'bottom',
                min: 0,
                max: 24,
                ticks: {
                  ...axisScale('x', '', dark).ticks,
                  stepSize: 3,
                  maxRotation: 0,
                  minRotation: 0,
                  padding: 4,
                  callback(value) {
                    return `${String(Math.floor(value)).padStart(2,'0')}:00`;
                  }
                }
              },
              y: {
                display: true,
                type: 'linear',
                position: 'left',
                min: 0.5,
                max: 6.5,
                afterBuildTicks(scale) {
                  scale.ticks = [1, 2, 3, 4, 5, 6].map(v => ({ value: v }));
                },
                grid: {
                  color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  tickColor: 'transparent'
                },
                border: { display: false },
                ticks: {
                  display: true,
                  color: dark ? '#a8b5c4' : '#526579',
                  font: { size: 10, weight: '600' },
                  padding: 8,
                  autoSkip: false,
                  callback(value) {
                    const map = { 1:'T-I', 2:'T-II', 3:'T-III', 4:'Noise', 5:'EQ', 6:'T-IV' };
                    return map[value] ?? '';
                  }
                }
              }
            }
          }
        });
        this.chart = markRaw(chart);
      } catch (error) {

      }
    },
    // generateMockData() 方法已移除 - 現在只使用 API 返回的真實數據
    // 如需測試，請確保後端 API 返回正確的數據格式
    prepareChartData() {
      
      // 固定生成當日00:00到23:59的標籤（用於X軸）
      const labels = this.generateTimeLabels();
      
      // 定義類型映射：扩展支持更多类型
      const typeMap = {
        'TYPE I': 1,
        'TYPE II': 2,
        'TYPE III': 3,
        'TYPE NOISE': 4,
        'TYPE EARTHQUAKE': 5,
        'TYPE IV': 6
      };
      
      const colorMap = {
        'TYPE I':         { border: '#2dd4bf', bg: 'rgba(45,212,191,0.88)' },
        'TYPE II':        { border: '#f59e0b', bg: 'rgba(245,158,11,0.9)' },
        'TYPE III':       { border: '#ef4444', bg: 'rgba(239,68,68,0.92)' },
        'TYPE NOISE':     { border: '#64748b', bg: 'rgba(100,116,139,0.52)' },
        'TYPE EARTHQUAKE':{ border: '#38bdf8', bg: 'rgba(56,189,248,0.86)' },
        'TYPE IV':        { border: '#e879f9', bg: 'rgba(232,121,249,0.86)' }
      };
      
      // 過濾並處理數據：保留當日的所有類型
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const todayStrCompact = todayStr.replace(/-/g, ''); // YYYYMMDD
      
      // 為每個類型創建數據集
      const typeDatasets = {
        'TYPE I': [],
        'TYPE II': [],
        'TYPE III': [],
        'TYPE NOISE': [],
        'TYPE EARTHQUAKE': [],
        'TYPE IV': []
      };
      
      // 使用 API 返回的真實數據
      const dataToProcess = this.data;
      
      if (!dataToProcess || !Array.isArray(dataToProcess.time_series) || dataToProcess.time_series.length === 0) {
        return {
          labels: labels,
          datasets: Object.keys(typeMap).map(type => ({
            label: type,
            data: [],
            borderColor: colorMap[type].border,
            backgroundColor: colorMap[type].bg,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderColor: this.isDarkMode ? '#08111f' : '#f8fafc',
            pointBorderWidth: 1,
            borderWidth: 0
          }))
        };
      }
      
      // 情況1: 時間序列數組
      if (Array.isArray(dataToProcess.time_series) && dataToProcess.time_series.length > 0) {
        
        dataToProcess.time_series.forEach((item, idx) => {
          // 檢查類型：支持所有类型
          const type = item.type || item.Type || '';
          if (!typeMap[type]) {
            return; // 跳過未知類型
          }
          
          // 檢查日期：只保留當日的數據
          const timeStr = item.time || item.timestamp || item.date;
          const recordDate = timeStr || '';
          const isToday = recordDate.includes(todayStr) || 
                         recordDate.includes(todayStrCompact) ||
                         recordDate.startsWith(todayStr) ||
                         recordDate.startsWith(todayStrCompact);
          
          if (!isToday) {
            return; // 跳過非當日的數據
          }
          
          // 解析時間，獲取小時和分鐘
          const hourIndex = this.getHourIndex(timeStr);
          if (hourIndex < 0 || hourIndex >= 24) {
            return;
          }
          
          // 獲取分鐘（用於更精確的時間點）
          let minute = 0;
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              minute = date.getMinutes();
            } else {
              // 嘗試解析 DateTime(UTC+0) 格式：2025-11-17-00-05-02
              const dateTimeMatch = timeStr.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
              if (dateTimeMatch) {
                minute = parseInt(dateTimeMatch[5], 10);
              }
            }
          } catch (e) {
            // 忽略解析錯誤
          }
          
          // 計算X軸位置（小時 + 分鐘/60，範圍0-24）
          const xValue = hourIndex + minute / 60;
          
          // 添加數據點
          typeDatasets[type].push({
            x: xValue,
            y: typeMap[type]
          });
          
        });
      }
      
      // 只顯示 API 返回的真實數據，不使用假數據
      
      // 構建數據集
      const datasets = Object.keys(typeMap).map(type => ({
        label: type,
        data: typeDatasets[type],
        borderColor: colorMap[type].border,
        backgroundColor: colorMap[type].bg,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBorderColor: this.isDarkMode ? '#08111f' : '#f8fafc',
        pointBorderWidth: 1,
        borderWidth: 0
      }));
      
      return {
        labels: labels,
        datasets: datasets
      };
    },
    async updateChart() {
      this.renderRequestId += 1;
      // 確保先銷毀現有的圖表實例
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {

        }
        this.chart = null;
      }
      
      // 等待下一個tick，確保DOM已更新
      await this.$nextTick();
      
      if (this.data && !this.loading && this.$refs.chartCanvas) {
        await this.createChart();
      }
    }
  }
};
</script>

<style scoped>
.microseismic-chart {
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
