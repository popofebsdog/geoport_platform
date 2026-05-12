<template>
  <div class="microseismic-card w-full h-full p-4 flex flex-col">
    <!-- 載入中 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-5 h-5 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"
             :style="isDarkMode ? 'border-color:#334155; border-top-color:#3b82f6;' : 'border-color:#dbeafe; border-top-color:#3b82f6;'"></div>
        <p class="text-xs" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">載入中...</p>
      </div>
    </div>

    <!-- 無數據 -->
    <div v-else-if="!data" class="flex items-center justify-center h-full">
      <div class="text-center" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">
        <svg class="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p class="text-xs">暫無數據</p>
      </div>
    </div>

    <!-- 有數據 -->
    <div v-else class="flex flex-col h-full gap-3">
      <!-- 標題列 -->
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold uppercase tracking-wider"
              :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">微地動監測</span>
        <span class="flex items-center gap-1.5 text-xs font-medium"
              :class="status === 'high' ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                    : status === 'medium' ? (isDarkMode ? 'text-amber-400' : 'text-amber-600')
                    : (isDarkMode ? 'text-green-400' : 'text-green-600')">
          <span class="w-1.5 h-1.5 rounded-full"
                :class="status === 'high' ? 'bg-red-500' : status === 'medium' ? 'bg-amber-500' : 'bg-green-500'"></span>
          {{ statusText }}
        </span>
      </div>

      <!-- 三欄計數 -->
      <div class="grid grid-cols-3 rounded overflow-hidden"
           :style="isDarkMode ? 'border:1px solid #1e293b;' : 'border:1px solid #f3f4f6;'">
        <div class="py-3 text-center min-w-0"
             :style="isDarkMode ? 'border-right:1px solid #1e293b;' : 'border-right:1px solid #f3f4f6;'">
          <div class="text-[10px] font-medium tracking-wide mb-1"
               :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">TYPE I</div>
          <div class="text-xl font-semibold tabular-nums"
               :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ typeCounts.typeI }}</div>
        </div>
        <div class="py-3 text-center min-w-0"
             :style="isDarkMode ? 'border-right:1px solid #1e293b;' : 'border-right:1px solid #f3f4f6;'">
          <div class="text-[10px] font-medium tracking-wide mb-1"
               :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">TYPE II</div>
          <div class="text-xl font-semibold tabular-nums"
               :class="isDarkMode ? 'text-amber-400' : 'text-amber-600'">{{ typeCounts.typeII }}</div>
        </div>
        <div class="py-3 text-center min-w-0">
          <div class="text-[10px] font-medium tracking-wide mb-1"
               :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">TYPE III</div>
          <div class="text-xl font-semibold tabular-nums"
               :class="isDarkMode ? 'text-red-400' : 'text-red-600'">{{ typeCounts.typeIII }}</div>
        </div>
      </div>

      <!-- 分隔線 -->
      <div class="h-px" :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-100'"></div>

      <!-- 指標列表 -->
      <div class="space-y-2 flex-1">
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">今日事件總數</span>
          <span class="text-sm font-semibold tabular-nums"
                :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ totalEvents }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">最新事件</span>
          <span class="text-sm font-semibold tabular-nums"
                :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">{{ latestEventTime }}</span>
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
  name: 'MicroseismicCard',
  props: {
    data: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
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
