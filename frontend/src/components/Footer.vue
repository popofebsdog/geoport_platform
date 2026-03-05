<template>
  <!-- 戰情儀表板底部狀態欄 -->
  <footer class="border-t py-3 flex-shrink-0 transition-colors duration-300" 
          :class="isDarkMode ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-r from-white via-gray-50 to-white border-gray-200'">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg transition-colors duration-300 flex items-center justify-center"
                 :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'">
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-semibold transition-colors duration-300" 
                    :class="isDarkMode ? 'text-slate-200' : 'text-gray-800'">
                GeoPORTech 山區公路防災預警系統
              </span>
              <span class="text-xs transition-colors duration-300" 
                    :class="isDarkMode ? 'text-slate-400' : 'text-gray-600'">
                數位科技整合應用戰情儀表板
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
  props: {
    isDarkMode: {
      type: Boolean,
      default: false
    }
  }
}
</script>
