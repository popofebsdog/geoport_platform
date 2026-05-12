<template>
  <!-- ── 面板容器（slide-in 動畫）── 把手跟著面板一起移動 -->
  <div
    class="absolute left-0 top-0 bottom-0 z-[1000] transition-transform duration-300 ease-in-out"
    style="width: 252px;"
    :style="isVisible ? 'transform: translateX(0)' : 'transform: translateX(-100%)'"
  >
    <!-- 面板主體 -->
    <div class="absolute inset-0 flex flex-col
                bg-white dark:bg-slate-900
                border-r border-gray-200 dark:border-slate-700/70
                shadow-2xl">

      <!-- 標頭 -->
      <div class="flex items-center justify-between px-4 py-3.5
                  border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight truncate">
            告警燈號狀態
          </h3>
          <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
            {{ alertLights.length > 0 ? `${alertLights.length} 個監測點` : '暫無設置' }}
          </p>
        </div>
      </div>

      <!-- 捲動內容區 -->
      <div class="flex-1 overflow-y-auto panel-scroll">

        <!-- 無資料 -->
        <div v-if="alertLights.length === 0"
             class="flex flex-col items-center justify-center h-40 gap-3 px-4 text-center">
          <div class="w-9 h-9 rounded-full flex items-center justify-center
                      bg-gray-100 dark:bg-slate-800">
            <svg class="w-5 h-5 text-gray-300 dark:text-slate-600"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <p class="text-xs text-gray-400 dark:text-slate-600">暫無告警燈號設置</p>
        </div>

        <!-- 燈號卡片列表 -->
        <div v-else class="p-3 space-y-2">
          <button
            v-for="(light, index) in alertLights"
            :key="light.id || index"
            @click.stop="handleLightClick(light)"
            class="w-full text-left px-3 py-3 rounded-xl border transition-all duration-150
                   active:scale-[0.985] focus:outline-none"
            :class="getLightCardClass(light)"
          >
            <!-- 里程 + 風險標籤 -->
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate mr-2">
                {{ light.mileage || '未命名' }}
              </span>
              <span class="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide
                           px-1.5 py-0.5 rounded-md"
                    :class="getLevelBadgeClass(light.current_level)">
                {{ getLevelShortText(light.current_level) }}
              </span>
            </div>

            <!-- 橫排三燈 -->
            <div class="flex items-center gap-2 mb-2">
              <span
                v-for="lv in ['red', 'yellow', 'green']"
                :key="lv"
                class="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-200"
                :class="getDotClass(lv, light)"
              ></span>
            </div>

            <!-- 狀態說明 -->
            <p class="text-[11px] font-medium leading-none"
               :class="getLevelTextClass(light.current_level)">
              {{ getLevelText(light.current_level) }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <!-- ── 統一展開/收合把手（固定於頂部，與面板起點一致）── -->
    <button
      @click.stop="isVisible ? handleClose() : $emit('expand')"
      class="absolute top-5 z-10 flex flex-col items-center justify-center gap-1
             w-5 rounded-r-xl shadow-md transition-colors duration-150
             bg-white dark:bg-slate-900
             border border-l-0 border-gray-200 dark:border-slate-700
             hover:bg-gray-50 dark:hover:bg-slate-800"
      style="left: 100%; height: 56px; padding: 6px 0;"
      :title="isVisible ? '收合面板' : '展開告警燈號'"
    >
      <!-- 迷你三燈指示（收合時才顯示，提示內容） -->
      <span v-if="!isVisible" class="flex flex-col items-center gap-[3px]">
        <span class="w-1.5 h-1.5 rounded-full bg-red-400/40"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-yellow-400/40"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]"></span>
      </span>
      <!-- 箭頭（方向隨狀態切換） -->
      <svg class="w-2.5 h-2.5 text-gray-400 dark:text-slate-500 transition-transform duration-300"
           :class="isVisible ? '' : 'rotate-180'"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
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
    // kept for parent compat – no longer used in template
    chartPanelCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'light-click', 'expand'],
  methods: {
    handleClose() {
      this.$emit('close');
    },
    handleLightClick(light) {
      this.$emit('light-click', light);
    },

    getLightCardClass(light) {
      const level = light.current_level || 'green';
      if (level === 'red') {
        return 'bg-red-50 border-red-200 hover:border-red-300 dark:bg-red-950/20 dark:border-red-900/40 dark:hover:border-red-700/60';
      }
      if (level === 'yellow') {
        return 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/40 dark:hover:border-yellow-700/60';
      }
      return 'bg-green-50 border-green-200 hover:border-green-300 dark:bg-green-950/20 dark:border-green-900/40 dark:hover:border-green-700/60';
    },

    getLevelBadgeClass(level) {
      if (level === 'red') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      if (level === 'yellow') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    },

    getLevelShortText(level) {
      return { red: '高風險', yellow: '中風險', green: '低風險' }[level] || '低風險';
    },

    getDotClass(dotLevel, light) {
      const currentLevel = light.current_level || 'green';
      const isActive = dotLevel === currentLevel || (dotLevel === 'red' && light.is_red_light_on);
      if (!isActive) return 'bg-gray-200 dark:bg-slate-700';
      if (dotLevel === 'red') return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]';
      if (dotLevel === 'yellow') return 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.65)]';
      return 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.65)]';
    },

    getLevelText(level) {
      return {
        red: '高機率發生落石',
        yellow: '中機率發生落石',
        green: '低機率發生落石'
      }[level] || '低機率發生落石';
    },

    getLevelTextClass(level) {
      return {
        red: 'text-red-600 dark:text-red-400',
        yellow: 'text-yellow-600 dark:text-yellow-400',
        green: 'text-green-600 dark:text-green-400'
      }[level] || 'text-green-600 dark:text-green-400';
    }
  }
};
</script>

<style scoped>
/* 隱藏 scrollbar 但保持滾動功能 */
.panel-scroll::-webkit-scrollbar {
  width: 0;
  display: none;
}
.panel-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
