<template>
  <!-- 展開按鈕（面板收起時顯示） -->
  <button
    v-if="!isVisible"
    @click.stop="$emit('expand')"
    class="absolute left-0 top-1/2 -translate-y-1/2 z-[1001] bg-white dark:bg-gray-800 rounded-r-lg shadow-lg p-2 border-r border-y border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors pointer-events-auto"
    title="展開告警燈號狀態"
  >
    <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
    </svg>
  </button>
  
  <!-- 面板容器（包含面板和收合按鈕） -->
  <div 
    class="absolute left-0 top-0 bottom-0 w-[21rem] z-[1000] transition-transform duration-300 ease-in-out"
    :style="isVisible ? 'transform: translateX(0);' : 'transform: translateX(-100%);'"
  >
    <!-- 面板 -->
    <div 
      class="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col"
    >
      <!-- 標題欄 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">告警燈號狀態</h3>
      </div>
      
      <!-- 內容區域 -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div v-if="alertLights.length === 0" class="text-center py-8 w-full">
          <div class="text-gray-400 dark:text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <p class="text-sm">暫無告警燈號設置</p>
          </div>
        </div>
        
        <!-- 收起狀態：2x2 網格 -->
        <template v-else-if="chartPanelCollapsed">
          <div class="grid grid-cols-2 gap-4 w-full">
            <div
              v-for="(item, index) in collapsedDisplayItems"
              :key="item.key || index"
              class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-shadow"
              :class="item.light ? 'hover:shadow-md cursor-pointer' : 'opacity-30'"
              @click="item.light && handleLightClick(item.light)"
            >
              <template v-if="item.light">
                <!-- 里程數（居中，樣式與標題一致） -->
                <div class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                  {{ item.light.mileage || '-' }}
                </div>
                
                <!-- 紅綠燈顯示 -->
                <div class="flex justify-center mb-2">
                  <div class="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border-2"
                       :class="getLightBorderClass(item.light.current_level)">
                    <!-- 紅燈 (上) -->
                    <div class="mb-1">
                      <div 
                        class="w-8 h-8 rounded-full border-2 mx-auto"
                        :class="getLightClass('red', item.light)"
                      ></div>
                    </div>
                    
                    <!-- 黃燈 (中) -->
                    <div class="mb-1">
                      <div 
                        class="w-8 h-8 rounded-full border-2 mx-auto"
                        :class="getLightClass('yellow', item.light)"
                      ></div>
                    </div>
                    
                    <!-- 綠燈 (下) -->
                    <div>
                      <div 
                        class="w-8 h-8 rounded-full border-2 mx-auto"
                        :class="getLightClass('green', item.light)"
                      ></div>
                    </div>
                  </div>
                </div>
                
                <!-- 燈號說明 -->
                <div class="text-xs text-center font-medium"
                     :class="getLevelTextClass(item.light.current_level)">
                  {{ getLevelText(item.light.current_level) }}
                </div>
              </template>
              <!-- 空位（完整容器） -->
              <template v-else>
                <!-- 里程數（佔位） -->
                <div class="text-lg font-semibold text-gray-300 dark:text-gray-600 mb-3 text-center">
                  -
                </div>
                
                <!-- 紅綠燈顯示（佔位） -->
                <div class="flex justify-center mb-2">
                  <div class="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border-2 border-gray-600 dark:border-gray-700">
                    <!-- 紅燈 (上) -->
                    <div class="mb-1">
                      <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                    </div>
                    
                    <!-- 黃燈 (中) -->
                    <div class="mb-1">
                      <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                    </div>
                    
                    <!-- 綠燈 (下) -->
                    <div>
                      <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                    </div>
                  </div>
                </div>
                
                <!-- 燈號說明（佔位） -->
                <div class="text-xs text-center font-medium text-gray-400 dark:text-gray-500">
                  -
                </div>
              </template>
            </div>
          </div>
        </template>
        
        <!-- 展開狀態：1x2 水平佈局，帶分頁 -->
        <template v-else>
          <div class="w-full flex flex-col items-center">
            <!-- 卡片區域 -->
            <div class="grid grid-cols-2 gap-4 w-full mb-4">
              <div
                v-for="(item, index) in expandedDisplayItems"
                :key="item.key || index"
                class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 transition-shadow"
                :class="item.light ? 'hover:shadow-md cursor-pointer' : 'opacity-30'"
                @click="item.light && handleLightClick(item.light)"
              >
                <template v-if="item.light">
                  <!-- 里程數（居中，樣式與標題一致） -->
                  <div class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 text-center">
                    {{ item.light.mileage || '-' }}
                  </div>
                  
                  <!-- 紅綠燈顯示 -->
                  <div class="flex justify-center mb-2">
                    <div class="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border-2"
                         :class="getLightBorderClass(item.light.current_level)">
                      <!-- 紅燈 (上) -->
                      <div class="mb-1">
                        <div 
                          class="w-8 h-8 rounded-full border-2 mx-auto"
                          :class="getLightClass('red', item.light)"
                        ></div>
                      </div>
                      
                      <!-- 黃燈 (中) -->
                      <div class="mb-1">
                        <div 
                          class="w-8 h-8 rounded-full border-2 mx-auto"
                          :class="getLightClass('yellow', item.light)"
                        ></div>
                      </div>
                      
                      <!-- 綠燈 (下) -->
                      <div>
                        <div 
                          class="w-8 h-8 rounded-full border-2 mx-auto"
                          :class="getLightClass('green', item.light)"
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 燈號說明 -->
                  <div class="text-xs text-center font-medium"
                       :class="getLevelTextClass(item.light.current_level)">
                    {{ getLevelText(item.light.current_level) }}
                  </div>
                </template>
                <!-- 空位（完整容器） -->
                <template v-else>
                  <!-- 里程數（佔位） -->
                  <div class="text-lg font-semibold text-gray-300 dark:text-gray-600 mb-3 text-center">
                    -
                  </div>
                  
                  <!-- 紅綠燈顯示（佔位） -->
                  <div class="flex justify-center mb-2">
                    <div class="bg-gray-800 dark:bg-gray-900 rounded-lg p-2 border-2 border-gray-600 dark:border-gray-700">
                      <!-- 紅燈 (上) -->
                      <div class="mb-1">
                        <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                      </div>
                      
                      <!-- 黃燈 (中) -->
                      <div class="mb-1">
                        <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                      </div>
                      
                      <!-- 綠燈 (下) -->
                      <div>
                        <div class="w-8 h-8 rounded-full border-2 mx-auto bg-gray-700 dark:bg-gray-800 border-gray-600 dark:border-gray-700"></div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 燈號說明（佔位） -->
                  <div class="text-xs text-center font-medium text-gray-400 dark:text-gray-500">
                    -
                  </div>
                </template>
              </div>
            </div>
            
            <!-- 分頁控制（僅在展開狀態且超過2個時顯示） -->
            <div v-if="totalPages > 1" class="flex items-center gap-2 mt-2">
              <button
                @click.stop="currentPage = Math.max(1, currentPage - 1)"
                :disabled="currentPage === 1"
                class="p-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :class="currentPage === 1 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                title="上一頁"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <span class="text-xs text-gray-600 dark:text-gray-400 px-2">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click.stop="currentPage = Math.min(totalPages, currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="p-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :class="currentPage === totalPages 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                title="下一頁"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 收合按鈕（跟隨面板一起動畫） -->
    <button
      v-if="isVisible"
      @click.stop="handleClose"
      class="absolute left-[20rem] top-1/2 -translate-y-1/2 z-[1001] bg-white dark:bg-gray-800 rounded-r-lg shadow-lg p-2 border-r border-y border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      style="pointer-events: auto;"
      title="收合面板"
    >
      <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: 'AlertLightStatusPanel',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    alertLights: {
      type: Array,
      default: () => []
    },
    chartPanelCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'light-click', 'expand'],
  data() {
    return {
      currentPage: 1 // 當前頁碼（展開狀態下使用）
    };
  },
  computed: {
    // 收起狀態下的顯示項目（2x2，最多4個，不足用空位填充）
    collapsedDisplayItems() {
      const items = [];
      const maxItems = 4; // 2x2 = 4個
      
      // 填充實際的燈號
      for (let i = 0; i < Math.min(this.alertLights.length, maxItems); i++) {
        items.push({
          key: `light-${i}`,
          light: this.alertLights[i]
        });
      }
      
      // 填充空位
      while (items.length < maxItems) {
        items.push({
          key: `empty-${items.length}`,
          light: null
        });
      }
      
      return items;
    },
    // 展開狀態下的顯示項目（1x2，每頁2個）
    expandedDisplayItems() {
      const itemsPerPage = 2;
      const startIndex = (this.currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const items = [];
      
      // 獲取當前頁的燈號
      const currentPageLights = this.alertLights.slice(startIndex, endIndex);
      
      // 填充實際的燈號
      currentPageLights.forEach((light, index) => {
        items.push({
          key: `light-${startIndex + index}`,
          light: light
        });
      });
      
      // 如果當前頁不足2個，填充空位
      while (items.length < itemsPerPage) {
        items.push({
          key: `empty-${items.length}`,
          light: null
        });
      }
      
      return items;
    },
    // 總頁數（展開狀態下）
    totalPages() {
      if (this.chartPanelCollapsed) return 1;
      return Math.ceil(this.alertLights.length / 2);
    }
  },
  watch: {
    // 當面板狀態改變時，重置頁碼
    chartPanelCollapsed() {
      this.currentPage = 1;
    },
    // 當燈號數量改變時，調整頁碼
    alertLights: {
      handler() {
        if (this.currentPage > this.totalPages) {
          this.currentPage = Math.max(1, this.totalPages);
        }
      },
      deep: true
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    },
    handleLightClick(light) {
      this.$emit('light-click', light);
    },
    getLightClass(level, light) {
      const currentLevel = light.current_level || 'green';
      const isRedLightOn = light.is_red_light_on || false;
      
      if (level === 'red') {
        if (currentLevel === 'red' || isRedLightOn) {
          return 'bg-red-500 border-red-300 shadow-lg shadow-red-500/50';
        }
        return 'bg-gray-700 border-gray-600';
      } else if (level === 'yellow') {
        if (currentLevel === 'yellow') {
          return 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/50';
        }
        return 'bg-gray-700 border-gray-600';
      } else if (level === 'green') {
        if (currentLevel === 'green') {
          return 'bg-green-500 border-green-300 shadow-lg shadow-green-500/50';
        }
        return 'bg-gray-700 border-gray-600';
      }
      return 'bg-gray-700 border-gray-600';
    },
    getLightBorderClass(level) {
      const levelMap = {
        'red': 'border-red-500',
        'yellow': 'border-yellow-400',
        'green': 'border-green-500'
      };
      return levelMap[level] || 'border-gray-600';
    },
    getLevelText(level) {
      const textMap = {
        'red': '高機率發生落石',
        'yellow': '中機率發生落石',
        'green': '低機率發生落石'
      };
      return textMap[level] || '低機率發生落石';
    },
    getLevelTextClass(level) {
      const classMap = {
        'red': 'text-red-600 dark:text-red-400',
        'yellow': 'text-yellow-600 dark:text-yellow-400',
        'green': 'text-green-600 dark:text-green-400'
      };
      return classMap[level] || 'text-green-600 dark:text-green-400';
    }
  }
};
</script>

<style scoped>
/* 確保面板在正確的 z-index 層級 */
</style>

