<template>
  <div class="microseismic-chart w-full h-full p-2">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!data" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <p class="text-sm">暫無數據</p>
      </div>
    </div>
    
    <canvas v-else ref="chartCanvas" class="w-full h-full"></canvas>
  </div>
</template>

<script>
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
      type: String,
      default: null
    }
  },
  data() {
    return {
      chart: null,
      updateTimer: null
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
        console.warn('銷毀圖表時出錯:', e);
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
      // 固定生成當日00:00到23:59的標籤（每小時一個點）
      const labels = [];
      for (let hour = 0; hour < 24; hour++) {
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
        
        // 使用散點圖（scatter）來顯示不同類型的事件
        this.chart = new Chart(this.$refs.chartCanvas, {
          type: 'scatter',
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
                text: `微地動監測數據 - ${this.getCurrentDateTitle()}`,
                font: {
                  size: 14,
                  weight: 'bold'
                },
                padding: {
                  bottom: 10
                }
              },
              tooltip: {
                mode: 'point',
                intersect: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 10,
                titleFont: {
                  size: 12
                },
                bodyFont: {
                  size: 11
                },
                callbacks: {
                  title: function(context) {
                    const point = context[0];
                    const hour = Math.floor(point.parsed.x);
                    const minute = Math.round((point.parsed.x - hour) * 60);
                    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                  },
                  label: function(context) {
                    const typeMap = {
                      1: 'TYPE I',
                      2: 'TYPE II',
                      3: 'TYPE III',
                      4: 'TYPE NOISE',
                      5: 'TYPE EARTHQUAKE'
                    };
                    return `類型: ${typeMap[context.parsed.y] || ''}`;
                  }
                }
              }
            },
            clip: false,
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
                display: true,
                title: {
                  display: true,
                  text: '時間 (小時)',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                },
                min: 0,
                max: 24,
                ticks: {
                  font: {
                    size: 10
                  },
                  stepSize: 2,
                  callback: function(value) {
                    const hour = Math.floor(value);
                    return `${String(hour).padStart(2, '0')}:00`;
                  }
                },
                grid: {
                  display: true,
                  color: 'rgba(0, 0, 0, 0.05)'
                }
              },
              y: {
                type: 'linear',
                display: true,
                title: {
                  display: true,
                  text: '事件類型',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                },
                min: 0.5,
                max: 5.5,
                ticks: {
                  font: {
                    size: 10
                  },
                  stepSize: 1,
                  callback: function(value) {
                    const typeMap = {
                      1: 'TYPE I',
                      2: 'TYPE II',
                      3: 'TYPE III',
                      4: 'TYPE NOISE',
                      5: 'TYPE EARTHQUAKE'
                    };
                    return typeMap[value] || '';
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
        'TYPE EARTHQUAKE': 5
      };
      
      // 定义颜色映射
      const colorMap = {
        'TYPE I': { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.6)' },
        'TYPE II': { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.6)' },
        'TYPE III': { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.6)' },
        'TYPE NOISE': { border: '#9ca3af', bg: 'rgba(156, 163, 175, 0.6)' }, // 灰色
        'TYPE EARTHQUAKE': { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.6)' } // 紫色
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
        'TYPE EARTHQUAKE': []
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
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2
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
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2
      }));
      
      return {
        labels: labels,
        datasets: datasets
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
.microseismic-chart {
  min-height: 220px;
  height: 100%;
  width: 100%;
}
</style>

