<template>
  <div class="strong-motion-chart w-full h-full p-2">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!data" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <p class="text-sm">暫無數據</p>
      </div>
    </div>
    
    <canvas v-else ref="chartCanvas" class="w-full h-full"></canvas>
  </div>
</template>

<script>
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
      type: String,
      default: null
    }
  },
  data() {
    return {
      chart: null
    };
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
            console.warn('清除舊圖表時出錯:', e);
          }
        }
      }
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
      // 生成當日00:00到當前時間的標籤（每小時一個點）
      const labels = [];
      const now = new Date();
      const currentHour = now.getHours();
      
      // 只生成到當前小時
      for (let hour = 0; hour <= currentHour; hour++) {
        const timeStr = `${String(hour).padStart(2, '0')}:00:00`;
        labels.push(timeStr);
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
      // 地震事件模式：只有今日数据才显示事件时间
      if (this.data && this.data.parsed && this.data.parsed.metadata && this.data.parsed.metadata.startTime) {
        const isToday = this.isEventToday();
        if (isToday) {
          const startTime = this.data.parsed.metadata.startTime;
          const stationCode = this.data.parsed.metadata.stationCode;
          try {
            const match = startTime.match(/(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2}):(\d{2})/);
            if (match) {
              return `地震事件波形 - ${stationCode} (${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]})`;
            }
          } catch (e) {
            // 忽略错误
          }
          return `地震事件波形 - ${stationCode}`;
        }
      }
      
      // 日常监测模式或非今日数据：显示当前日期
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
        console.warn('解析地震事件日期失敗:', e);
      }
      
      return false;
    },
    async createChart() {
      if (!this.$refs.chartCanvas || !this.data) return;
      
      // 確保先銷毀現有的圖表實例
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {
          console.warn('銷毀圖表時出錯:', e);
        }
        this.chart = null;
      }
      
      try {
        const { Chart, registerables } = await import('chart.js');
        Chart.register(...registerables);
        
        const chartData = this.prepareChartData();
        
        this.chart = new Chart(this.$refs.chartCanvas, {
          type: 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: {
                    size: 12
                  }
                }
              },
              title: {
                display: true,
                text: this.getChartTitle(),
                font: {
                  size: 14,
                  weight: 'bold'
                },
                padding: {
                  bottom: 10
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 10,
                titleFont: {
                  size: 12
                },
                bodyFont: {
                  size: 11
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            },
            elements: {
              line: {
                tension: 0.4
              }
            },
            clip: false,
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: '時間',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                },
                ticks: {
                  font: {
                    size: 10
                  },
                  maxRotation: 45,
                  minRotation: 45
                },
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: '加速度 (gal)',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                },
                ticks: {
                  font: {
                    size: 10
                  }
                },
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('創建圖表失敗:', error);
      }
    },
    prepareChartData() {
      
      if (!this.data) {
        console.warn('強地動數據為空');
        const labels = this.generateTimeLabels();
        const values = new Array(24).fill(0);
        return {
          labels: labels,
          datasets: [{
            label: '加速度 (gal)',
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2
          }]
        };
      }
      
      // 檢查是否為地震事件波形數據（高密度采样数据）
      const hasEventData = this.data.parsed && 
                          this.data.parsed.metadata && 
                          this.data.parsed.timeSeries && 
                          this.data.parsed.timeSeries.length > 1000;
      
      if (hasEventData) {
        // 检查是否为今日数据
        const isToday = this.isEventToday();
        if (!isToday) {
          console.warn('⚠️ 地震事件數據不是今日，不顯示');
          // 返回空数据
          const labels = this.generateTimeLabels();
          const values = new Array(24).fill(0);
          return {
            labels: labels,
            datasets: [{
              label: '加速度 (gal)',
              data: values,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: false,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2
            }]
          };
        }
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
      
      
      return {
        labels: labels,
        datasets: [{
          label: '加速度 (gal)',
          data: values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2
        }]
      };
    },
    prepareEventChartData() {
      // 地震事件模式：顯示波形數據
      const metadata = this.data.parsed.metadata;
      const timeSeries = this.data.parsed.timeSeries;
      
      // 降采样：从24000个点降到120个点（每秒1个点）
      const sampledData = [];
      const samplesPerSecond = metadata.sampleRate; // 200
      for (let i = 0; i < timeSeries.length; i += samplesPerSecond) {
        // 取这一秒内的最大absAcceleration
        let maxAcc = 0;
        for (let j = i; j < Math.min(i + samplesPerSecond, timeSeries.length); j++) {
          const acc = timeSeries[j].absAcceleration || 0;
          if (acc > maxAcc) maxAcc = acc;
        }
        sampledData.push({
          time: Math.floor(timeSeries[i].time),
          value: maxAcc
        });
      }
      
      
      const labels = sampledData.map(d => `${d.time}s`);
      const values = sampledData.map(d => d.value);
      
      return {
        labels: labels,
        datasets: [{
          label: `PGA (gal) - ${metadata.stationCode}`,
          data: values,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.1,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 1.5
        }]
      };
    },
    async updateChart() {
      // 確保先銷毀現有的圖表實例
      if (this.chart) {
        try {
          this.chart.destroy();
        } catch (e) {
          console.warn('銷毀圖表時出錯:', e);
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
  min-height: 220px;
  height: 100%;
  width: 100%;
}
</style>

