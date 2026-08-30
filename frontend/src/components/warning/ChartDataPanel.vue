<template>
  <div class="chart-data-panel" :class="`is-${variant}`">
    <div class="command-header" :class="isDarkMode ? 'is-dark' : ''">
      <div class="command-title">
        <span class="eyebrow">即時戰情</span>
        <strong>{{ regionName || '預警監測' }}</strong>
      </div>
      <div class="command-status">
        <span
          v-for="item in statusSummary"
          :key="item.key"
          class="status-pill"
          :class="[`is-${item.level}`, { 'is-dark': isDarkMode }]"
        >
          <span class="status-dot"></span>
          {{ item.label }} {{ item.text }}
        </span>
      </div>
    </div>

    <div class="command-grid">
      <section class="monitor-card" :class="isDarkMode ? 'is-dark' : ''">
        <div class="monitor-card-head">
          <span>微地動</span>
          <small>TYPE I / II / III</small>
        </div>
        <div class="monitor-card-body integrated-card chart-content">
          <div class="metric-board">
            <div
              v-for="metric in microseismicMetrics"
              :key="metric.label"
              class="metric-cell"
              :class="metric.tone ? `is-${metric.tone}` : ''"
            >
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small v-if="metric.unit">{{ metric.unit }}</small>
            </div>
          </div>
          <div class="trend-board">
          <MicroseismicChart 
            :key="`chart1-integrated-${regionId || regionCode}`"
            :data="chartData.chart1" 
            :loading="loading"
            :regionCode="regionCode"
            :regionId="regionId"
            :isDarkMode="isDarkMode"
          />
          </div>
        </div>
      </section>

      <section class="monitor-card is-primary" :class="isDarkMode ? 'is-dark' : ''">
        <div class="monitor-card-head">
          <div class="monitor-card-title">
            <span>雨量</span>
            <small>累積 / 時雨量</small>
          </div>
          <div class="threshold-inputs" :class="isDarkMode ? 'is-dark' : ''">
            <label>
              黃
              <input
                type="number"
                min="0"
                step="1"
                :value="rainfallThresholds.yellow"
                @input="setRainfallThreshold('yellow', $event.target.value)"
                aria-label="黃色警戒門檻"
              >
              <span>mm</span>
            </label>
            <label>
              紅
              <input
                type="number"
                min="0"
                step="1"
                :value="rainfallThresholds.red"
                @input="setRainfallThreshold('red', $event.target.value)"
                aria-label="紅色警戒門檻"
              >
              <span>mm</span>
            </label>
          </div>
        </div>
        <div class="monitor-card-body integrated-card chart-content">
          <div class="metric-board">
            <div
              v-for="metric in rainfallMetrics"
              :key="metric.label"
              class="metric-cell"
              :class="metric.tone ? `is-${metric.tone}` : ''"
            >
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small v-if="metric.unit">{{ metric.unit }}</small>
            </div>
          </div>
          <div class="trend-board">
          <RainfallChart
            :key="`chart2-integrated-${regionId || regionCode}`"
            :data="chartData.chart2"
            :loading="loading"
            :regionCode="regionCode"
            :regionId="regionId"
            :isDarkMode="isDarkMode"
            :selectedDate="rainfallDate"
            :thresholds="rainfallThresholds"
          />
          </div>
        </div>
      </section>

      <section class="monitor-card" :class="isDarkMode ? 'is-dark' : ''">
        <div class="monitor-card-head">
          <span>強地動</span>
          <small>PGA / 震度</small>
        </div>
        <div class="monitor-card-body integrated-card chart-content">
          <div v-if="!shouldShowStrongMotion" class="empty-monitor" :class="isDarkMode ? 'is-dark' : ''">
            <span>暫無數據</span>
            <small>此地區尚未啟用強地動監測</small>
          </div>
          <template v-else>
            <div class="metric-board">
              <div
                v-for="metric in strongMotionMetrics"
                :key="metric.label"
                class="metric-cell"
                :class="metric.tone ? `is-${metric.tone}` : ''"
              >
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
                <small v-if="metric.unit">{{ metric.unit }}</small>
              </div>
            </div>
            <div class="trend-board">
              <StrongMotionChart 
                :key="`chart3-integrated-${regionId || regionCode}`"
                :data="chartData.chart3" 
                :loading="loading"
                :regionCode="regionCode"
                :regionId="regionId"
                :isDarkMode="isDarkMode"
              />
            </div>
          </template>
        </div>
      </section>
      </div>
  </div>

</template>

<script>
import api from '@/services/api';
import MicroseismicChart from './charts/MicroseismicChart.vue';
import RainfallChart from './charts/RainfallChart.vue';
import StrongMotionChart from './charts/StrongMotionChart.vue';

export default {
  name: 'ChartDataPanel',
  components: {
    MicroseismicChart,
    RainfallChart,
    StrongMotionChart
  },
  inject: ['isDarkMode'],
  props: {
    variant: {
      type: String,
      default: 'full'
    },
    regionCode: {
      type: String,
      default: null
    },
    regionId: {
      type: [Number, String],
      default: null
    },
    regionName: {
      type: String,
      default: ''
    }
  },
  emits: ['status-summary-changed'],
  data() {
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
    return {
      chartData: {
        chart1: null,
        chart2: null,
        chart3: null
      },
      loading: false,
      refreshIntervals: {
        chart1: null,
        chart2: null,
        chart3: null
      },
      currentLoadRequestId: 0,
      // 雨量日期選擇
      rainfallDate: today,
      rainfallMaxDate: today,
      // 雨量警戒閾值（per region, persisted to localStorage）
      rainfallThresholds: { yellow: 20, red: 40 },
    };
  },
  computed: {
    shouldShowStrongMotion() {
      const name = this.regionName || ''
      return name.includes('臺7線') || name.includes('台7線') || 
             name.includes('台7') || name.includes('臺7')
    },
    rainfallIsToday() {
      const d = new Date();
      const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return this.rainfallDate === local;
    },
    statusSummary() {
      return [
        {
          key: 'microseismic',
          label: '微地動',
          ...this.resolveMicroseismicStatus(this.chartData.chart1)
        },
        {
          key: 'rainfall',
          label: '雨量',
          ...this.resolveRainfallStatus(this.chartData.chart2)
        },
        {
          key: 'strong-motion',
          label: '強地動',
          ...this.resolveStrongMotionStatus(this.chartData.chart3)
        }
      ];
    },
    microseismicMetrics() {
      const data = this.chartData.chart1;
      const rows = Array.isArray(data?.time_series) ? data.time_series : [];
      const counts = rows.reduce((acc, item) => {
        const type = item?.type || item?.Type || '';
        if (type === 'TYPE I') acc.typeI += 1;
        if (type === 'TYPE II') acc.typeII += 1;
        if (type === 'TYPE III') acc.typeIII += 1;
        return acc;
      }, { typeI: 0, typeII: 0, typeIII: 0 });

      return [
        { label: '總事件', value: counts.typeI + counts.typeII + counts.typeIII, unit: '件' },
        { label: 'TYPE II', value: counts.typeII, unit: '件', tone: counts.typeII > 0 ? 'medium' : '' },
        { label: 'TYPE III', value: counts.typeIII, unit: '件', tone: counts.typeIII > 0 ? 'high' : '' },
        { label: '最新', value: this.formatLatestTime(rows), unit: '' }
      ];
    },
    rainfallMetrics() {
      const data = this.chartData.chart2;
      const series = Array.isArray(data?.time_series) ? data.time_series : [];
      const last = series.length ? series[series.length - 1] : {};
      const hourlyValues = series
        .map(item => Number(item?.hourly ?? item?.rainfall ?? item?.value ?? 0))
        .filter(value => Number.isFinite(value));
      const accumulated = Number(
        last?.accumulated ??
        data?.accumulated ??
        data?.total_rainfall ??
        data?.accumulated_rainfall ??
        data?.total ??
        0
      );
      const hourly = Number(last?.hourly ?? last?.rainfall ?? last?.value ?? 0);
      const maxHourly = hourlyValues.length ? Math.max(...hourlyValues) : 0;
      const rainyHours = hourlyValues.filter(value => value > 0).length;
      const tone = accumulated >= this.rainfallThresholds.red
        ? 'high'
        : accumulated >= this.rainfallThresholds.yellow
          ? 'medium'
          : '';

      return [
        { label: '累積', value: this.formatNumber(accumulated), unit: 'mm', tone },
        { label: '時雨量', value: this.formatNumber(hourly), unit: 'mm' },
        { label: '最高', value: this.formatNumber(maxHourly), unit: 'mm' },
        { label: '有雨', value: rainyHours, unit: '時' }
      ];
    },
    strongMotionMetrics() {
      const data = this.chartData.chart3;
      const series = this.getStrongMotionSeries(data);
      const pgaValues = series
        .map(item => Number(item?.pga ?? item?.PGA ?? item?.acceleration ?? item?.absAcceleration ?? 0))
        .filter(value => Number.isFinite(value));
      const pgvValues = series
        .map(item => Number(item?.pgv ?? item?.PGV ?? 0))
        .filter(value => Number.isFinite(value));
      const maxPga = pgaValues.length ? Math.max(...pgaValues.map(Math.abs)) : 0;
      const maxPgv = pgvValues.length ? Math.max(...pgvValues.map(Math.abs)) : 0;
      const tone = maxPga >= 80 ? 'high' : maxPga >= 25 ? 'medium' : '';

      return [
        { label: 'PGA', value: this.formatNumber(maxPga), unit: 'gal', tone },
        { label: 'PGV', value: this.formatNumber(maxPgv), unit: 'cm/s' },
        { label: '震度', value: this.resolveIntensity(maxPga), unit: '' },
        { label: '資料點', value: series.length, unit: '筆' }
      ];
    }
  },
  watch: {
    // 統一監聽 regionId 的變化（優先使用 regionId）
    regionId: {
      immediate: true,
      handler(newVal, oldVal) {
        if (newVal) this.loadRainfallThresholds(newVal);
        
        // 當 regionId 改變時（包括從有到無），先清除舊數據和定時器
        if (oldVal !== newVal) {
          this.clearAllData();
        }
        
        // 只有當有新的 regionId 時才載入數據
        if (newVal) {
          // 使用 nextTick 確保清除操作完成後再載入新數據
          this.$nextTick(() => {
            this.loadChartData();
          });
        } else if (!this.regionCode) {
          // 如果沒有 regionId 也沒有 regionCode，確保清除所有數據
          this.clearAllData();
        }
        // 注意：如果 newVal 為空但有 regionCode，由 regionCode watcher 處理
      }
    },
    // 為了向後兼容，保留 regionCode 的監聽（僅在沒有 regionId 時使用）
    regionCode: {
      immediate: true,
      handler(newVal, oldVal) {
        
        // 如果有 regionId，則由 regionId 的 watcher 處理，這裡不重複處理
        if (this.regionId) {
          return;
        }
        
        // 當 regionCode 改變時，先清除舊數據和定時器
        if (oldVal !== newVal) {
          this.clearAllData();
        }
        
        // 只有當有新的 regionCode 時才載入數據
        if (newVal) {
          // 使用 nextTick 確保清除操作完成後再載入新數據
          this.$nextTick(() => {
            this.loadChartData();
          });
        } else {
          this.clearAllData();
        }
      }
    },
    statusSummary: {
      handler(newVal) {
        this.$emit('status-summary-changed', newVal);
      },
      deep: true,
      immediate: true
    }
  },
  methods: {
    resolveMicroseismicStatus(data) {
      if (this.loading && !data) return { level: 'unknown', text: '載入中' };
      if (!data) return { level: 'unknown', text: '無資料' };

      const rows = Array.isArray(data.time_series) ? data.time_series : [];
      const typeCounts = rows.reduce((counts, item) => {
        const type = item?.type || item?.Type || '';
        if (type === 'TYPE II') counts.typeII += 1;
        if (type === 'TYPE III') counts.typeIII += 1;
        return counts;
      }, { typeII: 0, typeIII: 0 });

      if (typeCounts.typeIII > 0) return { level: 'high', text: `${typeCounts.typeIII} 件 III` };
      if (typeCounts.typeII > 0) return { level: 'medium', text: `${typeCounts.typeII} 件 II` };
      return { level: 'normal', text: '正常' };
    },
    resolveRainfallStatus(data) {
      if (this.loading && !data) return { level: 'unknown', text: '載入中' };
      if (!data) return { level: 'unknown', text: '無資料' };

      const series = Array.isArray(data.time_series) ? data.time_series : [];
      const last = series.length ? series[series.length - 1] : null;
      const accumulated = Number(
        last?.accumulated ??
        data.accumulated ??
        data.total_rainfall ??
        data.accumulated_rainfall ??
        data.total ??
        0
      );

      if (accumulated >= this.rainfallThresholds.red) return { level: 'high', text: '紅色警戒' };
      if (accumulated >= this.rainfallThresholds.yellow) return { level: 'medium', text: '黃色警戒' };
      return { level: 'normal', text: '正常' };
    },
    resolveStrongMotionStatus(data) {
      if (!this.shouldShowStrongMotion) return { level: 'unknown', text: '未啟用' };
      if (this.loading && !data) return { level: 'unknown', text: '載入中' };
      if (!data) return { level: 'unknown', text: '無資料' };

      const series = this.getStrongMotionSeries(data);
      const values = series
        .map(item => Number(item?.pga ?? item?.PGA ?? item?.acceleration ?? item?.absAcceleration ?? 0))
        .filter(value => Number.isFinite(value));
      const max = values.length ? Math.max(...values.map(Math.abs)) : 0;

      if (max >= 80) return { level: 'high', text: '>80 gal' };
      if (max >= 25) return { level: 'medium', text: '25-80 gal' };
      return { level: 'normal', text: '正常' };
    },
    getStrongMotionSeries(data) {
      if (!data) return [];
      if (Array.isArray(data.time_series)) return data.time_series;
      if (Array.isArray(data?.parsed?.timeSeries)) return data.parsed.timeSeries;
      if (Array.isArray(data.values) && Array.isArray(data.labels)) {
        return data.labels.map((label, index) => ({
          time: label,
          acceleration: data.values[index] || 0,
          absAcceleration: data.values[index] || 0
        }));
      }
      return [];
    },
    formatNumber(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '-';
      if (Math.abs(number) >= 100) return number.toFixed(0);
      if (Math.abs(number) >= 10) return number.toFixed(1);
      return number.toFixed(2).replace(/\.?0+$/, '');
    },
    formatLatestTime(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return '-';
      const latest = rows[rows.length - 1];
      const timeStr = latest?.time || latest?.timestamp || latest?.date || '';
      if (!timeStr) return '-';
      const compact = timeStr.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
      if (compact) return `${compact[4]}:${compact[5]}`;
      const date = new Date(timeStr);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      }
      return String(timeStr).slice(0, 5);
    },
    resolveIntensity(pga) {
      const value = Number(pga);
      if (!Number.isFinite(value) || value <= 0) return '-';
      if (value >= 400) return '6+';
      if (value >= 250) return '6-';
      if (value >= 80) return '5+';
      if (value >= 25) return '4';
      if (value >= 8) return '3';
      return '0-2';
    },
    async loadChartData() {
      // 优先使用 regionId，如果没有则使用 regionCode（向后兼容）
      if (!this.regionId && !this.regionCode) return;
      
      // 生成新的請求 ID，用於識別這次加載請求
      const requestId = ++this.currentLoadRequestId;
      
      try {
        this.loading = true;
        
        // 根据是否有 regionId 选择不同的 API 路径
        const apiBasePath = this.regionId 
          ? `/warning-regions/id/${this.regionId}/data`
          : `/warning-regions/${this.regionCode}/data`;
        
        // 並行載入圖表的數據（優先使用外部API）
        // 只有台7地區才加載強地動數據
        const requests = [
          api.get(apiBasePath, {
            params: { dataType: 'chart1', useExternalApi: 'true' }
          }).catch(() => ({ success: false, data: null })),
          api.get(apiBasePath, {
            params: { dataType: 'chart2', useExternalApi: 'true' }
          }).catch(() => ({ success: false, data: null }))
        ];
        
        // 只有台7地區才加載強地動數據
        if (this.shouldShowStrongMotion) {
          requests.push(
            api.get(apiBasePath, {
              params: { dataType: 'chart3', useExternalApi: 'true' }
            }).catch(() => ({ success: false, data: null }))
          );
        }
        
        const results = await Promise.all(requests);
        const chart1Res = results[0];
        const chart2Res = results[1];
        const chart3Res = this.shouldShowStrongMotion ? results[2] : { success: false, data: null };
        
        // 檢查這是否還是最新的請求（防止異步競態）
        if (requestId !== this.currentLoadRequestId) {
          return;
        }
        
        
        // 處理返回的數據
        // 如果從外部API獲取，data是對象；如果從數據庫獲取，data是數組
        if (chart1Res.success) {
          if (chart1Res.source === 'external_api') {
            // 外部API返回的數據格式
            const data = chart1Res.data;
            // 對於外部API，只要 dataDensity !== 'none'，就認為API調用成功
            // 即使當天沒有記錄（records為空），也應該顯示空圖表
            if (data && data.dataDensity !== 'none') {
              this.chartData.chart1 = data;
              // 根據數據密度設置自動刷新（微地動更新較慢，預設10分鐘）
              this.setupAutoRefresh('chart1', data?.updateInterval || 600);
            } else {
              // 只有當 dataDensity === 'none' 時才認為沒有數據
              this.chartData.chart1 = null;
            }
          } else if (Array.isArray(chart1Res.data) && chart1Res.data.length > 0) {
            // 數據庫返回的數據格式
            this.chartData.chart1 = chart1Res.data[0].data_content;
          } else {
            this.chartData.chart1 = null;
          }
        } else {
          this.chartData.chart1 = null;
        }
        
        if (chart2Res.success) {
          if (chart2Res.source === 'external_api') {
            const data = chart2Res.data;
            // 只要 dataDensity !== 'none' 就代表端點已設定，顯示圖表（即使今日無降雨）
            if (data && data.dataDensity !== 'none') {
              this.chartData.chart2 = data;
              // 雨量更新較慢，預設10分鐘
              this.setupAutoRefresh('chart2', data?.updateInterval || 600);
            } else {
              this.chartData.chart2 = null;
            }
          } else if (Array.isArray(chart2Res.data) && chart2Res.data.length > 0) {
            this.chartData.chart2 = chart2Res.data[0].data_content;
          } else {
            this.chartData.chart2 = null;
          }
        } else {
          this.chartData.chart2 = null;
        }
        
        // 只有台7地區才處理強地動數據
        if (this.shouldShowStrongMotion) {
          if (chart3Res.success) {
            if (chart3Res.source === 'external_api') {
              const data = chart3Res.data;
              // 檢查是否為有效數據
              if (data && data.dataDensity !== 'none' && this.hasValidChartData(data)) {
                this.chartData.chart3 = data;
                // 強地動更新較快，預設2分鐘
                this.setupAutoRefresh('chart3', data?.updateInterval || 120);
              } else {
                this.chartData.chart3 = null;
              }
            } else if (Array.isArray(chart3Res.data) && chart3Res.data.length > 0) {
              this.chartData.chart3 = chart3Res.data[0].data_content;
            } else {
              this.chartData.chart3 = null;
            }
          } else {
            this.chartData.chart3 = null;
          }
        } else {
          // 非台7地區不設置數據
          this.chartData.chart3 = null;
        }
      } catch (error) {
        console.error('載入圖表數據失敗:', error);
      } finally {
        this.loading = false;
      }
    },
    // 設置自動刷新（根據數據更新頻率）
    setupAutoRefresh(chartKey, intervalSeconds) {
      // 清除現有的定時器
      if (this.refreshIntervals[chartKey]) {
        clearInterval(this.refreshIntervals[chartKey]);
        this.refreshIntervals[chartKey] = null;
      }
      
      // 設置新的定時器（將秒轉換為毫秒）
      if (intervalSeconds && intervalSeconds > 0) {
        this.refreshIntervals[chartKey] = setInterval(() => {
          this.loadSingleChartData(chartKey);
        }, intervalSeconds * 1000);
        
      }
    },
    // 載入單個圖表的數據
    async loadSingleChartData(chartKey) {
      // 优先使用 regionId，如果没有则使用 regionCode（向后兼容）
      if (!this.regionId && !this.regionCode) return;
      
      try {
        const dataTypeMap = {
          'chart1': 'chart1',
          'chart2': 'chart2',
          'chart3': 'chart3'
        };
        
        // 根据是否有 regionId 选择不同的 API 路径
        const apiBasePath = this.regionId 
          ? `/warning-regions/id/${this.regionId}/data`
          : `/warning-regions/${this.regionCode}/data`;
        
        const response = await api.get(apiBasePath, {
          params: { dataType: dataTypeMap[chartKey], useExternalApi: 'true' }
        }).catch(() => ({ success: false, data: null }));
        
        if (response.success && response.source === 'external_api') {
          this.chartData[chartKey] = response.data;
        }
      } catch (error) {
        console.error(`載入 ${chartKey} 數據失敗:`, error);
      }
    },
    // 檢查圖表數據是否有效
    hasValidChartData(data) {
      if (!data) return false;
      
      // 檢查是否有任何有意義的數據
      const hasValues = data.values && Array.isArray(data.values) && data.values.length > 0;
      const hasTimeSeries = data.time_series && Array.isArray(data.time_series) && data.time_series.length > 0;
      const hasTimeSeriesAlt = data.timeSeries && Array.isArray(data.timeSeries) && data.timeSeries.length > 0;
      const hasLabels = data.labels && Array.isArray(data.labels) && data.labels.length > 0;
      const hasCatalog = data.catalog && data.catalog.records && data.catalog.records.length > 0;
      const hasParsed = data.parsed && data.parsed.timeSeries && data.parsed.timeSeries.length > 0;
      
      return hasValues || hasTimeSeries || hasTimeSeriesAlt || hasLabels || hasCatalog || hasParsed;
    },
    // 清除所有數據和定時器
    clearAllData() {
      
      // 強制清除所有圖表數據（使用 Vue.set 確保響應式更新）
      this.chartData = {
        chart1: null,
        chart2: null,
        chart3: null
      };
      
      // 清除所有自動刷新定時器
      Object.keys(this.refreshIntervals).forEach(key => {
        if (this.refreshIntervals[key]) {
          clearInterval(this.refreshIntervals[key]);
          this.refreshIntervals[key] = null;
        }
      });
      
      // 清除載入狀態
      this.loading = false;
      
    },
    // 提供給父組件調用的刷新方法
    refresh() {
      this.loadChartData();
    },
    rainfallPrevDay() {
      const d = new Date(this.rainfallDate);
      d.setDate(d.getDate() - 1);
      this.rainfallDate = d.toISOString().split('T')[0];
    },
    rainfallNextDay() {
      if (this.rainfallIsToday) return;
      const d = new Date(this.rainfallDate);
      d.setDate(d.getDate() + 1);
      const next = d.toISOString().split('T')[0];
      if (next <= this.rainfallMaxDate) this.rainfallDate = next;
    },
    rainfallGoToday() {
      const d = new Date();
      this.rainfallDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    onRainfallDateChange() {
      // 日期改變由 RainfallChart 的 watch:selectedDate 處理
    },
    loadRainfallThresholds(regionId) {
      try {
        const saved = localStorage.getItem(`rainfall_thresholds_${regionId}`);
        if (saved) this.rainfallThresholds = JSON.parse(saved);
        else this.rainfallThresholds = { yellow: 20, red: 40 };
      } catch { this.rainfallThresholds = { yellow: 20, red: 40 }; }
    },
    setRainfallThreshold(type, rawValue) {
      const value = Math.max(0, Number.parseInt(rawValue, 10) || 0);
      const thresholds = { ...this.rainfallThresholds, [type]: value };

      if (type === 'yellow' && thresholds.yellow >= thresholds.red) {
        thresholds.red = thresholds.yellow + 1;
      }
      if (type === 'red' && thresholds.red <= thresholds.yellow) {
        thresholds.yellow = Math.max(0, thresholds.red - 1);
      }

      this.rainfallThresholds = thresholds;
      if (this.regionId) {
        localStorage.setItem(`rainfall_thresholds_${this.regionId}`, JSON.stringify(this.rainfallThresholds));
      }
    },
  },
  beforeUnmount() {
    // 清除所有自動刷新定時器
    Object.keys(this.refreshIntervals).forEach(key => {
      if (this.refreshIntervals[key]) {
        clearInterval(this.refreshIntervals[key]);
        this.refreshIntervals[key] = null;
      }
    });
  }
};
</script>

<style scoped>
.chart-data-panel {
  width: 100%;
}

.chart-data-panel.is-summary {
  height: 100%;
  min-height: 0;
}

.command-header {
  display: grid;
  grid-template-columns: minmax(150px, auto) 1fr;
  align-items: center;
  gap: 12px;
  padding: 0 2px 10px;
}

.command-header.is-dark {
  color: #e2e8f0;
}

.command-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.command-title .eyebrow {
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.command-title strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-header.is-dark .command-title strong {
  color: #f8fafc;
}

.command-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.command-status::-webkit-scrollbar {
  display: none;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid #dbe3ea;
  border-radius: 4px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.is-dark {
  border-color: #1e293b;
  background: #0f172a;
  color: #cbd5e1;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94a3b8;
}

.status-pill.is-normal .status-dot {
  background: #22c55e;
}

.status-pill.is-medium .status-dot {
  background: #f59e0b;
}

.status-pill.is-high .status-dot {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.command-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(3, minmax(220px, 1fr));
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.chart-data-panel.is-summary .command-header {
  display: none;
}

.chart-data-panel.is-summary .command-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  gap: 8px;
}

.chart-data-panel.is-summary .monitor-card {
  min-height: 0;
}

.chart-data-panel.is-summary .monitor-card-head {
  min-height: 26px;
  padding: 0 10px;
}

.chart-data-panel.is-summary .monitor-card-head span {
  font-size: 12px;
}

.chart-data-panel.is-summary .integrated-card {
  grid-template-rows: auto minmax(0, 1fr);
}

.chart-data-panel.is-summary .metric-board {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-data-panel.is-summary .metric-cell {
  min-height: 38px;
  padding: 5px 8px;
}

.chart-data-panel.is-summary .metric-cell:nth-child(2) {
  border-right: 0;
}

.chart-data-panel.is-summary .metric-cell:nth-child(n + 3) {
  display: none;
}

.chart-data-panel.is-summary .metric-cell strong {
  font-size: 16px;
}

.chart-data-panel.is-summary .trend-board {
  padding: 4px 6px 6px;
}

.chart-data-panel.is-summary .trend-board :deep(.microseismic-chart),
.chart-data-panel.is-summary .trend-board :deep(.rainfall-chart),
.chart-data-panel.is-summary .trend-board :deep(.strong-motion-chart) {
  padding: 4px;
}

.monitor-card {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #cbd8e3;
  border-radius: 6px;
  background: #f8fafc;
}

.monitor-card.is-dark {
  border-color: #2f4258;
  background: #0b1220;
}

.monitor-card.is-primary {
  border-color: #b9cad8;
}

.monitor-card.is-primary.is-dark {
  border-color: #315a76;
}

.monitor-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  padding: 0 10px;
  border-bottom: 1px solid #cbd8e3;
  background: #eef4f8;
}

.monitor-card.is-dark .monitor-card-head {
  border-bottom-color: #26384d;
  background: #111827;
}

.monitor-card-title {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.monitor-card-head span {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.monitor-card.is-dark .monitor-card-head span {
  color: #f8fafc;
}

.monitor-card-head small {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.threshold-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.threshold-inputs label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 6px;
  border: 1px solid #cbd8e3;
  border-radius: 4px;
  background: #ffffff;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.threshold-inputs.is-dark label {
  border-color: #334155;
  background: #0f172a;
  color: #cbd5e1;
}

.threshold-inputs input {
  width: 48px;
  height: 20px;
  border: 0;
  background: transparent;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
  outline: none;
}

.threshold-inputs.is-dark input {
  color: #f8fafc;
}

.threshold-inputs span {
  color: #94a3b8;
  font-size: 10px;
}

.monitor-card-body {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.integrated-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0;
  padding: 0;
}

.metric-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-content: stretch;
  border-bottom: 2px solid #8fb5d1;
  background: #ffffff;
}

.monitor-card.is-dark .metric-board {
  border-bottom-color: #3378b5;
  background: #0f172a;
}

.metric-cell {
  display: grid;
  min-width: 0;
  min-height: 40px;
  align-content: center;
  gap: 2px;
  padding: 4px 10px;
  border-right: 1px solid #d7e2eb;
  border-bottom: 0;
}

.metric-cell:last-child {
  border-right: 0;
}

.monitor-card.is-dark .metric-cell {
  border-right-color: #26384d;
}

.metric-cell span {
  overflow: hidden;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-card.is-dark .metric-cell span {
  color: #94a3b8;
}

.metric-cell strong {
  overflow: hidden;
  color: #0f172a;
  font-size: clamp(15px, 1.2vw, 20px);
  font-weight: 800;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-card.is-dark .metric-cell strong {
  color: #f8fafc;
}

.metric-cell small {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
}

.metric-cell.is-medium strong {
  color: #d97706;
}

.metric-cell.is-high strong {
  color: #dc2626;
}

.monitor-card.is-dark .metric-cell.is-medium strong {
  color: #fbbf24;
}

.monitor-card.is-dark .metric-cell.is-high strong {
  color: #f87171;
}

.trend-board {
  grid-column: 1;
  grid-row: 2;
  min-height: 0;
  overflow: hidden;
  padding: 6px;
  background:
    linear-gradient(90deg, rgba(30, 92, 138, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(30, 92, 138, 0.05) 1px, transparent 1px),
    #f5f9fc;
  background-size: 48px 48px, 48px 48px, auto;
}

.metric-board {
  grid-column: 1;
  grid-row: 1;
}

.monitor-card.is-dark .trend-board {
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    #08111f;
  background-size: 48px 48px, 48px 48px, auto;
}

.trend-board :deep(canvas),
.trend-board :deep(.chart-container),
.trend-board :deep(.relative) {
  max-height: 100%;
}

.trend-board :deep(.microseismic-chart),
.trend-board :deep(.rainfall-chart),
.trend-board :deep(.strong-motion-chart) {
  height: 100%;
  min-height: 0;
  padding: 4px 6px;
  border: 1px solid rgba(143, 181, 209, 0.7);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.82);
}

.monitor-card.is-dark .trend-board :deep(.microseismic-chart),
.monitor-card.is-dark .trend-board :deep(.rainfall-chart),
.monitor-card.is-dark .trend-board :deep(.strong-motion-chart) {
  border-color: rgba(51, 120, 181, 0.65);
  background: rgba(8, 17, 31, 0.88);
}

.empty-monitor {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  color: #94a3b8;
}

.empty-monitor span {
  font-size: 13px;
  font-weight: 700;
}

.empty-monitor small {
  font-size: 11px;
}

.empty-monitor.is-dark {
  color: #64748b;
}

.chart-data-panel :deep(.rounded) {
  border-radius: 4px;
}

.chart-data-panel :deep(.border) {
  box-shadow: none;
}

pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}

/* 隱藏滾動條 */
.chart-content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.chart-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

@media (max-width: 1024px) {
  .command-header {
    grid-template-columns: 1fr;
  }

  .command-status {
    grid-column: 1 / -1;
    order: 3;
  }

  .command-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    height: auto;
  }

  .monitor-card {
    min-height: 420px;
  }

  .integrated-card {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(260px, 1fr);
  }

  .metric-board {
    grid-column: 1;
    grid-row: 1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-bottom: 1px solid #edf2f7;
  }

  .monitor-card.is-dark .metric-board {
    border-bottom-color: #1e293b;
  }

  .trend-board {
    grid-column: 1;
    grid-row: 2;
  }

  .metric-cell {
    border-right: 1px solid #edf2f7;
    border-bottom: 0;
  }

  .metric-cell:last-child {
    border-right: 0;
  }

  .monitor-card.is-dark .metric-cell {
    border-right-color: #1e293b;
    border-bottom: 0;
  }
}

@media (max-width: 720px) {
  .metric-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-cell:nth-child(2n) {
    border-right: 0;
  }

  .metric-cell:nth-child(n + 3) {
    border-top: 1px solid #edf2f7;
  }

  .monitor-card.is-dark .metric-cell:nth-child(n + 3) {
    border-top-color: #1e293b;
  }
}
</style>
