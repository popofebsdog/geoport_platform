<template>
  <div class="rainfall-chart w-full h-full p-2">
    <div v-if="loading || loadingData" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">載入中...</p>
      </div>
    </div>
    <div v-else-if="!data && !chartData" class="flex items-center justify-center h-full">
      <div class="text-center" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">
        <svg class="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
        </svg>
        <p class="text-xs">暫無數據</p>
      </div>
    </div>

    <!-- 圖表 -->
    <div v-else class="relative w-full h-full">
      <apexchart
        class="rainfall-apex"
        type="line"
        height="100%"
        :options="apexChartOptions"
        :series="apexChartSeries"
      />
      <div v-if="chartReady && !hasRainSignal" class="chart-empty-state"
           :class="isDarkMode ? 'chart-empty-state--dark' : 'chart-empty-state--light'">
        <span>目前無雨量</span>
        <small>警戒線持續監測中</small>
      </div>
    </div>
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts';

export default {
  name: 'RainfallChart',
  components: {
    apexchart: VueApexCharts,
  },
  props: {
    data:         { type: Object,  default: null },
    loading:      { type: Boolean, default: false },
    regionCode:   { type: String,  default: '' },
    regionId:     { type: [String, Number], default: null },
    isDarkMode:   { type: Boolean, default: false },
    selectedDate: { type: String,  default: null },
    thresholds:   { type: Object,  default: () => ({ yellow: 20, red: 40 }) },
  },
  data() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {
      currentDate: today,
      maxDate: today,
      loadingData: false,
      chartData: null,
      localThresholds: { yellow: 20, red: 40 },
      chartReady: false,
      hasRainSignal: true,
    };
  },
  watch: {
    thresholds: {
      immediate: true,
      deep: true,
      handler(v) {
        this.localThresholds = { ...v };
        this.markChartReady();
      },
    },
    selectedDate(newVal) {
      if (newVal && newVal !== this.currentDate) {
        this.currentDate = newVal;
        if (this.regionCode) {
          this.loadDataForDate(this.currentDate);
        } else {
          this.markChartReady();
        }
      }
    },
    isDarkMode() {
      this.markChartReady();
    },
    data: {
      deep: true,
      handler() {
        this.markChartReady();
      }
    },
    loading(newVal) {
      if (!newVal) {
        this.markChartReady();
      }
    }
  },
  computed: {
    isToday() {
      const d = new Date();
      const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return this.currentDate === local;
    },
    currentTime() {
      return new Date();
    },
    rainfallModel() {
      return this.prepareChartData();
    },
    apexChartSeries() {
      return [
        {
          name: '時雨量 (mm)',
          type: 'column',
          data: this.rainfallModel.hourlyValuesForDisplay,
        },
        {
          name: '累積雨量 (mm)',
          type: 'area',
          data: this.rainfallModel.accumulatedValues,
        },
      ];
    },
    apexChartOptions() {
      return this.buildApexOptions(this.rainfallModel);
    },
  },
  mounted() {
    if (this.selectedDate) this.currentDate = this.selectedDate;
    if (this.regionCode) {
      this.loadDataForDate(this.currentDate);
    } else if (this.data && !this.loading) {
      this.markChartReady();
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
        labels.push(`${String(hour).padStart(2, '0')}:00`);
      }
      
      return labels;
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
        } else {
          console.warn('雨量API返回失敗:', response.data);
          this.chartData = null;
        }
      } catch (error) {
        console.error('載入雨量數據失敗:', error);
        this.chartData = null;
      } finally {
        this.loadingData = false;
        await this.$nextTick();
        this.markChartReady();
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
      const date = new Date(this.currentDate + 'T00:00:00');
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
      
      const selectedDateStr = this.currentDate; // YYYY-MM-DD
      
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
          labels,
          hourlyValuesForDisplay: hourlyValues,
          accumulatedValues,
          suggestedMax: Math.max(this.localThresholds.red, 1) * 1.2,
          showThresholdLines: true,
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
      this.hasRainSignal = maxValue >= 0.1;
      
      // 有雨量時優先放大資料本身；沒有雨量時才用警戒線當尺度。
      const thresholdMax = Math.max(this.localThresholds.red, this.localThresholds.yellow);
      const suggestedMax = maxValue > 0
        ? Math.max(maxValue * 1.5, 1)
        : thresholdMax * 1.2;
      const showThresholdLines = maxValue === 0 || thresholdMax <= suggestedMax;

      // 時雨量 0 值不顯示柱子
      const hourlyValuesForDisplay = hourlyValues.map(v => v > 0 ? v : null);

      return {
        labels,
        hourlyValuesForDisplay,
        accumulatedValues,
        suggestedMax,
        showThresholdLines,
      };
    },
    buildApexOptions(model) {
      const dark = this.isDarkMode;
      const labelColor = dark ? '#94a3b8' : '#64748b';
      const gridColor = dark ? 'rgba(148,163,184,0.14)' : 'rgba(30,92,138,0.12)';
      const thresholdAnnotations = model.showThresholdLines
        ? [
            {
              y: this.localThresholds.yellow,
              borderColor: '#f59e0b',
              strokeDashArray: 5,
              label: {
                text: `黃 ${this.localThresholds.yellow} mm`,
                borderColor: '#f59e0b',
                style: {
                  background: '#f59e0b',
                  color: '#78350f',
                  fontSize: '10px',
                  fontWeight: 800,
                },
              },
            },
            {
              y: this.localThresholds.red,
              borderColor: '#ef4444',
              strokeDashArray: 5,
              label: {
                text: `紅 ${this.localThresholds.red} mm`,
                borderColor: '#ef4444',
                style: {
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                },
              },
            },
          ]
        : [];

      return {
        chart: {
          id: 'rainfall-trend',
          type: 'line',
          stacked: false,
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { enabled: true, easing: 'easeinout', speed: 320 },
          foreColor: labelColor,
          background: 'transparent',
        },
        annotations: {
          yaxis: thresholdAnnotations,
        },
        colors: [dark ? '#22d3ee' : '#0ea5e9', dark ? '#a3e635' : '#0f766e'],
        dataLabels: { enabled: false },
        fill: {
          type: ['solid', 'gradient'],
          opacity: [0.72, 0.18],
          gradient: {
            shadeIntensity: 0.2,
            opacityFrom: 0.28,
            opacityTo: 0.02,
          },
        },
        grid: {
          borderColor: gridColor,
          strokeDashArray: 3,
          padding: { top: 4, right: 8, bottom: 0, left: 4 },
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '11px',
          labels: { colors: labelColor },
          markers: { size: 6 },
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: '58%',
          },
        },
        stroke: {
          width: [0, 2.4],
          curve: 'smooth',
        },
        markers: {
          size: 0,
          hover: { size: 4 },
        },
        tooltip: {
          shared: true,
          intersect: false,
          theme: dark ? 'dark' : 'light',
          y: {
            formatter(value) {
              if (value === null || value === undefined) return '無雨量';
              return `${Number(value).toFixed(2)} mm`;
            },
          },
        },
        xaxis: {
          categories: model.labels,
          tickAmount: Math.min(model.labels.length, 8),
          labels: {
            rotate: -35,
            style: { colors: labelColor, fontSize: '10px', fontWeight: 700 },
          },
          axisBorder: { color: gridColor },
          axisTicks: { color: gridColor },
        },
        yaxis: {
          min: 0,
          max: Math.max(model.suggestedMax || 1, 1),
          tickAmount: 4,
          title: {
            text: 'mm',
            style: { color: labelColor, fontSize: '10px', fontWeight: 700 },
          },
          labels: {
            style: { colors: labelColor, fontSize: '10px', fontWeight: 700 },
            formatter(value) {
              return Number(value).toFixed(value <= 1 ? 1 : 0);
            },
          },
        },
      };
    },
    markChartReady() {
      this.chartReady = false;
      this.$nextTick(() => {
        this.chartReady = true;
      });
    },
  }
};
</script>

<style scoped>
.rainfall-chart {
  min-height: 220px;
  height: 100%;
  width: 100%;
}

.chart-empty-state {
  position: absolute;
  inset: 54px 18px 24px 52px;
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
