<template>
  <div class="w-full">
    <!-- 示警燈號和說明（合併為一個區域） -->
    <div class="card">
      <!-- 示警燈號 -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">示警燈號</h3>
        
        <div class="bg-black rounded-lg p-6 text-center">
          <!-- 路線資訊 -->
          <h4 class="text-white font-bold mb-1">{{ routeName }}</h4>
          <p class="text-gray-400 text-xs mb-4">{{ routeDescription }}</p>
          
          <!-- 紅綠燈顯示 -->
          <div class="flex justify-center mb-4">
            <div 
              class="bg-gray-800 rounded-lg p-3 border-2 transition-all duration-300"
              :class="showSpecialAlert 
                ? 'border-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                : 'border-gray-600'"
            >
              <!-- 紅燈 (上) -->
              <div class="mb-2">
                <div 
                  class="w-8 h-8 rounded-full border-2 transition-all duration-300"
                  :class="isRedLightOn 
                    ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50'
                    : 'bg-gray-800 border-gray-700'"
                ></div>
              </div>
              
              <!-- 黃燈 (中) -->
              <div class="mb-2">
                <div 
                  class="w-8 h-8 rounded-full border-2 transition-all duration-300"
                  :class="currentLevel === 'yellow' 
                    ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/50' 
                    : 'bg-gray-800 border-gray-700'"
                ></div>
              </div>
              
              <!-- 綠燈 (下) -->
              <div>
                <div 
                  class="w-8 h-8 rounded-full border-2 transition-all duration-300"
                  :class="currentLevel === 'green' 
                    ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50' 
                    : 'bg-gray-800 border-gray-700'"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- 當前狀態顯示 -->
          <div class="mb-4">
            <div class="text-lg font-bold mb-1" :class="currentLevelColor">
              {{ currentLevelName }}
            </div>
            <div class="text-sm text-gray-300">
              {{ currentLevelDescription }}
            </div>
            <div v-if="showSpecialAlert" class="text-xs text-red-400 mt-1 animate-bounce">
              特殊顯示中 ({{ specialAlertCountdown }}s)
            </div>
          </div>
          
          <!-- 控制按鈕 -->
          <div class="space-y-2">
            <div class="flex justify-center gap-1 flex-wrap">
              <button 
                @click="$emit('set-light-status', 'green')"
                class="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                綠燈
              </button>
              <button 
                @click="$emit('set-light-status', 'yellow')"
                class="px-2 py-1 rounded text-xs bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
              >
                黃燈
              </button>
              <button 
                @click="$emit('set-light-status', 'red')"
                class="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                紅燈
              </button>
              <button 
                @click="$emit('set-light-status', 'night')"
                class="px-2 py-1 rounded text-xs bg-red-700 text-white hover:bg-red-800 transition-colors"
              >
                夜間
              </button>
              <button 
                @click="$emit('set-light-status', 'alert')"
                class="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                告警
              </button>
            </div>
            
            <div class="flex justify-center gap-2">
              <button 
                @click="$emit('trigger-special-alert')"
                class="px-3 py-1 rounded text-xs transition-colors"
                :class="showSpecialAlert 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'"
                :disabled="showSpecialAlert"
              >
                {{ showSpecialAlert ? `特殊告警中` : '觸發告警紅燈' }}
              </button>
              <button 
                @click="$emit('toggle-auto-mode')"
                class="px-3 py-1 rounded text-xs transition-colors"
                :class="autoLightMode 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'"
              >
                {{ autoLightMode ? '自動模式' : '手動模式' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 示警說明 -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-4">示警說明</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3 p-2 bg-green-50 rounded">
            <div class="w-4 h-4 rounded-full bg-green-500"></div>
            <div>
              <div class="font-medium text-green-800">預警綠燈</div>
              <div class="text-green-600 text-xs">低落石風險 小心通行</div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-2 bg-yellow-50 rounded">
            <div class="w-4 h-4 rounded-full bg-yellow-400"></div>
            <div>
              <div class="font-medium text-yellow-800">預警黃燈</div>
              <div class="text-yellow-600 text-xs">低落石風險 快速通行</div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-2 bg-red-50 rounded">
            <div class="w-4 h-4 rounded-full bg-red-500"></div>
            <div>
              <div class="font-medium text-red-800">預警紅燈</div>
              <div class="text-red-600 text-xs">低落石風險 管制通行</div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-2 bg-red-100 rounded">
            <div class="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
            <div>
              <div class="font-medium text-red-900">告警紅燈</div>
              <div class="text-red-700 text-xs">前有落石 禁止通行</div>
              <div class="text-red-500 text-xs">(警示1分鐘)</div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-2 bg-red-100 rounded">
            <div class="w-4 h-4 rounded-full bg-red-600"></div>
            <div>
              <div class="font-medium text-red-900">告警紅燈</div>
              <div class="text-red-700 text-xs">前有落石 禁止通行</div>
            </div>
          </div>
          
          <div class="flex items-center gap-3 p-2 bg-gray-100 rounded">
            <div class="w-4 h-4 rounded-full bg-red-700"></div>
            <div>
              <div class="font-medium text-gray-800">夜間紅燈</div>
              <div class="text-gray-600 text-xs">落石風險區，夜間禁止通行</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WarningLightContent',
  props: {
    routeName: {
      type: String,
      required: true
    },
    routeDescription: {
      type: String,
      default: ''
    },
    currentLevel: {
      type: String,
      default: 'green'
    },
    currentLevelName: {
      type: String,
      default: ''
    },
    currentLevelDescription: {
      type: String,
      default: ''
    },
    currentLevelColor: {
      type: String,
      default: 'text-gray-400'
    },
    isRedLightOn: {
      type: Boolean,
      default: false
    },
    showSpecialAlert: {
      type: Boolean,
      default: false
    },
    specialAlertCountdown: {
      type: Number,
      default: 0
    },
    autoLightMode: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'set-light-status',
    'trigger-special-alert',
    'toggle-auto-mode'
  ]
}
</script>

<style scoped>
.card {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.dark .card {
  background-color: #1e293b;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.15);
}

.dark .text-gray-900 {
  color: #f1f5f9;
}

.dark .text-gray-300 {
  color: #cbd5e1;
}

.dark .text-gray-400 {
  color: #94a3b8;
}

.dark .text-gray-600 {
  color: #64748b;
}

.dark .bg-gray-800 {
  background-color: #1e293b;
}

.dark .border-gray-700 {
  border-color: #334155;
}

.dark .bg-green-600 {
  background-color: #059669;
}

.dark .hover\:bg-green-700:hover {
  background-color: #047857;
}

.dark .bg-yellow-500 {
  background-color: #eab308;
}

.dark .hover\:bg-yellow-600:hover {
  background-color: #d97706;
}

.dark .bg-red-500 {
  background-color: #ef4444;
}

.dark .hover\:bg-red-600:hover {
  background-color: #dc2626;
}

.dark .bg-red-700 {
  background-color: #b91c1c;
}

.dark .hover\:bg-red-800:hover {
  background-color: #991b1b;
}

.dark .bg-gray-600 {
  background-color: #475569;
}

.dark .hover\:bg-gray-700:hover {
  background-color: #334155;
}

.dark .bg-green-50 {
  background-color: #f0fdf4;
}

.dark .text-green-800 {
  color: #166534;
}

.dark .text-green-600 {
  color: #22c55e;
}

.dark .bg-yellow-50 {
  background-color: #fffbeb;
}

.dark .text-yellow-800 {
  color: #92400e;
}

.dark .text-yellow-600 {
  color: #eab308;
}

.dark .bg-red-50 {
  background-color: #fef2f2;
}

.dark .text-red-800 {
  color: #991b1b;
}

.dark .text-red-600 {
  color: #ef4444;
}

.dark .bg-red-100 {
  background-color: #fee2e2;
}

.dark .text-red-900 {
  color: #7f1d1d;
}

.dark .text-red-700 {
  color: #dc2626;
}

.dark .bg-gray-100 {
  background-color: #f3f4f6;
}
</style>

