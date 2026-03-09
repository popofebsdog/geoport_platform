<template>
  <div class="chart-data-panel relative">
    <!-- 收合按鈕 - 懸浮於右上角 -->
    <button 
      @click="panelCollapsed = !panelCollapsed"
      class="absolute -top-2 right-0 z-10 p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
      :title="panelCollapsed ? '展開' : '收合'"
    >
      <svg 
        class="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': panelCollapsed }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    
    <!-- 收合狀態：顯示簡化的三個圖卡（標題+文字描述） -->
    <div v-if="panelCollapsed" class="flex gap-4">
      <!-- 微地動 -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md flex-1 min-w-[100px]">
        <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex flex-col">
            <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">微地動</h5>
            <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
          </div>
        </div>
        <div class="p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">監測微地動事件，包括 TYPE I、TYPE II、TYPE III 等類型</p>
        </div>
      </div>
      
      <!-- 雨量 -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md flex-1 min-w-[100px]">
        <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex flex-col">
            <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">雨量</h5>
            <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
          </div>
        </div>
        <div class="p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">監測累積雨量與時雨量，追蹤降雨趨勢</p>
        </div>
      </div>
      
      <!-- 強地動 -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md flex-1 min-w-[100px]">
        <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex flex-col">
            <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">強地動</h5>
            <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
          </div>
        </div>
        <div class="p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">監測 PGA 與最大加速度，評估地震強度</p>
        </div>
      </div>
    </div>
    
    <Transition name="slide-vertical">
      <div v-show="!panelCollapsed" class="flex gap-4 h-[350px]">
      <!-- 圖表區域 1 -->
      <div 
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden flex-1 min-w-[100px] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md h-full"
      >
        <div 
          class="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700 w-full"
        >
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="flex flex-col">
              <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">
                微地動
              </h5>
              <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 圖卡/圖表模式切換按鈕（現在控制展開/收起） -->
            <button
              @click.stop="toggleChart('chart1')"
              class="p-1.5 rounded border transition-colors flex-shrink-0"
              :class="viewMode.chart1 === 'chart' 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
              :title="viewMode.chart1 === 'chart' ? '切換到圖卡模式' : '切換到圖表模式'"
            >
              <!-- 圖表模式圖標 -->
              <svg 
                v-if="viewMode.chart1 === 'chart'"
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <!-- 圖卡模式圖標 -->
              <svg 
                v-else
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"></path>
              </svg>
            </button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart1" class="flex-1 flex items-center justify-center p-5 overflow-hidden chart-content">
          <!-- 圖卡模式 -->
          <div v-if="viewMode.chart1 === 'card'" class="w-full h-full">
            <MicroseismicCard 
              :data="chartData.chart1" 
              :loading="loading"
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
            />
          </div>
          </div>
        </Transition>
      </div>
      
      <!-- 圖表區域 2 -->
      <div 
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden flex-1 min-w-[100px] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md h-full"
      >
        <div 
          class="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700 w-full"
        >
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="flex flex-col">
              <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">
                雨量
              </h5>
              <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 圖卡/圖表模式切換按鈕（現在控制展開/收起） -->
            <button
              @click.stop="toggleChart('chart2')"
              class="p-1.5 rounded border transition-colors flex-shrink-0"
              :class="viewMode.chart2 === 'chart' 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
              :title="viewMode.chart2 === 'chart' ? '切換到圖卡模式' : '切換到圖表模式'"
            >
              <!-- 圖表模式圖標 -->
              <svg 
                v-if="viewMode.chart2 === 'chart'"
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <!-- 圖卡模式圖標 -->
              <svg 
                v-else
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"></path>
              </svg>
            </button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart2" class="flex-1 flex items-center justify-center p-5 overflow-hidden chart-content">
          <!-- 圖卡模式 -->
          <div v-if="viewMode.chart2 === 'card'" class="w-full h-full">
            <RainfallCard 
              :data="chartData.chart2" 
              :loading="loading"
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
            />
          </div>
          </div>
        </Transition>
      </div>
      
      <!-- 圖表區域 3 -->
      <div 
        class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shadow-md hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden flex-1 min-w-[100px] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md h-full"
      >
        <div 
          class="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-700 w-full"
        >
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="flex flex-col">
              <h5 class="font-semibold text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">
                強地動
              </h5>
              <div class="h-px bg-gray-300 dark:bg-gray-600 mt-1"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- 圖卡/圖表模式切換按鈕（現在控制展開/收起） -->
            <button
              @click.stop="toggleChart('chart3')"
              class="p-1.5 rounded border transition-colors flex-shrink-0"
              :class="viewMode.chart3 === 'chart' 
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' 
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
              :title="viewMode.chart3 === 'chart' ? '切換到圖卡模式' : '切換到圖表模式'"
            >
              <!-- 圖表模式圖標 -->
              <svg 
                v-if="viewMode.chart3 === 'chart'"
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              <!-- 圖卡模式圖標 -->
              <svg 
                v-else
                class="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"></path>
              </svg>
            </button>
          </div>
        </div>
        <Transition name="slide-horizontal">
          <div v-show="expanded.chart3" class="flex-1 flex items-center justify-center p-5 overflow-hidden chart-content">
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
              />
            </div>
          </template>
          </div>
        </Transition>
      </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import axios from 'axios';
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
    MicroseismicCard,
    MicroseismicChart,
    RainfallCard,
    RainfallChart,
    StrongMotionCard,
    StrongMotionChart
    // ApiStatusChecker
  },
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
      panelCollapsed: false, // 面板收合狀態
      viewMode: {
        chart1: 'card', // 'card' 或 'chart'
        chart2: 'card',
        chart3: 'card'
      },
      refreshIntervals: {
        chart1: null, // 微地動刷新定時器
        chart2: null, // 雨量刷新定時器
        chart3: null  // 強地動刷新定時器
      },
      // 當前加載請求的標識（用於防止異步競態）
      currentLoadRequestId: 0
    };
  },
  computed: {
    // 判断是否应该显示强地动图卡（只有台7显示）
    shouldShowStrongMotion() {
      const name = this.regionName || ''
      return name.includes('臺7線') || name.includes('台7線') || 
             name.includes('台7') || name.includes('臺7')
    }
  },
  watch: {
    // 統一監聽 regionId 的變化（優先使用 regionId）
    regionId: {
      immediate: true,
      handler(newVal, oldVal) {
        
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
          ? `/api/warning-regions/id/${this.regionId}/data`
          : `/api/warning-regions/${this.regionCode}/data`;
        
        // 並行載入圖表的數據（優先使用外部API）
        // 只有台7地區才加載強地動數據
        const requests = [
          axios.get(apiBasePath, {
            params: { dataType: 'chart1', useExternalApi: 'true' }
          }).catch(() => ({ data: { success: false, data: null } })),
          axios.get(apiBasePath, {
            params: { dataType: 'chart2', useExternalApi: 'true' }
          }).catch(() => ({ data: { success: false, data: null } }))
        ];
        
        // 只有台7地區才加載強地動數據
        if (this.shouldShowStrongMotion) {
          requests.push(
            axios.get(apiBasePath, {
              params: { dataType: 'chart3', useExternalApi: 'true' }
            }).catch(() => ({ data: { success: false, data: null } }))
          );
        }
        
        const results = await Promise.all(requests);
        const chart1Res = results[0];
        const chart2Res = results[1];
        const chart3Res = this.shouldShowStrongMotion ? results[2] : { data: { success: false, data: null } };
        
        // 檢查這是否還是最新的請求（防止異步競態）
        if (requestId !== this.currentLoadRequestId) {
          return;
        }
        
        
        // 處理返回的數據
        // 如果從外部API獲取，data是對象；如果從數據庫獲取，data是數組
        if (chart1Res.data.success) {
          if (chart1Res.data.source === 'external_api') {
            // 外部API返回的數據格式
            const data = chart1Res.data.data;
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
          } else if (Array.isArray(chart1Res.data.data) && chart1Res.data.data.length > 0) {
            // 數據庫返回的數據格式
            this.chartData.chart1 = chart1Res.data.data[0].data_content;
          } else {
            this.chartData.chart1 = null;
          }
        } else {
          this.chartData.chart1 = null;
        }
        
        if (chart2Res.data.success) {
          if (chart2Res.data.source === 'external_api') {
            const data = chart2Res.data.data;
            // 檢查是否為有效數據
            if (data && data.dataDensity !== 'none' && this.hasValidChartData(data)) {
              this.chartData.chart2 = data;
              // 雨量更新較慢，預設10分鐘
              this.setupAutoRefresh('chart2', data?.updateInterval || 600);
            } else {
              this.chartData.chart2 = null;
            }
          } else if (Array.isArray(chart2Res.data.data) && chart2Res.data.data.length > 0) {
            this.chartData.chart2 = chart2Res.data.data[0].data_content;
          } else {
            this.chartData.chart2 = null;
          }
        } else {
          this.chartData.chart2 = null;
        }
        
        // 只有台7地區才處理強地動數據
        if (this.shouldShowStrongMotion) {
          if (chart3Res.data.success) {
            if (chart3Res.data.source === 'external_api') {
              const data = chart3Res.data.data;
              // 檢查是否為有效數據
              if (data && data.dataDensity !== 'none' && this.hasValidChartData(data)) {
                this.chartData.chart3 = data;
                // 強地動更新較快，預設2分鐘
                this.setupAutoRefresh('chart3', data?.updateInterval || 120);
              } else {
                this.chartData.chart3 = null;
              }
            } else if (Array.isArray(chart3Res.data.data) && chart3Res.data.data.length > 0) {
              this.chartData.chart3 = chart3Res.data.data[0].data_content;
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
          ? `/api/warning-regions/id/${this.regionId}/data`
          : `/api/warning-regions/${this.regionCode}/data`;
        
        const response = await axios.get(apiBasePath, {
          params: { dataType: dataTypeMap[chartKey], useExternalApi: 'true' }
        }).catch(() => ({ data: { success: false, data: null } }));
        
        if (response.data.success && response.data.source === 'external_api') {
          this.chartData[chartKey] = response.data.data;
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
      // 切換顯示模式（圖卡/圖表）
      this.viewMode[chartKey] = this.viewMode[chartKey] === 'card' ? 'chart' : 'card';
      // 確保在切換模式時，內容區域是展開的
      if (!this.expanded[chartKey]) {
        this.expanded[chartKey] = true;
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

pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}

/* 橫向展開/收合動畫 */
.slide-horizontal-enter-active,
.slide-horizontal-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-horizontal-enter-from,
.slide-horizontal-leave-to {
  max-width: 0;
  opacity: 0;
  padding-left: 0;
  padding-right: 0;
}

.slide-horizontal-enter-to,
.slide-horizontal-leave-from {
  max-width: 100%;
  opacity: 1;
}

/* 垂直展開/收合動畫 */
.slide-vertical-enter-active,
.slide-vertical-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.slide-vertical-enter-from,
.slide-vertical-leave-to {
  max-height: 0 !important;
  opacity: 0;
}

.slide-vertical-enter-to,
.slide-vertical-leave-from {
  max-height: 350px;
  opacity: 1;
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

