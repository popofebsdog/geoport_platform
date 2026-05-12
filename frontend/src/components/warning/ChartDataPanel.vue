<template>
  <div class="chart-data-panel">
    <!-- 頂部列：收合按鈕 -->
    <div class="flex justify-end mb-1.5">
      <button
        @click="panelCollapsed = !panelCollapsed"
        class="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border rounded transition-colors"
        :class="panelCollapsed
          ? 'bg-brand text-white border-brand'
          : 'bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-800 hover:text-gray-700 dark:hover:text-slate-300'"
        :title="panelCollapsed ? '展開' : '收合'"
      >
        <svg
          class="w-3 h-3 transition-transform duration-200"
          :class="{ 'rotate-180': panelCollapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
        {{ panelCollapsed ? '展開' : '收合' }}
      </button>
    </div>
    
    <!-- 收合狀態：簡化三欄摘要 -->
    <div v-if="panelCollapsed" class="flex gap-3">
      <div v-for="item in [
        { label: '微地動', desc: '監測 TYPE I / II / III 事件' },
        { label: '雨量',   desc: '累積雨量與時雨量趨勢' },
        { label: '強地動', desc: 'PGA 與最大加速度評估' }
      ]" :key="item.label"
        class="flex-1 border rounded px-4 py-3 flex items-center gap-3 transition-colors"
        :class="isDarkMode
          ? 'border-slate-800 bg-slate-900/60'
          : 'border-gray-200 bg-white'"
      >
        <span class="text-xs font-semibold tracking-tight"
              :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">{{ item.label }}</span>
        <span class="text-[11px]"
              :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">{{ item.desc }}</span>
      </div>
    </div>
    
      <div v-if="!panelCollapsed" class="flex gap-4 h-[clamp(390px,42vh,520px)] min-h-[390px]">
      <!-- 圖表區域 1 -->
      <div
        class="border rounded overflow-hidden flex flex-col flex-1 min-w-[100px] h-full transition-colors"
        :class="isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center justify-between px-4 py-2.5 border-b transition-colors"
             :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold tracking-tight"
                  :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">微地動</span>
            <button
              v-if="regionId"
              @click.stop="openApiPanel = 'microseismic'"
              class="px-2 py-0.5 text-[11px] font-medium border rounded transition-colors"
              :class="isDarkMode
                ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'"
              title="API 路由管理"
            >路由</button>
          </div>
          <div class="flex rounded overflow-hidden border"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <button @click.stop="viewMode.chart1 = 'card'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors"
              :class="viewMode.chart1 === 'card'
                ? 'bg-brand text-white'
                : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')"
            >圖卡</button>
            <button @click.stop="viewMode.chart1 = 'chart'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors border-l"
              :class="[
                isDarkMode ? 'border-slate-700' : 'border-gray-200',
                viewMode.chart1 === 'chart'
                  ? 'bg-brand text-white'
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')
              ]"
            >圖表</button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart1" class="flex-1 flex items-center justify-center p-3 md:p-4 overflow-auto chart-content">
          <!-- 圖卡模式 -->
          <div v-if="viewMode.chart1 === 'card'" class="w-full h-full">
            <MicroseismicCard 
              :data="chartData.chart1" 
              :loading="loading"
              :isDarkMode="isDarkMode"
            />
          </div>
          <!-- 圖表模式 -->
          <div v-else class="w-full h-full">
            <MicroseismicChart 
              :key="`chart1-${viewMode.chart1}-${regionId || regionCode}`"
              :data="chartData.chart1" 
              :loading="loading"
              :regionCode="regionCode"
              :regionId="regionId"
              :isDarkMode="isDarkMode"
            />
          </div>
          </div>
        </Transition>
      </div>
      
      <!-- 圖表區域 2 -->
      <div
        class="border rounded overflow-hidden flex flex-col flex-1 min-w-[100px] h-full transition-colors"
        :class="isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center gap-2 px-4 py-2.5 border-b transition-colors"
             :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs font-semibold tracking-tight"
                  :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">雨量</span>
            <button
              v-if="regionId"
              @click.stop="openApiPanel = 'rainfall'"
              class="px-2 py-0.5 text-[11px] font-medium border rounded transition-colors"
              :class="isDarkMode
                ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'"
              title="API 路由管理"
            >路由</button>
          </div>
          <!-- 日期選擇器（僅圖表模式顯示） -->
          <div v-if="viewMode.chart2 === 'chart'" class="flex items-center gap-1 flex-1 justify-center">
            <button @click.stop="rainfallPrevDay"
                    class="px-1.5 py-0.5 text-[11px] border rounded transition-colors"
                    :class="isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
                    title="前一天">←</button>
            <input type="date" v-model="rainfallDate" @change.stop="onRainfallDateChange"
                   :max="rainfallMaxDate"
                   class="px-1.5 py-0.5 text-[11px] border rounded outline-none"
                   :class="isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 focus:border-brand' : 'border-gray-200 bg-white text-gray-700 focus:border-brand'" />
            <button @click.stop="rainfallNextDay" :disabled="rainfallIsToday"
                    class="px-1.5 py-0.5 text-[11px] border rounded transition-colors disabled:opacity-40"
                    :class="isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-400'"
                    title="後一天">→</button>
            <button @click.stop="rainfallGoToday" :disabled="rainfallIsToday"
                    class="px-1.5 py-0.5 text-[11px] border rounded transition-colors border-brand text-brand hover:bg-brand hover:text-white disabled:opacity-40"
                    title="今天">今天</button>
          </div>
          <div v-else class="flex-1"></div>
          <div class="flex rounded overflow-hidden border flex-shrink-0"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <button @click.stop="viewMode.chart2 = 'card'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors"
              :class="viewMode.chart2 === 'card'
                ? 'bg-brand text-white'
                : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')"
            >圖卡</button>
            <button @click.stop="viewMode.chart2 = 'chart'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors border-l"
              :class="[
                isDarkMode ? 'border-slate-700' : 'border-gray-200',
                viewMode.chart2 === 'chart'
                  ? 'bg-brand text-white'
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')
              ]"
            >圖表</button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart2" class="flex-1 flex items-center justify-center p-3 md:p-4 overflow-auto chart-content">
          <!-- 圖卡模式 -->
          <div v-if="viewMode.chart2 === 'card'" class="w-full h-full">
            <RainfallCard
              :data="chartData.chart2"
              :loading="loading"
              :isDarkMode="isDarkMode"
              :thresholds="rainfallThresholds"
            />
          </div>
          <!-- 圖表模式 -->
          <div v-else class="w-full h-full">
            <RainfallChart
              :key="`chart2-${viewMode.chart2}-${regionId || regionCode}`"
              :data="chartData.chart2"
              :loading="loading"
              :regionCode="regionCode"
              :regionId="regionId"
              :isDarkMode="isDarkMode"
              :selectedDate="rainfallDate"
              :thresholds="rainfallThresholds"
              @threshold-change="onRainfallThresholdChange"
            />
          </div>
          </div>
        </Transition>
      </div>
      
      <!-- 圖表區域 3 -->
      <div
        class="border rounded overflow-hidden flex flex-col flex-1 min-w-[100px] h-full transition-colors"
        :class="isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-center justify-between px-4 py-2.5 border-b transition-colors"
             :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold tracking-tight"
                  :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">強地動</span>
            <button
              v-if="regionId"
              @click.stop="openApiPanel = 'earthquake'"
              class="px-2 py-0.5 text-[11px] font-medium border rounded transition-colors"
              :class="isDarkMode
                ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'"
              title="API 路由管理"
            >路由</button>
          </div>
          <div class="flex rounded overflow-hidden border"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <button @click.stop="viewMode.chart3 = 'card'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors"
              :class="viewMode.chart3 === 'card'
                ? 'bg-brand text-white'
                : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')"
            >圖卡</button>
            <button @click.stop="viewMode.chart3 = 'chart'"
              class="px-2 py-0.5 text-[11px] font-medium transition-colors border-l"
              :class="[
                isDarkMode ? 'border-slate-700' : 'border-gray-200',
                viewMode.chart3 === 'chart'
                  ? 'bg-brand text-white'
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')
              ]"
            >圖表</button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart3" class="flex-1 flex items-center justify-center p-3 md:p-4 overflow-auto chart-content">
          <!-- 非台7地區：顯示暫無數據 -->
          <div v-if="!shouldShowStrongMotion" class="flex items-center justify-center h-full">
            <div class="text-center text-gray-400 dark:text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <p class="text-sm">暫無數據</p>
            </div>
          </div>
          <!-- 台7地區：顯示完整圖卡/圖表 -->
          <template v-else>
            <!-- 圖卡模式 -->
            <div v-if="viewMode.chart3 === 'card'" class="w-full h-full">
              <StrongMotionCard 
                :data="chartData.chart3" 
                :loading="loading"
                :isDarkMode="isDarkMode"
              />
            </div>
            <!-- 圖表模式 -->
            <div v-else class="w-full h-full">
              <StrongMotionChart 
                :key="`chart3-${viewMode.chart3}-${regionId || regionCode}`"
                :data="chartData.chart3" 
                :loading="loading"
                :regionCode="regionCode"
                :regionId="regionId"
                :isDarkMode="isDarkMode"
              />
            </div>
          </template>
          </div>
        </Transition>
      </div>
      </div>
  </div>

  <!-- API 端點設定面板 -->
  <ApiUrlConfigPanel
    v-if="openApiPanel"
    :category="openApiPanel"
    :regionId="regionId"
    :regionCode="regionCode"
    :regionName="regionName"
    :isDarkMode="isDarkMode"
    @close="openApiPanel = null"
    @saved="onApiSaved"
  />
</template>

<script>
import api from '@/services/api';
import ApiUrlConfigPanel from './ApiUrlConfigPanel.vue';
import MicroseismicCard from './charts/MicroseismicCard.vue';
import MicroseismicChart from './charts/MicroseismicChart.vue';
import RainfallCard from './charts/RainfallCard.vue';
import RainfallChart from './charts/RainfallChart.vue';
import StrongMotionCard from './charts/StrongMotionCard.vue';
import StrongMotionChart from './charts/StrongMotionChart.vue';
// import ApiStatusChecker from './ApiStatusChecker.vue';

export default {
  name: 'ChartDataPanel',
  components: {
    ApiUrlConfigPanel,
    MicroseismicCard,
    MicroseismicChart,
    RainfallCard,
    RainfallChart,
    StrongMotionCard,
    StrongMotionChart
    // ApiStatusChecker
  },
  inject: ['isDarkMode'],
  props: {
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
  emits: ['panel-collapsed-changed'],
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
      expanded: {
        chart1: true,
        chart2: true,
        chart3: true
      },
      panelCollapsed: false,
      viewMode: {
        chart1: 'card',
        chart2: 'card',
        chart3: 'card'
      },
      refreshIntervals: {
        chart1: null,
        chart2: null,
        chart3: null
      },
      currentLoadRequestId: 0,
      // 雨量日期選擇
      rainfallDate: today,
      rainfallMaxDate: today,
      // API 端點設定面板
      openApiPanel: null,   // null | 'microseismic' | 'rainfall' | 'earthquake'
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
    panelCollapsed: {
      handler(newVal) {
        // 通知父組件面板收起狀態變化
        this.$emit('panel-collapsed-changed', newVal);
      },
      immediate: true
    }
  },
  methods: {
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
    // 切換圖表展開狀態（獨立切換：每個圖表可獨立展開/收起）
    // 同時切換顯示模式（圖卡/圖表）
    toggleChart(chartKey) {
      this.viewMode[chartKey] = this.viewMode[chartKey] === 'card' ? 'chart' : 'card';
      if (!this.expanded[chartKey]) {
        this.expanded[chartKey] = true;
      }
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
    onRainfallThresholdChange(thresholds) {
      this.rainfallThresholds = { ...thresholds };
      if (this.regionId) {
        localStorage.setItem(`rainfall_thresholds_${this.regionId}`, JSON.stringify(thresholds));
      }
    },
    onApiSaved({ category }) {
      // URL 更新後重新載入對應圖表
      const keyMap = { microseismic: 'chart1', rainfall: 'chart2', earthquake: 'chart3' }
      const key = keyMap[category]
      if (key) this.loadSingleChartData(key)
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
</style>

