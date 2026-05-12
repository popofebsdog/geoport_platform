<template>
  <div class="rainfall-card w-full h-full p-4 flex flex-col relative overflow-hidden"
       :class="{
         'alert-red':    status === 'high',
         'alert-yellow': status === 'medium'
       }">
    <!-- 載入中 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-5 h-5 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"
             :style="isDarkMode ? 'border-color:#334155; border-top-color:#22c55e;' : 'border-color:#dcfce7; border-top-color:#16a34a;'"></div>
        <p class="text-xs" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">載入中...</p>
      </div>
    </div>

    <!-- 無數據 -->
    <div v-else-if="!data" class="flex items-center justify-center h-full">
      <div class="text-center" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">
        <svg class="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
        </svg>
        <p class="text-xs">暫無數據</p>
      </div>
    </div>

    <!-- 有數據 -->
    <div v-else class="flex flex-col h-full gap-3">
      <!-- 標題列 -->
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold uppercase tracking-wider"
              :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">雨量監測</span>
        <span class="flex items-center gap-1.5 text-xs font-medium"
              :class="status === 'high' ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                    : status === 'medium' ? (isDarkMode ? 'text-amber-400' : 'text-amber-600')
                    : (isDarkMode ? 'text-green-400' : 'text-green-600')">
          <span class="relative flex w-2 h-2 flex-shrink-0">
            <span v-if="status === 'high' || status === 'medium'"
                  class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  :class="status === 'high' ? 'bg-red-500' : 'bg-amber-400'"></span>
            <span class="relative inline-flex rounded-full w-2 h-2"
                  :class="status === 'high' ? 'bg-red-500' : status === 'medium' ? 'bg-amber-500' : 'bg-green-500'"></span>
          </span>
          {{ statusText }}
        </span>
      </div>

      <!-- 兩欄雨量數值 -->
      <div class="grid grid-cols-2 rounded overflow-hidden"
           :style="isDarkMode ? 'border:1px solid #1e293b;' : 'border:1px solid #f3f4f6;'">
        <div class="py-3 pr-3 pl-3 min-w-0"
             :style="isDarkMode ? 'border-right:1px solid #1e293b;' : 'border-right:1px solid #f3f4f6;'">
          <div class="text-[10px] font-medium tracking-wide mb-1"
               :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">累積雨量</div>
          <div class="flex items-baseline gap-1 min-w-0">
            <span class="text-xl font-semibold tabular-nums truncate"
                  :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ formatValue(accumulatedRainfall) }}</span>
            <span class="text-xs flex-shrink-0" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">mm</span>
          </div>
        </div>
        <div class="py-3 pl-3 min-w-0">
          <div class="text-[10px] font-medium tracking-wide mb-1"
               :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">時雨量</div>
          <div class="flex items-baseline gap-1 min-w-0">
            <span class="text-xl font-semibold tabular-nums truncate"
                  :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ formatValue(hourlyRainfall) }}</span>
            <span class="text-xs flex-shrink-0" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">mm</span>
          </div>
        </div>
      </div>

      <!-- 分隔線 -->
      <div class="h-px" :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-100'"></div>

      <!-- 統計列表 -->
      <div class="space-y-2 flex-1">
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">今日最高</span>
          <span class="text-sm font-semibold tabular-nums"
                :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">
            {{ formatValue(maxHourlyRainfall) }} mm
            <span class="text-[10px] font-normal"
                  :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">{{ maxHourlyTime }}</span>
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">有雨時段</span>
          <span class="text-sm font-semibold tabular-nums"
                :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ rainyHoursCount }} 小時</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">數據點</span>
          <span class="text-xs tabular-nums" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">{{ dataPointCount }}</span>
        </div>
      </div>

      <!-- 更新時間 -->
      <div class="pt-2 border-t" :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
        <span class="text-[10px]" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">{{ formatTime(updateTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RainfallCard',
  props: {
    data:       { type: Object,  default: null },
    loading:    { type: Boolean, default: false },
    isDarkMode: { type: Boolean, default: false },
    thresholds: {
      type: Object,
      default: () => ({ yellow: 20, red: 40 })
    },
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
      const v = parseFloat(hourly);
      if (isNaN(v)) return 'unknown';
      if (v >= this.thresholds.red)    return 'high';
      if (v >= this.thresholds.yellow) return 'medium';
      return 'normal';
    },
    statusText() {
      return { high: '紅色警戒', medium: '黃色警戒', normal: '正常', unknown: '未知' }[this.status] || '未知';
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
.alert-red {
  box-shadow: 0 0 0 2px rgba(239,68,68,0.6);
  animation: pulse-red 2s infinite;
}
.alert-yellow {
  box-shadow: 0 0 0 2px rgba(245,158,11,0.6);
  animation: pulse-yellow 2s infinite;
}
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 2px rgba(239,68,68,0.6); }
  50%       { box-shadow: 0 0 0 5px rgba(239,68,68,0.2); }
}
@keyframes pulse-yellow {
  0%, 100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.6); }
  50%       { box-shadow: 0 0 0 5px rgba(245,158,11,0.15); }
}
</style>
