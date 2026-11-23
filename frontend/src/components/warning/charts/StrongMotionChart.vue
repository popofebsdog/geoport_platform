<template>
  <div class="strong-motion-chart w-full h-full p-2">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!dataState.available" role="status" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <p class="text-sm">{{ dataState.text }}</p>
      </div>
    </div>
    
    <div v-else class="relative w-full h-full motion-content">
      <small v-if="data.parsed?.metadata?.startTime" class="event-caption" :class="{ 'is-dark': isDarkMode }">{{ getChartTitle() }}</small>
      <div class="motion-plot">
        <canvas ref="chartCanvas" class="w-full h-full"></canvas>
        <div v-if="chart && !hasMotionSignal" class="chart-empty-state"
             :class="isDarkMode ? 'chart-empty-state--dark' : 'chart-empty-state--light'">
          <span>此筆資料無明顯波動</span>
          <small>{{ dataState.status === 'historical' ? '歷史事件紀錄' : '依目前已取得資料' }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getMonitoringState } from '@/utils/monitoringData.js';
import { markRaw } from 'vue';

export default {
  name: 'StrongMotionChart',
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
      hasMotionSignal: true
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
        this.$nextTick(() => {
          this.updateChart();
        });
      }
    },
    loading(newVal) {
      if (!newVal) {
        this.$nextTick(() => {
          this.updateChart();
        });
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
    if (this.chart) {
      this.chart.destroy();
    }
  },
  methods: {
    formatTimeLabel(timeStr) {
      if (!timeStr) return '';
      try {
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
      const currentHour = new Date().getHours();
      for (let hour = 0; hour <= currentHour; hour++) {
        labels.push(`${String(hour).padStart(2, '0')}:00`);
      }
      return labels;
    },
    // 將時間字符串轉換為小時索引（0-23）
    getHourIndex(timeStr) {
      if (!timeStr) return -1;
      try {
        // 嘗試解析各種時間格式
        let date = new Date(timeStr);
        if (isNaN(date.getTime())) {
          // 如果不是標準格式，嘗試解析 "HH:MM:SS" 或 "HH:MM"
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1], 10);
            return hour >= 0 && hour < 24 ? hour : -1;
          }
          return -1;
        }
        return date.getHours();
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
    getChartTitle() {
      const metadata = this.data?.parsed?.metadata;
      if (metadata?.startTime) {
        const prefix = this.isEventToday() ? '事件波形' : '歷史事件波形';
        return `${prefix} ${metadata.stationCode || ''} ${metadata.startTime}`;
      }
      return `強地動監測數據 - ${this.getCurrentDateTitle()}`;
    },
    isEventToday() {
      // 检查地震事件是否为今日数据
      if (!this.data || !this.data.parsed || !this.data.parsed.metadata || !this.data.parsed.metadata.startTime) {
        return false;
      }
      
      const startTime = this.data.parsed.metadata.startTime;
      try {
        // 解析 "2025/11/02-15:09:46.80" 格式
        const match = startTime.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (match) {
          const eventDate = `${match[1]}-${match[2]}-${match[3]}`;
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          return eventDate === todayStr;
        }
      } catch (e) {

      }
      
      return false;
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

        const dark = this.isDarkMode;
        const base = baseChartOptions(dark);
        const chartData = this.prepareChartData();

        const chart = new Chart(canvas, {
          type: 'line',
          data: chartData,
          options: {
            ...base,
            clip: false,
            interaction: { intersect: false, mode: 'index' },
            elements: {
              line:  { tension: 0.28, borderWidth: 1.8 },
              point: { radius: 0, hoverRadius: 3 }
            },
            plugins: {
              ...base.plugins,
              tooltip: {
                ...base.plugins.tooltip,
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              x: {
                ...axisScale('x', '', dark),
                ticks: {
                  ...axisScale('x', '', dark).ticks,
                  maxRotation: 45,
                  minRotation: 0,
                  maxTicksLimit: 8,
                  callback(value, index, ticks) {
                    const lbl = this.getLabelForValue ? this.getLabelForValue(value) : String(value);
                    return lbl.length > 5 ? lbl.substring(0, 5) : lbl;
                  }
                }
              },
              y: {
                ...axisScale('y', 'gal', dark),
                ticks: {
                  ...axisScale('y', 'gal', dark).ticks,
                  maxTicksLimit: 6
                }
              }
            }
          }
        });
        this.chart = markRaw(chart);
      } catch (error) {

      }
    },
    prepareChartData() {
      
      if (!this.data) {

        const labels = this.generateTimeLabels();
        const values = new Array(24).fill(0);
        this.hasMotionSignal = false;
        return {
          labels: labels,
          datasets: [{
            label: '加速度 (gal)',
            data: values,
            borderColor: this.isDarkMode ? '#22d3ee' : '#0f766e',
            backgroundColor: this.isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(15,118,110,0.08)',
            tension: 0.34,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2.2
          }]
        };
      }
      
      // 檢查是否為地震事件波形數據（高密度采样数据）
      const hasEventData = this.data.parsed && 
                          this.data.parsed.metadata && 
                          this.data.parsed.timeSeries && 
                          this.data.parsed.timeSeries.length > 0;
      
      if (hasEventData) {
        return this.prepareEventChartData();
      }
      
      // 日常監測模式：按小時分組
      const labels = this.generateTimeLabels();
      const now = new Date();
      const currentHour = now.getHours();
      const values = new Array(currentHour + 1).fill(0);
      
      // 情況1: 時間序列數組
      if (Array.isArray(this.data.time_series) && this.data.time_series.length > 0) {
        this.data.time_series.forEach(item => {
          const timeStr = item.time || item.timestamp || item.date;
          const hourIndex = this.getHourIndex(timeStr);
          // 只处理到当前小时
          if (hourIndex >= 0 && hourIndex <= currentHour) {
            // 優先使用 absAcceleration（三個分量的最大絕對值），這是標準的PGA計算方式
            // 其次使用 acceleration（合成加速度），最後使用 pga
            const value = parseFloat(item.absAcceleration || item.acceleration || item.pga || item.max_acceleration || item.value || item.data || 0);
            // 如果該小時已有數據，取較大值（強地動通常取峰值）
            if (values[hourIndex] === 0 || value > values[hourIndex]) {
              values[hourIndex] = value;
            }
          }
        });
      }
      // 情況2: 分離的labels和values數組
      else if (Array.isArray(this.data.labels) && Array.isArray(this.data.values)) {
        this.data.labels.forEach((label, index) => {
          const hourIndex = this.getHourIndex(label);
          // 只处理到当前小时
          if (hourIndex >= 0 && hourIndex <= currentHour && index < this.data.values.length) {
            const value = parseFloat(this.data.values[index] || 0);
            if (values[hourIndex] === 0 || value > values[hourIndex]) {
              values[hourIndex] = value;
            }
          }
        });
      }
      // 情況3: 只有values數組（按順序對應00:00-23:59）
      else if (Array.isArray(this.data.values)) {
        this.data.values.forEach((val, index) => {
          // 只处理到当前小时
          if (index <= currentHour) {
            values[index] = parseFloat(val || 0);
          }
        });
      }
      // 情況4: 單一數值，顯示在當前小時
      else if (this.data.pga !== undefined || this.data.acceleration !== undefined || this.data.value !== undefined || this.data.max_acceleration !== undefined) {
        const value = parseFloat(this.data.pga || this.data.acceleration || this.data.value || this.data.max_acceleration || 0);
        const now = new Date();
        const currentHour = now.getHours();
        values[currentHour] = value;
      }
      // 情況5: 嘗試從data_content中解析
      else if (typeof this.data === 'object') {
        const findTimeSeries = (obj) => {
          for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0) {
              const firstItem = obj[key][0];
              if (firstItem && (firstItem.time || firstItem.timestamp || firstItem.date)) {
                return obj[key];
              }
            }
          }
          return null;
        };
        
        const timeSeries = findTimeSeries(this.data);
        if (timeSeries) {
          timeSeries.forEach(item => {
            const timeStr = item.time || item.timestamp || item.date;
            const hourIndex = this.getHourIndex(timeStr);
            if (hourIndex >= 0 && hourIndex < 24) {
              // 優先使用 absAcceleration（三個分量的最大絕對值），這是標準的PGA計算方式
              const value = parseFloat(item.absAcceleration || item.acceleration || item.pga || item.max_acceleration || item.value || item.data || 0);
              if (values[hourIndex] === 0 || value > values[hourIndex]) {
                values[hourIndex] = value;
              }
            }
          });
        }
      }
      
      this.hasMotionSignal = Math.max(...values, 0) > 0;
      return {
        labels: labels,
        datasets: [{
          label: '加速度 (gal)',
          data: values,
          borderColor: this.isDarkMode ? '#22d3ee' : '#0f766e',
          backgroundColor: this.isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(15,118,110,0.08)',
          tension: 0.34,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.2
        }]
      };
    },
    prepareEventChartData() {
      // 地震事件模式：顯示波形數據
      const metadata = this.data.parsed.metadata;
      const timeSeries = this.data.parsed.timeSeries;
      
      // 降采样：从24000个点降到120个点（每秒1个点）
      const sampledData = [];
      const sampleRate = Number(metadata.sampleRate);
      const samplesPerSecond = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.max(1, Math.round(sampleRate)) : 1;
      for (let i = 0; i < timeSeries.length; i += samplesPerSecond) {
        // 取这一秒内的最大absAcceleration
        let maxAcc = 0;
        for (let j = i; j < Math.min(i + samplesPerSecond, timeSeries.length); j++) {
          const acc = Math.abs(Number(timeSeries[j].absAcceleration ?? timeSeries[j].acceleration));
          if (acc > maxAcc) maxAcc = acc;
        }
        sampledData.push({
          time: Math.floor(timeSeries[i].time),
          value: maxAcc
        });
      }
      
      
      const labels = sampledData.map(d => `${d.time}s`);
      const values = sampledData.map(d => d.value);
      this.hasMotionSignal = Math.max(...values, 0) > 0;
      
      return {
        labels: labels,
        datasets: [{
          label: `PGA (gal) - ${metadata.stationCode}`,
          data: values,
          borderColor: this.isDarkMode ? '#fb7185' : '#dc2626',
          backgroundColor: this.isDarkMode ? 'rgba(251,113,133,0.14)' : 'rgba(220,38,38,0.1)',
          tension: 0.1,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2
        }]
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
.strong-motion-chart {
  position: relative;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.event-caption {
  flex-shrink: 0;
  line-height: 16px;
  text-align: center;
  font-size: 11px;
  color: #526579;
  pointer-events: none;
}

.event-caption.is-dark {
  color: #cbd5e1;
}

.motion-content {
  display: flex;
  flex-direction: column;
}

.motion-plot {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.chart-empty-state {
  position: absolute;
  inset: 50px 18px 24px 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 10px;
  backdrop-filter: blur(1px);
  pointer-events: none;
}

.chart-empty-state span {
  font-size: 13px;
  font-weight: 700;
}

.chart-empty-state small {
  font-size: 11px;
}

.chart-empty-state--light {
  color: #526579;
  background: rgba(255, 255, 255, 0.72);
}

.chart-empty-state--dark {
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.68);
}
</style>
