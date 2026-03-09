<template>
  <div class="strong-motion-card w-full h-full p-4 flex flex-col">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-xs text-gray-500 dark:text-gray-400">載入中...</p>
      </div>
    </div>
    
    <div v-else class="flex flex-col h-full">
      <!-- 標題 -->
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-3">
        <h4 class="text-center text-sm font-bold text-gray-800 dark:text-gray-200">
          Ground Motion Condition for Early Warning
        </h4>
      </div>
      
      <!-- 當前摘要 -->
      <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-3">
        <div class="text-center text-xs text-gray-600 dark:text-gray-400">
          Current Summary {{ formatCurrentTime() }}
        </div>
      </div>
      
      <!-- 警報等級指示器 -->
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div 
          class="flex items-center justify-center py-2 rounded text-xs font-medium"
          :class="alarmLevel === 'high' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
        >
          <span class="w-3 h-3 rounded-full mr-1" :class="alarmLevel === 'high' ? 'bg-white' : 'bg-gray-400'"></span>
          >80gal
        </div>
        <div 
          class="flex items-center justify-center py-2 rounded text-xs font-medium"
          :class="alarmLevel === 'medium' ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
        >
          <span class="w-3 h-3 rounded-full mr-1" :class="alarmLevel === 'medium' ? 'bg-white' : 'bg-gray-400'"></span>
          25~80gal
        </div>
        <div 
          class="flex items-center justify-center py-2 rounded text-xs font-medium"
          :class="alarmLevel === 'low' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
        >
          <span class="w-3 h-3 rounded-full mr-1" :class="alarmLevel === 'low' ? 'bg-white' : 'bg-gray-400'"></span>
          NO ALARM
        </div>
      </div>
      
      <!-- 主要參數 -->
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
        <div class="grid grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PGA</div>
            <div class="text-base font-bold text-gray-900 dark:text-gray-100">{{ formatValue(pga) }} gal</div>
          </div>
          <div>
            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">PGV</div>
            <div class="text-base font-bold text-gray-900 dark:text-gray-100">{{ formatValue(pgv) }} cm/s</div>
          </div>
          <div>
            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead Time</div>
            <div class="text-base font-bold text-gray-900 dark:text-gray-100">{{ formatValue(leadTime) }} sec</div>
          </div>
          <div>
            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Intensity</div>
            <div class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ intensityLevel }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StrongMotionCard',
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
    // 检测是否为地震事件数据
    isEventData() {
      return this.data && 
             this.data.parsed && 
             this.data.parsed.metadata && 
             this.data.parsed.timeSeries && 
             this.data.parsed.timeSeries.length > 1000;
    },
    // 检查是否为今日数据
    isEventToday() {
      if (!this.isEventData) return true; // 非事件数据默认显示
      
      const startTime = this.data.parsed.metadata.startTime;
      try {
        const match = startTime.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (match) {
          const eventDate = `${match[1]}-${match[2]}-${match[3]}`;
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          return eventDate === todayStr;
        }
      } catch (e) {
        console.warn('解析地震事件日期失敗:', e);
      }
      return false;
    },
    // 是否应该显示数据（事件数据必须是今日的）
    shouldShowData() {
      if (!this.data) return false;
      if (this.isEventData) {
        return this.isEventToday;
      }
      return true;
    },
    timeSeries() {
      if (!this.data) return [];
      
      try {
        // 地震事件模式：使用parsed.timeSeries
        if (this.isEventData) {
          return this.data.parsed.timeSeries;
        }
        
        // 日常监测模式
        if (Array.isArray(this.data.time_series) && this.data.time_series.length > 0) {
          return this.data.time_series;
        }
        
        if (Array.isArray(this.data.values) && Array.isArray(this.data.labels)) {
          return this.data.labels.map((label, index) => ({
            time: label,
            acceleration: this.data.values[index] || 0,
            absAcceleration: this.data.values[index] || 0
          }));
        }
      } catch (e) {
        console.warn('解析強地動時間序列數據時出錯:', e);
      }
      
      return [];
    },
    maxAcceleration() {
      // 如果不是今日数据，返回0
      if (!this.shouldShowData) return 0;
      if (!this.data) return 0;
      
      // 從 time_series 中找最大值
      if (this.timeSeries.length > 0) {
        const max = Math.max(...this.timeSeries.map(item => 
          parseFloat(item.absAcceleration || item.acceleration || item.value || 0)
        ));
        return max > 0 ? max : 0;
      }
      
      return this.data.max_acceleration || 
             this.data.max_acc || 
             this.data.peak_acceleration ||
             this.data.max_value ||
             0;
    },
    pga() {
      // 如果不是今日数据，返回null（显示--）
      if (!this.shouldShowData) return null;
      if (!this.data) return null;
      
      // 優先使用解析後的 PGA
      if (this.data.pga !== null && this.data.pga !== undefined) {
        return this.data.pga;
      }
      
      // 如果沒有 PGA，使用最大加速度
      return this.maxAcceleration || null;
    },
    peakTime() {
      // 地震事件模式：使用metadata.startTime
      if (this.isEventData && this.data.parsed.metadata.startTime) {
        try {
          // 解析 "2025/11/02-15:09:46.80" 格式
          const startTime = this.data.parsed.metadata.startTime;
          const match = startTime.match(/(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2}):(\d{2})/);
          if (match) {
            return `${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
          }
          return startTime;
        } catch (e) {
          console.warn('解析地震事件时间失败:', e);
        }
      }
      
      // 日常监测模式：从timeSeries中查找峰值时间
      if (this.timeSeries.length === 0) return '-';
      
      // 找到峰值對應的時間
      const peakItem = this.timeSeries.reduce((max, item) => {
        const current = parseFloat(item.absAcceleration || item.acceleration || item.value || 0);
        const maxValue = parseFloat(max.absAcceleration || max.acceleration || max.value || 0);
        return current > maxValue ? item : max;
      }, this.timeSeries[0]);
      
      const timeStr = peakItem.time || peakItem.timestamp || '';
      if (!timeStr) return '-';
      
      // 確保 timeStr 是字符串
      const str = String(timeStr);
      
      try {
        const match = str.match(/(\d{2}):(\d{2})/);
        if (match) {
          return `${match[1]}:${match[2]}`;
        }
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        // 忽略錯誤
      }
      
      // 確保是字符串後再使用 substring
      if (typeof str === 'string' && str.length >= 5) {
        return str.substring(0, 5);
      }
      return '-';
    },
    intensityLevel() {
      const value = this.pga || this.maxAcceleration;
      if (value === null || value === undefined) return '--';
      
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue === 0) return '0';
      
      // 根據PGA判斷強度等級（返回數字）
      if (numValue >= 400) return '7';
      if (numValue >= 250) return '6';
      if (numValue >= 160) return '5';
      if (numValue >= 80) return '4';
      if (numValue >= 25) return '3';
      if (numValue >= 8) return '2';
      return '1';
    },
    pgv() {
      // PGV (Peak Ground Velocity) - 目前API没有此数据，显示 --
      if (!this.shouldShowData || !this.data) return null;
      return this.data.pgv || this.data.peak_velocity || null;
    },
    leadTime() {
      // Lead Time - 预警提前时间 - 目前API没有此数据，显示 --
      if (!this.shouldShowData || !this.data) return null;
      return this.data.lead_time || this.data.leadTime || null;
    },
    alarmLevel() {
      const value = this.pga;
      if (value === null || value === undefined) return 'low'; // 无数据时显示 NO ALARM
      
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue === 0) return 'low';
      
      // 根据PGA判断警报等级
      if (numValue > 80) return 'high'; // 红色 - >80gal
      if (numValue >= 25 && numValue <= 80) return 'medium'; // 黄色 - 25~80gal
      return 'low'; // 绿色 - NO ALARM (<25gal)
    },
    status() {
      const pga = this.pga || this.maxAcceleration;
      if (pga === null || pga === undefined) return 'unknown';
      
      const numValue = parseFloat(pga);
      if (isNaN(numValue)) return 'unknown';
      
      // 根據PGA判斷狀態
      if (numValue >= 400) return 'high'; // 強震
      if (numValue >= 200) return 'medium'; // 中震
      return 'normal'; // 弱震
    },
    statusText() {
      const statusMap = {
        'high': '強震',
        'medium': '中震',
        'normal': '正常',
        'unknown': '未知'
      };
      return statusMap[this.status] || '未知';
    },
  },
  methods: {
    formatValue(value) {
      if (value === null || value === undefined) return '--';
      const num = parseFloat(value);
      if (isNaN(num)) return '--';
      return num.toFixed(1);
    },
    formatCurrentTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // Format: 2025-11-19 01:36:08 (UTC+0)
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (UTC+8)`;
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
  }
};
</script>

<style scoped>
.strong-motion-card {
  min-height: 200px;
}
</style>
