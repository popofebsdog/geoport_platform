<template>
  <div v-if="show" class="fixed inset-0 z-[1300] bg-black bg-opacity-70 flex items-center justify-center">
    <div class="text-center">
      <!-- 載入動畫 -->
      <div class="relative w-16 h-16 mx-auto mb-4">
        <div class="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin"></div>
        <div class="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <!-- 載入文字 -->
      <div class="text-white text-lg font-medium mb-2">{{ title }}</div>
      <div class="text-gray-300 text-sm">{{ message }}</div>
      
      <!-- 進度條（可選） -->
      <div v-if="showProgress && progress >= 0" class="mt-4 w-64 mx-auto">
        <div class="bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            class="bg-blue-600 h-full transition-all duration-300 ease-out"
            :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
          ></div>
        </div>
        <div class="text-gray-300 text-xs mt-2">{{ Math.round(progress) }}%</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FullScreenLoader',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '處理中...'
    },
    message: {
      type: String,
      default: '請稍候'
    },
    showProgress: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: -1
    }
  }
}
</script>

<style scoped>
/* 確保動畫流暢 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
