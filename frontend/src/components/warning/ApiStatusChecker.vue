<template>
  <div class="api-status-checker bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">API 狀態檢查</h4>
      <button
        @click="checkAllApis"
        :disabled="checking"
        class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
      >
        <svg 
          v-if="!checking"
          class="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <div v-else class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {{ checking ? '檢查中...' : '檢查狀態' }}
      </button>
    </div>
    
    <div class="grid grid-cols-3 gap-3">
      <!-- 微地動 API -->
      <div class="api-status-item p-3 rounded border" :class="getStatusClass(apiStatus.chart1)">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">微地動</span>
          <div class="flex items-center gap-1">
            <div 
              class="w-2 h-2 rounded-full"
              :class="getStatusDotClass(apiStatus.chart1)"
            ></div>
            <span class="text-xs" :class="getStatusTextClass(apiStatus.chart1)">
              {{ getStatusText(apiStatus.chart1) }}
            </span>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div v-if="apiStatus.chart1.responseTime">
            響應時間: {{ apiStatus.chart1.responseTime }}ms
          </div>
          <div v-if="apiStatus.chart1.dataCount !== null">
            數據點: {{ apiStatus.chart1.dataCount }}
          </div>
          <div v-if="apiStatus.chart1.lastUpdate">
            更新時間: {{ formatTime(apiStatus.chart1.lastUpdate) }}
          </div>
          <div v-if="apiStatus.chart1.error" class="text-red-500 dark:text-red-400 truncate" :title="apiStatus.chart1.error">
            {{ apiStatus.chart1.error }}
          </div>
        </div>
      </div>
      
      <!-- 雨量 API -->
      <div class="api-status-item p-3 rounded border" :class="getStatusClass(apiStatus.chart2)">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">雨量</span>
          <div class="flex items-center gap-1">
            <div 
              class="w-2 h-2 rounded-full"
              :class="getStatusDotClass(apiStatus.chart2)"
            ></div>
            <span class="text-xs" :class="getStatusTextClass(apiStatus.chart2)">
              {{ getStatusText(apiStatus.chart2) }}
            </span>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div v-if="apiStatus.chart2.responseTime">
            響應時間: {{ apiStatus.chart2.responseTime }}ms
          </div>
          <div v-if="apiStatus.chart2.dataCount !== null">
            數據點: {{ apiStatus.chart2.dataCount }}
          </div>
          <div v-if="apiStatus.chart2.lastUpdate">
            更新時間: {{ formatTime(apiStatus.chart2.lastUpdate) }}
          </div>
          <div v-if="apiStatus.chart2.error" class="text-red-500 dark:text-red-400 truncate" :title="apiStatus.chart2.error">
            {{ apiStatus.chart2.error }}
          </div>
        </div>
      </div>
      
      <!-- 強地動 API -->
      <div class="api-status-item p-3 rounded border" :class="getStatusClass(apiStatus.chart3)">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">強地動</span>
          <div class="flex items-center gap-1">
            <div 
              class="w-2 h-2 rounded-full"
              :class="getStatusDotClass(apiStatus.chart3)"
            ></div>
            <span class="text-xs" :class="getStatusTextClass(apiStatus.chart3)">
              {{ getStatusText(apiStatus.chart3) }}
            </span>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div v-if="apiStatus.chart3.responseTime">
            響應時間: {{ apiStatus.chart3.responseTime }}ms
          </div>
          <div v-if="apiStatus.chart3.dataCount !== null">
            數據點: {{ apiStatus.chart3.dataCount }}
          </div>
          <div v-if="apiStatus.chart3.lastUpdate">
            更新時間: {{ formatTime(apiStatus.chart3.lastUpdate) }}
          </div>
          <div v-if="apiStatus.chart3.error" class="text-red-500 dark:text-red-400 truncate" :title="apiStatus.chart3.error">
            {{ apiStatus.chart3.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ApiStatusChecker',
  props: {
    regionCode: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      checking: false,
      apiStatus: {
        chart1: {
          status: 'unknown', // 'healthy', 'unhealthy', 'unknown'
          responseTime: null,
          dataCount: null,
          lastUpdate: null,
          error: null
        },
        chart2: {
          status: 'unknown',
          responseTime: null,
          dataCount: null,
          lastUpdate: null,
          error: null
        },
        chart3: {
          status: 'unknown',
          responseTime: null,
          dataCount: null,
          lastUpdate: null,
          error: null
        }
      }
    };
  },
  mounted() {
    if (this.regionCode) {
      this.checkAllApis();
    }
  },
  watch: {
    regionCode: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.checkAllApis();
        }
      }
    }
  },
  methods: {
    async checkAllApis() {
      if (!this.regionCode || this.checking) return;
      
      this.checking = true;
      
      // 並行檢查三個API
      await Promise.all([
        this.checkApi('chart1', '微地動'),
        this.checkApi('chart2', '雨量'),
        this.checkApi('chart3', '強地動')
      ]);
      
      this.checking = false;
    },
    async checkApi(chartKey, apiName) {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`/api/warning-regions/${this.regionCode}/data`, {
          params: { 
            dataType: chartKey, 
            useExternalApi: 'true' 
          },
          timeout: 10000 // 10秒超時
        });
        
        const responseTime = Date.now() - startTime;
        const data = response.data;
        
        // 判斷API狀態
        let status = 'unhealthy';
        let dataCount = 0;
        let error = null;
        
        if (data.success) {
          if (data.source === 'external_api') {
            const apiData = data.data || {};
            
            console.log(`檢查${apiName} API數據:`, {
              hasTimeSeries: !!apiData.time_series,
              timeSeriesLength: apiData.time_series?.length || 0,
              hasValues: !!apiData.values,
              valuesLength: apiData.values?.length || 0,
              hasPga: apiData.pga !== null && apiData.pga !== undefined,
              hasAcceleration: apiData.acceleration !== null && apiData.acceleration !== undefined,
              hasMaxAcceleration: apiData.max_acceleration !== null && apiData.max_acceleration !== undefined,
              hasLatestValue: apiData.latest_value !== null && apiData.latest_value !== undefined,
              warning: apiData.warning,
              error: apiData.error
            });
            
            // 檢查是否有數據（對於強地動，也要檢查PGA和加速度值）
            if (apiData.time_series && Array.isArray(apiData.time_series) && apiData.time_series.length > 0) {
              dataCount = apiData.time_series.length;
              status = 'healthy';
            } else if (apiData.values && Array.isArray(apiData.values) && apiData.values.length > 0) {
              dataCount = apiData.values.length;
              status = 'healthy';
            } else if (apiData.pga !== null && apiData.pga !== undefined) {
              // 強地動：如果有PGA值，也算有數據
              dataCount = 1;
              status = 'healthy';
            } else if (apiData.acceleration !== null && apiData.acceleration !== undefined) {
              // 強地動：如果有加速度值，也算有數據
              dataCount = 1;
              status = 'healthy';
            } else if (apiData.max_acceleration !== null && apiData.max_acceleration !== undefined) {
              // 強地動：如果有最大加速度值，也算有數據
              dataCount = 1;
              status = 'healthy';
            } else if (apiData.latest_value !== null && apiData.latest_value !== undefined) {
              dataCount = 1;
              status = 'healthy';
            } else if (apiData.error) {
              // 有明確的錯誤信息
              error = apiData.error;
              status = 'unhealthy';
            } else if (apiData.warning) {
              // API調用失敗但返回了空數據結構
              error = apiData.warning || 'API返回空數據';
              status = 'unhealthy';
            } else {
              error = '無數據';
              status = 'unhealthy';
            }
          } else {
            // 從數據庫獲取
            if (Array.isArray(data.data) && data.data.length > 0) {
              dataCount = data.data.length;
              status = 'healthy';
            } else {
              error = '無數據';
              status = 'unhealthy';
            }
          }
        } else {
          error = data.message || 'API請求失敗';
          status = 'unhealthy';
        }
        
        // 更新狀態
        this.apiStatus[chartKey] = {
          status,
          responseTime,
          dataCount,
          lastUpdate: new Date().toISOString(),
          error
        };
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.message || error.message || '連接失敗';
        
        this.apiStatus[chartKey] = {
          status: 'unhealthy',
          responseTime,
          dataCount: null,
          lastUpdate: new Date().toISOString(),
          error: errorMessage
        };
      }
    },
    getStatusClass(statusObj) {
      if (statusObj.status === 'healthy') {
        return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      } else if (statusObj.status === 'unhealthy') {
        return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      }
      return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50';
    },
    getStatusDotClass(statusObj) {
      if (statusObj.status === 'healthy') {
        return 'bg-green-500';
      } else if (statusObj.status === 'unhealthy') {
        return 'bg-red-500';
      }
      return 'bg-gray-400';
    },
    getStatusTextClass(statusObj) {
      if (statusObj.status === 'healthy') {
        return 'text-green-600 dark:text-green-400';
      } else if (statusObj.status === 'unhealthy') {
        return 'text-red-600 dark:text-red-400';
      }
      return 'text-gray-500 dark:text-gray-400';
    },
    getStatusText(statusObj) {
      if (statusObj.status === 'healthy') {
        return '正常';
      } else if (statusObj.status === 'unhealthy') {
        return '異常';
      }
      return '未知';
    },
    formatTime(timeStr) {
      if (!timeStr) return '';
      try {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      } catch (e) {
        return timeStr;
      }
    }
  }
};
</script>

<style scoped>
.api-status-checker {
  font-size: 0.875rem;
}

.api-status-item {
  transition: all 0.2s;
}

.api-status-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>

