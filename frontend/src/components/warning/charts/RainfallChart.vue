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

    <!-- 圖表 + 可拖曳 handle -->
    <div v-else ref="chartWrapper" class="relative w-full h-full">
      <canvas ref="chartCanvas" class="w-full h-full"></canvas>

      <!-- 右側拖曳 handle（閾值線由 Chart.js dataset 畫） -->
      <template v-if="chart && chartReady">
        <!-- 黃色 handle -->
        <div class="th-handle th-handle--yellow"
             :style="handlePositions.yellow"
             @mousedown.prevent="startDrag('yellow', $event)"
             title="拖曳調整黃色警戒值">
          <span class="th-handle__label">{{ localThresholds.yellow }}<small>mm</small></span>
        </div>
        <!-- 紅色 handle -->
        <div class="th-handle th-handle--red"
             :style="handlePositions.red"
             @mousedown.prevent="startDrag('red', $event)"
             title="拖曳調整紅色警戒值">
          <span class="th-handle__label">{{ localThresholds.red }}<small>mm</small></span>
        </div>
      </template>

      <!-- 拖曳預覽線（純 CSS，拖曳中不觸發 chart.update） -->
      <div v-if="dragging" class="th-drag-line"
           :class="dragging === 'red' ? 'th-drag-line--red' : 'th-drag-line--yellow'"
           :style="{ top: dragLineY + 'px', left: chartAreaLeft + 'px', right: '4px' }">
        <span class="th-drag-line__label">{{ dragValue }} mm</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RainfallChart',
  emits: ['threshold-change'],
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
      chart: null,
      currentDate: today,
      maxDate: today,
      loadingData: false,
      chartData: null,
      // threshold drag state
      localThresholds: { yellow: 20, red: 40 },
      chartReady: false,
      dragging: null,       // 'yellow' | 'red' | null
      dragValue: 0,
      dragLineY: 0,
      chartAreaLeft: 0,
      handlePositions: {
        yellow: { display: 'none' },
        red:    { display: 'none' },
      },
    };
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
  },
  watch: {
    thresholds: {
      immediate: true,
      deep: true,
      handler(v) { this.localThresholds = { ...v }; },
    },
    selectedDate(newVal) {
      if (newVal && newVal !== this.currentDate) {
        this.currentDate = newVal;
        if (this.regionCode) {
          this.loadDataForDate(this.currentDate);
        } else {
          this.$nextTick(() => this.updateChart());
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
    if (this.selectedDate) this.currentDate = this.selectedDate;
    if (this.regionCode) {
      this.loadDataForDate(this.currentDate);
    } else if (this.data && !this.loading) {
      this.createChart();
    }
  },
  beforeUnmount() {
    if (this.chart) this.chart.destroy();
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup',   this.stopDrag);
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
        const { applyChartDefaults, baseChartOptions, axisScale } = await import('@/utils/chartDefaults.js');
        Chart.register(...registerables);
        applyChartDefaults(Chart);

        const chartData = this.prepareChartData();
        const suggestedMaxValue = chartData.suggestedMax || 1;
        const dark = this.isDarkMode;
        const base = baseChartOptions(dark);

        this.chartReady = false;
        this.chart = new Chart(this.$refs.chartCanvas, {
          type: 'bar',
          data: chartData,
          options: {
            ...base,
            clip: false,
            interaction: { intersect: false, mode: 'index' },
            elements: {
              line: { tension: 0.35, borderWidth: 1.5 },
              bar:  { borderRadius: 2, borderWidth: 0, minBarLength: 2 }
            },
            plugins: {
              ...base.plugins,
              tooltip: {
                ...base.plugins.tooltip,
                mode: 'index',
                intersect: false,
                callbacks: {
                  label(context) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    const value = context.parsed.y || 0;
                    return value === 0 && context.dataset.label === '時雨量 (mm)'
                      ? label + '無雨量'
                      : label + value.toFixed(2) + ' mm';
                  }
                }
              }
            },
            scales: {
              x: {
                ...axisScale('x', '', dark),
                ticks: {
                  ...axisScale('x', '', dark).ticks,
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              y: {
                ...axisScale('y', 'mm', dark),
                beginAtZero: true,
                suggestedMin: 0,
                suggestedMax: suggestedMaxValue,
                grace: '5%',
                ticks: {
                  ...axisScale('y', 'mm', dark).ticks,
                  stepSize: suggestedMaxValue <= 1 ? 0.1 : (suggestedMaxValue <= 10 ? 1 : 5)
                }
              }
            }
          }
        });
        // 等圖表渲染完成，再計算 handle 位置
        this.$nextTick(() => {
          this.chartAreaLeft = this.chart?.chartArea?.left ?? 0;
          this.updateHandlePositions();
          this.chartReady = true;
        });
      } catch (error) {
        console.error('創建圖表失敗:', error);
      }
    },

    // ── handle 位置計算（明確呼叫，不依賴 computed）──
    updateHandlePositions() {
      if (!this.chart?.scales?.y || !this.chart.chartArea) return;
      const scale = this.chart.scales.y;
      const right = this.chart.chartArea.right;
      ['yellow', 'red'].forEach(type => {
        const raw = scale.getPixelForValue(this.localThresholds[type]);
        const yPx = Math.max(this.chart.chartArea.top, Math.min(this.chart.chartArea.bottom, raw));
        this.handlePositions[type] = { top: `${yPx}px`, left: `${right}px` };
      });
    },

    // ── 閾值線拖曳 ──
    startDrag(type, e) {
      this.dragging  = type;
      this.dragValue = this.localThresholds[type];
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup',   this.stopDrag);
    },
    onDrag(e) {
      if (!this.dragging || !this.chart?.scales?.y || !this.chart.chartArea || !this.$refs.chartCanvas) return;
      const rect    = this.$refs.chartCanvas.getBoundingClientRect();
      const cssY    = e.clientY - rect.top;
      const scale   = this.chart.scales.y;
      const area    = this.chart.chartArea;
      const clamped = Math.max(area.top, Math.min(area.bottom, cssY));
      const val     = Math.max(0, Math.round(scale.getValueForPixel(clamped)));

      const updated = { ...this.localThresholds };
      if (this.dragging === 'yellow') {
        updated.yellow = Math.min(val, updated.red - 1);
      } else {
        updated.red = Math.max(val, updated.yellow + 1);
      }
      this.localThresholds = updated;
      this.dragValue = updated[this.dragging];

      const dragYPx = Math.max(area.top, Math.min(area.bottom, scale.getPixelForValue(this.dragValue)));
      this.handlePositions[this.dragging] = { top: `${dragYPx}px`, left: `${area.right}px` };
      this.dragLineY = dragYPx;
    },
    async stopDrag() {
      if (!this.dragging) return;
      this.dragging = null;
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup',   this.stopDrag);
      await this.updateChart();
      this.$emit('threshold-change', { ...this.localThresholds });
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
      
      // Y 軸最大值需涵蓋閾值，確保線永遠可見
      const thresholdMax = Math.max(this.localThresholds.red, this.localThresholds.yellow);
      let suggestedMax = Math.max(
        maxValue > 0 ? maxValue * 1.5 : 1,
        thresholdMax * 1.2
      );

      // 時雨量 0 值不顯示柱子
      const hourlyValuesForDisplay = hourlyValues.map(v => v > 0 ? v : null);
      // 閾值線資料（填滿所有 label 位置）
      const yellowData = labels.map(() => this.localThresholds.yellow);
      const redData    = labels.map(() => this.localThresholds.red);

      return {
        labels,
        datasets: [
          {
            label: '時雨量 (mm)',
            data: hourlyValuesForDisplay,
            backgroundColor: 'rgba(71,160,255,0.55)',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 2,
            barThickness: 'flex',
            maxBarThickness: 40,
            order: 2,
            yAxisID: 'y',
            skipNull: true,
          },
          {
            label: '累積雨量 (mm)',
            data: accumulatedValues,
            type: 'line',
            borderColor: '#1e5c8a',
            backgroundColor: 'rgba(30,92,138,0.08)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: '#1e5c8a',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            order: 1,
            yAxisID: 'y',
            spanGaps: false,
          },
          // 黃色警戒線
          {
            label: '黃色警戒',
            data: yellowData,
            type: 'line',
            borderColor: 'rgba(245,158,11,0.85)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            order: 0,
            yAxisID: 'y',
          },
          // 紅色警戒線
          {
            label: '紅色警戒',
            data: redData,
            type: 'line',
            borderColor: 'rgba(239,68,68,0.85)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
            order: 0,
            yAxisID: 'y',
          },
        ],
        suggestedMax,
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

/* 拖曳 handle（右側小方塊） */
.th-handle {
  position: absolute;
  transform: translate(2px, -50%);
  width: 44px;
  height: 20px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ns-resize;
  user-select: none;
  z-index: 15;
  font-size: 10px;
  font-weight: 700;
  transition: opacity 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.th-handle:hover, .th-handle:active {
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  opacity: 1 !important;
}
.th-handle--yellow {
  background: rgba(245,158,11,0.92);
  color: #78350f;
  opacity: 0.85;
}
.th-handle--red {
  background: rgba(239,68,68,0.92);
  color: #fff;
  opacity: 0.85;
}
.th-handle__label small {
  font-size: 8px;
  font-weight: 400;
  margin-left: 1px;
}

/* 拖曳預覽線 */
.th-drag-line {
  position: absolute;
  height: 2px;
  pointer-events: none;
  z-index: 20;
  display: flex;
  align-items: flex-start;
}
.th-drag-line--red    { background: rgba(239,68,68,0.9); }
.th-drag-line--yellow { background: rgba(245,158,11,0.9); }
.th-drag-line__label {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.th-drag-line--red .th-drag-line__label    { background: rgba(239,68,68,0.9);  color: #fff; }
.th-drag-line--yellow .th-drag-line__label { background: rgba(245,158,11,0.9); color: #78350f; }
</style>

