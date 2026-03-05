<template>
  <div class="rainfall-card w-full h-full p-4 flex flex-col">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else-if="!data" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-400 dark:text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
        </svg>
        <p class="text-sm">暫無數據</p>
      </div>
    </div>
    
    <div v-else-if="data !== null && data !== undefined" class="space-y-3 flex flex-col">
      <!-- 標題區域 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200">雨量監測</h4>
        </div>
        <span 
          class="px-2 py-0.5 rounded-full text-xs font-medium"
          :class="getStatusClass(status)"
        >
          {{ statusText }}
        </span>
      </div>
      
      <!-- 主要指標 -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <p class="text-xs text-green-600 dark:text-green-400 mb-1">累積雨量</p>
          <p class="text-2xl font-bold text-green-700 dark:text-green-300">
            {{ formatValue(accumulatedRainfall) }}<span class="text-sm ml-1">mm</span>
          </p>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <p class="text-xs text-blue-600 dark:text-blue-400 mb-1">時雨量</p>
          <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {{ formatValue(hourlyRainfall) }}<span class="text-sm ml-1">mm</span>
          </p>
        </div>
      </div>
      
      <!-- 統計信息 -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-200 dark:border-gray-600">
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">今日最高</p>
          <div class="flex items-baseline gap-1">
            <p class="text-lg font-bold text-gray-800 dark:text-gray-200">
              {{ formatValue(maxHourlyRainfall) }}<span class="text-xs ml-1">mm</span>
            </p>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ maxHourlyTime }}</span>
          </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-200 dark:border-gray-600">
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">有雨時段</p>
          <p class="text-lg font-bold text-gray-800 dark:text-gray-200">
            {{ rainyHoursCount }}<span class="text-xs ml-1">小時</span>
          </p>
        </div>
      </div>
      
      <!-- 底部信息 -->
      <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          數據點：{{ dataPointCount }}
        </span>
        <span class="text-xs text-gray-400 dark:text-gray-500">
          {{ formatTime(updateTime) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RainfallCard',
  props: {
    data: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    timeSeries() {
      if (!this.data) return [];
      
      try {
        // 優先使用 time_series
        if (Array.isArray(this.data.time_series) && this.data.time_series.length > 0) {
          return this.data.time_series;
        }
        
        // 如果沒有 time_series，嘗試從其他字段構建
        if (Array.isArray(this.data.hourly) && Array.isArray(this.data.labels)) {
          return this.data.labels.map((label, index) => ({
            time: label,
            hourly: this.data.hourly[index] || 0,
            accumulated: this.data.accumulated || null
          }));
        }
      } catch (e) {
        console.warn('解析雨量時間序列數據時出錯:', e);
      }
      
      return [];
    },
    accumulatedRainfall() {
      if (!this.data) return null;
      
      // 優先從 time_series 計算累積雨量
      if (this.timeSeries.length > 0) {
        const lastItem = this.timeSeries[this.timeSeries.length - 1];
        if (lastItem.accumulated !== null && lastItem.accumulated !== undefined) {
          return lastItem.accumulated;
        }
        // 如果沒有累積值，計算時雨量總和
        return this.timeSeries.reduce((sum, item) => sum + (parseFloat(item.hourly) || 0), 0);
      }
      
      return this.data.accumulated || 
             this.data.total_rainfall || 
             this.data.accumulated_rainfall ||
             this.data.total ||
             null;
    },
    hourlyRainfall() {
      if (!this.data) return null;
      
      // 從 time_series 獲取當前小時的時雨量
      // 找出當前小時內所有記錄的最大hourly值
      if (this.timeSeries.length > 0) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // 過濾當前小時的記錄
        const currentHourData = this.timeSeries.filter(item => {
          const timeStr = item.time || item.timestamp || '';
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              return date.getHours() === currentHour;
            }
          } catch (e) {
            // 忽略錯誤
          }
          return false;
        });
        
        // 如果當前小時有記錄，返回最大hourly值
        if (currentHourData.length > 0) {
          return Math.max(...currentHourData.map(item => parseFloat(item.hourly) || 0));
        }
        
        // 如果當前小時沒有記錄，返回最後一條記錄的hourly
        const lastItem = this.timeSeries[this.timeSeries.length - 1];
        return lastItem.hourly || lastItem.value || 0;
      }
      
      return this.data.hourly || 
             this.data.hourly_rainfall || 
             this.data.rainfall_per_hour ||
             this.data.current_hour ||
             0;
    },
    maxHourlyRainfall() {
      if (this.timeSeries.length === 0) return 0;
      
      return Math.max(...this.timeSeries.map(item => parseFloat(item.hourly) || 0), 0);
    },
    maxHourlyTime() {
      if (this.timeSeries.length === 0) return '-';
      
      const maxItem = this.timeSeries.reduce((max, item) => {
        const current = parseFloat(item.hourly) || 0;
        const maxValue = parseFloat(max.hourly) || 0;
        return current > maxValue ? item : max;
      }, this.timeSeries[0]);
      
      const timeStr = maxItem.time || maxItem.timestamp || '';
      if (!timeStr) return '-';
      
      try {
        const match = timeStr.match(/(\d{2}):(\d{2})/);
        if (match) {
          return `${match[1]}:${match[2]}`;
        }
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        // 忽略錯誤
      }
      
      return timeStr.substring(0, 5) || '-';
    },
    rainyHoursCount() {
      // 計算有雨的小時數（而不是記錄數）
      const rainyHours = new Set();
      this.timeSeries.forEach(item => {
        if ((parseFloat(item.hourly) || 0) > 0) {
          const timeStr = item.time || item.timestamp || '';
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              rainyHours.add(date.getHours());
            }
          } catch (e) {
            // 忽略錯誤
          }
        }
      });
      return rainyHours.size;
    },
    hourlyDistribution() {
      const distribution = {};
      const now = new Date();
      const currentHour = now.getHours();
      
      // 初始化最近6小時
      for (let i = 5; i >= 0; i--) {
        const hour = (currentHour - i + 24) % 24;
        distribution[hour] = 0;
      }
      
      // 統計每個小時的雨量
      this.timeSeries.forEach(item => {
        const timeStr = item.time || item.timestamp || '';
        const hourly = parseFloat(item.hourly) || 0;
        
        try {
          const match = timeStr.match(/(\d{2}):(\d{2})/);
          if (match) {
            const hour = parseInt(match[1], 10);
            if (distribution.hasOwnProperty(hour)) {
              distribution[hour] = Math.max(distribution[hour], hourly);
            }
          } else {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const hour = date.getHours();
              if (distribution.hasOwnProperty(hour)) {
                distribution[hour] = Math.max(distribution[hour], hourly);
              }
            }
          }
        } catch (e) {
          // 忽略錯誤
        }
      });
      
      return distribution;
    },
    maxHourlyValue() {
      const values = Object.values(this.hourlyDistribution);
      if (values.length === 0) return 1;
      return Math.max(...values, 1);
    },
    status() {
      const hourly = this.hourlyRainfall;
      if (hourly === null || hourly === undefined) return 'unknown';
      
      const numValue = parseFloat(hourly);
      if (isNaN(numValue)) return 'unknown';
      
      // 根據時雨量判斷狀態
      if (numValue >= 40) return 'high'; // 大雨
      if (numValue >= 20) return 'medium'; // 中雨
      return 'normal'; // 小雨或無雨
    },
    statusText() {
      const statusMap = {
        'high': '大雨',
        'medium': '中雨',
        'normal': '正常',
        'unknown': '未知'
      };
      return statusMap[this.status] || '未知';
    },
    dataPointCount() {
      if (!this.data) return 0;
      if (Array.isArray(this.data.time_series)) return this.data.time_series.length;
      if (Array.isArray(this.data.values)) return this.data.values.length;
      return 0;
    },
    updateTime() {
      if (!this.data) return null;
      return this.data.timestamp || 
             this.data.update_time || 
             this.data.data_timestamp || 
             this.data.collected_at ||
             new Date().toISOString();
    }
  },
  methods: {
    formatValue(value) {
      if (value === null || value === undefined) return '0';
      const num = parseFloat(value);
      if (isNaN(num)) return '0';
      return num.toFixed(1);
    },
    formatTime(timeStr) {
      if (!timeStr) return '-';
      try {
        const date = new Date(timeStr);
        return date.toLocaleString('zh-TW', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return timeStr;
      }
    },
    getStatusClass(status) {
      const classMap = {
        'high': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        'normal': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        'unknown': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      };
      return classMap[status] || classMap['unknown'];
    },
    getBarColor(value) {
      if (value === 0) return 'bg-gray-200 dark:bg-gray-600';
      if (value >= 40) return 'bg-red-500 dark:bg-red-600';
      if (value >= 20) return 'bg-yellow-500 dark:bg-yellow-600';
      return 'bg-blue-500 dark:bg-blue-600';
    }
  }
};
</script>

<style scoped>
.rainfall-card {
  min-height: 200px;
}
</style>
