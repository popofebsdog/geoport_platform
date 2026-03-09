<template>
  <div class="rainfall-chart w-full h-full p-2 flex flex-col">
    <!-- 日期選擇器 -->
    <div class="mb-2 flex items-center justify-between">
      <label class="text-xs text-gray-600 dark:text-gray-400 mr-2">選擇日期：</label>
      <div class="flex items-center gap-2">
        <button
          @click="selectPreviousDay"
          class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="前一天"
        >
          ←
        </button>
        <input
          type="date"
          v-model="selectedDate"
          @change="onDateChange"
          class="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          :max="maxDate"
        />
        <button
          @click="selectNextDay"
          :disabled="isToday"
          class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="後一天"
        >
          →
        </button>
        <button
          @click="selectToday"
          :disabled="isToday"
          class="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="今天"
        >
          今天
        </button>
      </div>
    </div>
    
    <div v-if="loading || loadingData" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!data" class="flex items-center justify-center flex-1">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
        </svg>
        <p class="text-sm">暫無數據</p>
      </div>
    </div>
    
    <canvas v-else-if="chartData || data" ref="chartCanvas" class="w-full flex-1"></canvas>
  </div>
</template>

<script>
export default {
  name: 'RainfallChart',
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
      default: ''
    },
    regionId: {
      type: String,
      default: null
    }
  },
  data() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return {
      chart: null,
      selectedDate: todayStr, // 預設為今天
      maxDate: todayStr, // 不能選擇未來的日期
      loadingData: false, // 本地載入狀態
      chartData: null // 本地數據緩存
    };
  },
  computed: {
    isToday() {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      return this.selectedDate === todayStr;
    },
    selectedDateObj() {
      return new Date(this.selectedDate + 'T00:00:00');
    },
    currentTime() {
      return new Date();
    }
  },
  watch: {
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
    if (this.data) {
      const hasRain = this.data.time_series?.some(item => (parseFloat(item.hourly) || 0) > 0);
    }
    
    // 如果沒有regionCode，使用props傳入的data
    // 如果有regionCode，載入今天的數據
    if (this.regionCode) {
      this.loadDataForDate(this.selectedDate);
    } else if (this.data && !this.loading) {
      this.createChart();
    } else {
      console.warn('[RainfallChart] 沒有regionCode也沒有data，無法顯示圖表');
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
      // 根據選擇的日期生成標籤
      // 如果是今天，只顯示到當前時間
      // 如果是過去的日期，顯示完整24小時
      const labels = [];
      let maxHour = 23;
      
      if (this.isToday) {
        // 今天是當前日期，只顯示到當前小時
        maxHour = this.currentTime.getHours();
      }
      
      for (let hour = 0; hour <= maxHour; hour++) {
        const timeStr = `${String(hour).padStart(2, '0')}:00:00`;
        labels.push(timeStr);
      }
      
      return labels;
    },
    selectPreviousDay() {
      const date = new Date(this.selectedDate);
      date.setDate(date.getDate() - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.selectedDate = `${year}-${month}-${day}`;
      this.onDateChange();
    },
    selectNextDay() {
      if (this.isToday) return;
      const date = new Date(this.selectedDate);
      date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const nextDateStr = `${year}-${month}-${day}`;
      const todayStr = new Date().toISOString().split('T')[0];
      if (nextDateStr <= todayStr) {
        this.selectedDate = nextDateStr;
        this.onDateChange();
      }
    },
    selectToday() {
      const today = new Date();
      this.selectedDate = today.toISOString().split('T')[0];
      this.onDateChange();
    },
    async onDateChange() {
      // 當日期改變時，重新載入數據
      if (this.regionCode) {
        await this.loadDataForDate(this.selectedDate);
      } else {
        // 如果沒有regionCode，使用現有數據過濾
        this.$nextTick(() => {
          this.updateChart();
        });
      }
    },
    async loadDataForDate(dateStr) {
      if (!this.regionCode) return;
      
      this.loadingData = true;
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`/api/warning-regions/${this.regionCode}/data`, {
          params: { 
            dataType: 'chart2', 
            useExternalApi: 'true',
            date: dateStr // 傳遞日期參數
          }
        });
        
        
        if (response.data.success && response.data.source === 'external_api') {
          this.chartData = response.data.data;
          this.$nextTick(() => {
            this.updateChart();
          });
        } else {
          console.warn('雨量API返回失敗:', response.data);
          this.chartData = null;
        }
      } catch (error) {
        console.error('載入雨量數據失敗:', error);
        this.chartData = null;
      } finally {
        this.loadingData = false;
      }
    },
    // 將時間字符串轉換為小時索引（0-23）
    getHourIndex(timeStr) {
      if (!timeStr) return -1;
      try {
        // 嘗試解析各種時間格式
        // 格式1: ISO格式 (2025-11-17T00:00:00)
        // 格式2: timeHr格式 (0.000000, 0.083333等，表示小時)
        let date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.getHours();
        }
        
        // 嘗試解析 timeHr 格式：0.000000, 0.083333等（表示小時的小數）
        const timeHrMatch = timeStr.match(/^(\d+)\.?\d*$/);
        if (timeHrMatch) {
          const hour = Math.floor(parseFloat(timeStr));
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
      const date = new Date(this.selectedDate + 'T00:00:00');
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    },
    // 檢查數據是否屬於選定的日期
    isDataInSelectedDate(item) {
      if (!item.datetime && !item.time && !item.timestamp) return false;
      
      const dataTimeStr = item.datetime || item.time || item.timestamp;
      let dataDate;
      
      try {
        dataDate = new Date(dataTimeStr);
        if (isNaN(dataDate.getTime())) {
          // 嘗試解析其他格式
          return false;
        }
      } catch (e) {
        return false;
      }
      
      const selectedDateStr = this.selectedDate; // YYYY-MM-DD
      
      // 使用本地时间而不是UTC时间，避免时区问题
      const year = dataDate.getFullYear();
      const month = String(dataDate.getMonth() + 1).padStart(2, '0');
      const day = String(dataDate.getDate()).padStart(2, '0');
      const dataDateStr = `${year}-${month}-${day}`;
      
      const isMatch = dataDateStr === selectedDateStr;
      
      // 调试：如果不匹配且有雨量，输出详细信息
      if (!isMatch && (item.hourly > 0 || item.accumulated > 0)) {
        console.warn(`⚠️ 日期不匹配: dataTimeStr=${dataTimeStr}, 解析後=${dataDateStr}, 期望=${selectedDateStr}`);
      }
      
      return isMatch;
    },
    async createChart() {
      // 檢查是否有數據（優先使用chartData，其次使用data）
      const hasData = this.chartData || this.data;
      if (!this.$refs.chartCanvas || !hasData) {
        return;
      }
      
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
        const suggestedMaxValue = chartData.suggestedMax || 1;
        
        this.chart = new Chart(this.$refs.chartCanvas, {
          type: 'bar',
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
                display: false
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
                },
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    const value = context.parsed.y || 0;
                    // 如果是0值且是時雨量，标注为"無雨量"
                    if (value === 0 && context.dataset.label === '時雨量 (mm)') {
                      label += '無雨量';
                    } else {
                      label += value.toFixed(2) + ' mm';
                    }
                    return label;
                  }
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
              },
              bar: {
                borderRadius: 4,
                borderWidth: 2,
                minBarLength: 2
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
                  text: '雨量 (mm)',
                  font: {
                    size: 12,
                    weight: 'bold'
                  }
                },
                ticks: {
                  font: {
                    size: 10
                  },
                  stepSize: suggestedMaxValue <= 1 ? 0.1 : (suggestedMaxValue <= 10 ? 1 : 5)
                },
                beginAtZero: true,
                suggestedMin: 0,
                suggestedMax: suggestedMaxValue,
                grace: '5%',
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
      // 優先使用本地載入的數據（chartData），其次使用props傳入的數據（data）
      const dataSource = this.chartData || this.data;
      
      if (dataSource) {
        if (dataSource.time_series) {
          const rainData = dataSource.time_series.filter(item => (parseFloat(item.hourly) || 0) > 0);
          if (rainData.length > 0) {
          }
        }
      }
      
      // 根據選擇的日期生成標籤
      const labels = this.generateTimeLabels();
      const maxHour = this.isToday ? this.currentTime.getHours() : 23;
      
      // 初始化數組，長度為 maxHour + 1
      // 時雨量數組（存儲該小時內的最大hourly值）
      const hourlyValues = new Array(maxHour + 1).fill(0);
      // 累積雨量數組（存儲該小時的最終accumulated值）
      const accumulatedValues = new Array(maxHour + 1).fill(0);
      
      if (!dataSource) {
        console.warn('雨量數據為空');
        return {
          labels: labels,
          datasets: [
            {
              label: '時雨量 (mm)',
              data: hourlyValues,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: '#3b82f6',
              borderWidth: 2,
              borderRadius: 4,
              order: 2
            },
            {
              label: '累積雨量 (mm)',
              data: accumulatedValues,
              type: 'line',
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              order: 1
            }
          ]
        };
      }
      
      // 情況1: 時間序列數組（優先使用時雨量顯示）
      if (Array.isArray(dataSource.time_series) && dataSource.time_series.length > 0) {
        
        // 過濾出選定日期的數據
        const filteredTimeSeries = dataSource.time_series.filter(item => {
          return this.isDataInSelectedDate(item);
        });
        
        
        filteredTimeSeries.forEach((item, idx) => {
          // 優先使用datetime字段（ISO格式），其次使用time字段
          const timeStr = item.datetime || item.time || item.timestamp || item.date || item.timeHr;
          const hourIndex = this.getHourIndex(timeStr);
          
          // 優先使用hourly字段（時雨量）
          const hourlyValue = parseFloat(item.hourly || item.rain || item.rainfall || 0);
          // 累積雨量
          const accumulatedValue = parseFloat(item.accumulated || 0);
          
          // 如果有雨量，输出详细调试信息
          if (hourlyValue > 0 || accumulatedValue > 0) {
          }
          
          // 如果是今天，只處理到當前小時
          if (this.isToday && hourIndex > maxHour) {
            return;
          }
          
          if (hourIndex >= 0 && hourIndex <= maxHour) {
            // 時雨量取該小時內的最大值（因為hourly字段代表該時刻的小時雨量）
            if (hourlyValue > hourlyValues[hourIndex]) {
              hourlyValues[hourIndex] = hourlyValue;
            }
            // 累積雨量取該小時內的最大值（最新值）
            if (accumulatedValue > accumulatedValues[hourIndex]) {
              accumulatedValues[hourIndex] = accumulatedValue;
            }
            if (idx < 10 || hourlyValue > 0) {
            }
          } else {
            if (hourlyValue > 0 || idx < 5) {
              console.warn(`❌ 無法處理 [${idx}]: timeStr=${timeStr}, hourIndex=${hourIndex}, maxHour=${maxHour}`);
            }
          }
        });
      }
      // 情況1b: 如果有hourly_values數組（時雨量專用）
      else if (Array.isArray(dataSource.hourly_values) && dataSource.hourly_values.length > 0) {
        // 如果hourly_values是按順序對應00:00-23:59
        dataSource.hourly_values.forEach((val, index) => {
          if (index <= maxHour) {
            hourlyValues[index] = parseFloat(val || 0);
          }
        });
      }
      // 情況2: 分離的labels和values數組
      else if (Array.isArray(dataSource.labels) && Array.isArray(dataSource.values)) {
        dataSource.labels.forEach((label, index) => {
          const hourIndex = this.getHourIndex(label);
          if (hourIndex >= 0 && hourIndex <= maxHour && index < dataSource.values.length) {
            const value = parseFloat(dataSource.values[index] || 0);
            // 取最大值而不是累加
            if (value > hourlyValues[hourIndex]) {
              hourlyValues[hourIndex] = value;
            }
          }
        });
      }
      // 情況3: 只有values數組（按順序對應00:00-23:59）
      else if (Array.isArray(dataSource.values)) {
        dataSource.values.forEach((val, index) => {
          if (index <= maxHour) {
            hourlyValues[index] = parseFloat(val || 0);
          }
        });
      }
      // 情況4: 單一數值，顯示在當前小時
      else if (dataSource.rainfall !== undefined || dataSource.value !== undefined || dataSource.hourly !== undefined) {
        const hourlyValue = parseFloat(dataSource.hourly || dataSource.rainfall || dataSource.value || 0);
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour <= maxHour) {
          hourlyValues[currentHour] = hourlyValue;
        }
      }
      // 情況5: 嘗試從data_content中解析
      else if (typeof dataSource === 'object') {
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
        
        const timeSeries = findTimeSeries(dataSource);
        if (timeSeries) {
          timeSeries.forEach(item => {
            const timeStr = item.time || item.timestamp || item.date;
            const hourIndex = this.getHourIndex(timeStr);
            if (hourIndex >= 0 && hourIndex <= maxHour) {
              const hourlyValue = parseFloat(item.hourly || item.rainfall || item.value || item.data || 0);
              const accumulatedValue = parseFloat(item.accumulated || 0);
              // 取最大值而不是累加
              if (hourlyValue > hourlyValues[hourIndex]) {
                hourlyValues[hourIndex] = hourlyValue;
              }
              if (accumulatedValue > accumulatedValues[hourIndex]) {
                accumulatedValues[hourIndex] = accumulatedValue;
              }
            }
          });
        }
      }
      
      // 重新计算累积雨量，确保与时雨量一致
      // 累积雨量 = 从00:00到当前小时的时雨量总和
      let currentAccumulated = 0;
      for (let i = 0; i <= maxHour; i++) {
        currentAccumulated += hourlyValues[i];
        accumulatedValues[i] = currentAccumulated;
      }
      
      
      // 找出有雨的小時
      const rainyHours = [];
      hourlyValues.forEach((val, idx) => {
        if (val > 0) {
          rainyHours.push(`${String(idx).padStart(2, '0')}:00 -> ${val.toFixed(2)}mm (累積: ${accumulatedValues[idx].toFixed(2)}mm)`);
        }
      });
      
      if (rainyHours.length === 0 && Math.max(...accumulatedValues) === 0) {
        console.warn('⚠️ 警告：沒有檢測到任何雨量數據！');
        console.warn('請檢查API數據和日期過濾邏輯');
      }
      
      // 计算Y轴的合理范围
      const maxHourly = Math.max(...hourlyValues, 0);
      const maxAccumulated = Math.max(...accumulatedValues, 0);
      const maxValue = Math.max(maxHourly, maxAccumulated);
      
      // 如果最大值很小，设置一个合理的显示范围
      let suggestedMax = maxValue > 0 ? Math.max(maxValue * 1.5, 1) : 1;
      
      // 将时雨量中的0值替换为null，这样不会显示柱子
      const hourlyValuesForDisplay = hourlyValues.map(v => v > 0 ? v : null);
      
      return {
        labels: labels,
        datasets: [
          {
            label: '時雨量 (mm)',
            data: hourlyValuesForDisplay,
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 4,
            barThickness: 'flex',
            maxBarThickness: 40,
            order: 2,
            yAxisID: 'y',
            // 确保0值不显示柱子，但保持数据集完整性
            skipNull: true
          },
          {
            label: '累積雨量 (mm)',
            data: accumulatedValues,
            type: 'line',
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            order: 1,
            yAxisID: 'y',
            // 确保所有点都显示，包括0值
            spanGaps: false
          }
        ],
        suggestedMax: suggestedMax
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
      
      // 檢查是否有數據（優先使用chartData，其次使用data）
      const hasData = this.chartData || this.data;
      if (hasData && !this.loading && !this.loadingData && this.$refs.chartCanvas) {
        await this.createChart();
      }
    }
  }
};
</script>

<style scoped>
.rainfall-chart {
  min-height: 220px;
  height: 100%;
  width: 100%;
}
</style>

