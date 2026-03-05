<template>
  <div class="microseismic-card w-full h-full p-4 flex flex-col">
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
    
    <div v-else-if="data !== null && data !== undefined" class="space-y-3 flex flex-col">
      <!-- 標題區域 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
          <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200">微地動監測</h4>
        </div>
        <span 
          class="px-2 py-0.5 rounded-full text-xs font-medium"
          :class="getStatusClass(status)"
        >
          {{ statusText }}
        </span>
      </div>
      
      <!-- 事件類型統計 -->
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800 text-center">
          <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">TYPE I</div>
          <div class="text-lg font-bold text-blue-700 dark:text-blue-300">{{ typeCounts.typeI }}</div>
        </div>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2.5 border border-yellow-200 dark:border-yellow-800 text-center">
          <div class="text-xs text-yellow-600 dark:text-yellow-400 mb-1">TYPE II</div>
          <div class="text-lg font-bold text-yellow-700 dark:text-yellow-300">{{ typeCounts.typeII }}</div>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 border border-red-200 dark:border-red-800 text-center">
          <div class="text-xs text-red-600 dark:text-red-400 mb-1">TYPE III</div>
          <div class="text-lg font-bold text-red-700 dark:text-red-300">{{ typeCounts.typeIII }}</div>
        </div>
      </div>
      
      <!-- 關鍵指標 -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-200 dark:border-gray-600">
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">今日事件總數</p>
          <p class="text-xl font-bold text-gray-800 dark:text-gray-200">
            {{ totalEvents }}
          </p>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 border border-gray-200 dark:border-gray-600">
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">最新事件</p>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {{ latestEventTime }}
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
  name: 'MicroseismicCard',
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
      if (!this.data || !Array.isArray(this.data.time_series) || this.data.time_series.length === 0) return [];
      
      try {
        // 只取當日的數據
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayStrCompact = todayStr.replace(/-/g, '');
        
        return this.data.time_series.filter(item => {
          if (!item) return false;
          const timeStr = item.time || item.timestamp || item.date || '';
          if (!timeStr) return false;
          return timeStr.includes(todayStr) || 
                 timeStr.includes(todayStrCompact) ||
                 timeStr.startsWith(todayStr) ||
                 timeStr.startsWith(todayStrCompact);
        });
      } catch (e) {
        console.warn('解析微地動時間序列數據時出錯:', e);
        return [];
      }
    },
    typeCounts() {
      const counts = { typeI: 0, typeII: 0, typeIII: 0 };
      
      this.timeSeries.forEach(item => {
        const type = item.type || item.Type || '';
        if (type === 'TYPE I') counts.typeI++;
        else if (type === 'TYPE II') counts.typeII++;
        else if (type === 'TYPE III') counts.typeIII++;
      });
      
      return counts;
    },
    totalEvents() {
      return this.typeCounts.typeI + this.typeCounts.typeII + this.typeCounts.typeIII;
    },
    latestEventTime() {
      if (this.timeSeries.length === 0) return '-';
      
      const latest = this.timeSeries[this.timeSeries.length - 1];
      const timeStr = latest.time || latest.timestamp || '';
      
      if (!timeStr) return '-';
      
      try {
        // 嘗試解析時間格式：2025-11-17-00-05-02
        const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[4]}:${match[5]}`;
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
    hourlyDistribution() {
      const distribution = {};
      const now = new Date();
      const currentHour = now.getHours();
      
      // 初始化最近6小時
      for (let i = 5; i >= 0; i--) {
        const hour = (currentHour - i + 24) % 24;
        distribution[hour] = 0;
      }
      
      // 統計每個小時的事件數
      this.timeSeries.forEach(item => {
        const timeStr = item.time || item.timestamp || '';
        const type = item.type || item.Type || '';
        
        // 只統計 TYPE I, II, III
        if (!['TYPE I', 'TYPE II', 'TYPE III'].includes(type)) return;
        
        try {
          const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
          if (match) {
            const hour = parseInt(match[4], 10);
            if (distribution.hasOwnProperty(hour)) {
              distribution[hour]++;
            }
          } else {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const hour = date.getHours();
              if (distribution.hasOwnProperty(hour)) {
                distribution[hour]++;
              }
            }
          }
        } catch (e) {
          // 忽略錯誤
        }
      });
      
      return distribution;
    },
    maxHourlyCount() {
      const values = Object.values(this.hourlyDistribution);
      if (values.length === 0) return 1;
      return Math.max(...values, 1);
    },
    status() {
      if (this.totalEvents === 0) return 'normal';
      if (this.typeCounts.typeIII > 0) return 'high';
      if (this.typeCounts.typeII > 0) return 'medium';
      return 'normal';
    },
    statusText() {
      const statusMap = {
        'high': '高風險',
        'medium': '中風險',
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
    getBarColor(count) {
      if (count === 0) return 'bg-gray-200 dark:bg-gray-600';
      if (count >= 3) return 'bg-red-500 dark:bg-red-600';
      if (count >= 2) return 'bg-yellow-500 dark:bg-yellow-600';
      return 'bg-blue-500 dark:bg-blue-600';
    }
  }
};
</script>

<style scoped>
.microseismic-card {
  min-height: 200px;
}
</style>
