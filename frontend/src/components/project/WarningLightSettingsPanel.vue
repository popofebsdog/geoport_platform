<template>
  <Teleport to="body">
    <div 
      v-if="isVisible"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      @click.self="handleClose"
    >
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        @click="handleClose"
      ></div>
      
      <!-- 設置面板 -->
      <div 
        class="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- 標題欄 -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">設置紅綠燈</h2>
          <button
            @click="handleClose"
            class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 內容區域 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="warningLights.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            目前沒有紅綠燈標記
          </div>
          
          <div v-else class="space-y-4">
            <div
              v-for="(light, index) in warningLights"
              :key="index"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
                  {{ light.routeName || `紅綠燈 ${index + 1}` }}
                </h3>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    座標: {{ light.lat?.toFixed(6) }}, {{ light.lng?.toFixed(6) }}
                  </span>
                </div>
              </div>
              
              <!-- 狀態選擇 -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  當前狀態
                </label>
                <div class="flex gap-2">
                  <button
                    @click="updateLightStatus(index, 'green')"
                    :class="[
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      light.currentLevel === 'green'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]"
                  >
                    綠燈
                  </button>
                  <button
                    @click="updateLightStatus(index, 'yellow')"
                    :class="[
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      light.currentLevel === 'yellow'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]"
                  >
                    黃燈
                  </button>
                  <button
                    @click="updateLightStatus(index, 'red')"
                    :class="[
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      light.currentLevel === 'red'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]"
                  >
                    紅燈
                  </button>
                </div>
              </div>
              
              <!-- 其他設置 -->
              <div class="space-y-2">
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="light.isRedLightOn"
                    @change="updateLightProperty(index, 'isRedLightOn', $event.target.checked)"
                    class="rounded border-gray-300 dark:border-gray-600"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">紅燈常亮</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="light.showSpecialAlert"
                    @change="updateLightProperty(index, 'showSpecialAlert', $event.target.checked)"
                    class="rounded border-gray-300 dark:border-gray-600"
                  >
                  <span class="text-sm text-gray-700 dark:text-gray-300">特殊告警</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部按鈕 -->
        <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="handleClose"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'WarningLightSettingsPanel',
  props: {
    warningLights: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'update'],
  computed: {
    isVisible() {
      return true
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    updateLightStatus(index, status) {
      const updatedLights = [...this.warningLights]
      updatedLights[index] = {
        ...updatedLights[index],
        currentLevel: status,
        currentLevelName: this.getLevelName(status)
      }
      this.$emit('update', updatedLights)
    },
    updateLightProperty(index, property, value) {
      const updatedLights = [...this.warningLights]
      updatedLights[index] = {
        ...updatedLights[index],
        [property]: value
      }
      this.$emit('update', updatedLights)
    },
    getLevelName(level) {
      const names = {
        green: '預警綠燈',
        yellow: '預警黃燈',
        red: '預警紅燈'
      }
      return names[level] || ''
    }
  }
}
</script>

<style scoped>
/* 自定義樣式 */
</style>

