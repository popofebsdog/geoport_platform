<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 transition-opacity duration-300"
        :class="isDarkMode ? 'bg-black/70' : 'bg-black/50'"
        @click="handleClose"
      ></div>
      
      <!-- 模態框內容 -->
      <div 
        class="relative w-full max-w-md rounded-2xl shadow-2xl transition-all duration-300 transform"
        :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
      >
        <!-- 標題列 -->
        <div 
          class="flex items-center justify-between p-6 border-b"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <div class="flex items-center space-x-3">
            <!-- 災點圖標 -->
            <div class="p-2 rounded-lg" :class="isDarkMode ? 'bg-red-600/20' : 'bg-red-100'">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                新增災點紀錄
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                選擇輸入座標的方式
              </p>
            </div>
          </div>
          
          <!-- 關閉按鈕 -->
          <button
            @click="handleClose"
            class="p-2 rounded-lg transition-all duration-300"
            :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 選擇按鈕區域 -->
        <div class="p-6 space-y-4">
          <!-- 地圖點擊位置 -->
          <button
            @click="selectMapClick"
            class="w-full p-6 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center space-y-3"
            :class="isDarkMode 
              ? 'border-slate-600 hover:border-blue-500 bg-slate-700/50 hover:bg-slate-700' 
              : 'border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50'"
          >
            <div class="p-3 rounded-full" :class="isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
            </div>
            <div class="text-center">
              <h4 class="font-semibold text-lg mb-1" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                地圖點擊位置
              </h4>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                點擊地圖上的位置來標記災點
              </p>
            </div>
          </button>
          
          <!-- 輸入座標位置 -->
          <button
            @click="selectManualInput"
            class="w-full p-6 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center space-y-3"
            :class="isDarkMode 
              ? 'border-slate-600 hover:border-green-500 bg-slate-700/50 hover:bg-slate-700' 
              : 'border-gray-300 hover:border-green-500 bg-gray-50 hover:bg-green-50'"
          >
            <div class="p-3 rounded-full" :class="isDarkMode ? 'bg-green-600/20' : 'bg-green-100'">
              <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </div>
            <div class="text-center">
              <h4 class="font-semibold text-lg mb-1" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                輸入座標位置
              </h4>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                直接在表單中輸入緯度和經度
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'DisasterPointModeSelectModal',
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'select-map-click', 'select-manual-input'],
  methods: {
    handleClose() {
      this.$emit('close')
    },
    selectMapClick() {
      this.$emit('select-map-click')
    },
    selectManualInput() {
      this.$emit('select-manual-input')
    }
  }
}
</script>

