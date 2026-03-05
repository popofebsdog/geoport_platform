<template>
  <!-- 背景遮罩 -->
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] transition-opacity duration-300"
       @click="handleBackdropClick">
    <!-- 提示視窗 -->
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300"
         :class="[
           isDarkMode ? 'bg-slate-800' : 'bg-white',
           show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
         ]"
         @click.stop>
      
      <!-- 標題欄 -->
      <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <div class="flex items-center space-x-3">
          <!-- 圖標 -->
          <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
               :class="getIconClass()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="type === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              <path v-else-if="type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              <path v-else-if="type === 'error'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          
          <!-- 標題 -->
          <h3 class="text-sm font-semibold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ title }}
          </h3>
        </div>
        
        <!-- 關閉按鈕 -->
        <button v-if="showCloseButton" @click="close"
                class="p-1 rounded-md transition-colors duration-300"
                :class="isDarkMode ? 
                  'hover:bg-slate-700 text-gray-400 hover:text-gray-300' : 
                  'hover:bg-gray-100 text-gray-400 hover:text-gray-600'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 內容區域 -->
      <div class="p-6">
        <p class="text-base leading-relaxed transition-colors duration-300 whitespace-pre-line"
           :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
          {{ message }}
        </p>
      </div>
      
      <!-- 按鈕區域 -->
      <div class="flex justify-end space-x-3 p-6 pt-0">
        <button v-if="showCancelButton" @click="handleCancel"
                class="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                :class="isDarkMode ? 
                  'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                  'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
          {{ cancelText }}
        </button>
        <button @click="handleConfirm"
                class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-300"
                :class="getConfirmButtonClass()">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomAlert',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'info', // success, warning, error, info
      validator: (value) => ['success', 'warning', 'error', 'info'].includes(value)
    },
    title: {
      type: String,
      default: '提示'
    },
    message: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: '確定'
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    showCancelButton: {
      type: Boolean,
      default: false
    },
    showCloseButton: {
      type: Boolean,
      default: true
    },
    closeOnBackdrop: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel', 'close'],
  methods: {
    handleConfirm() {
      this.$emit('confirm')
    },
    handleCancel() {
      this.$emit('cancel')
    },
    close() {
      this.$emit('close')
    },
    handleBackdropClick() {
      if (this.closeOnBackdrop) {
        this.close()
      }
    },
    getIconClass() {
      const baseClass = 'transition-colors duration-300'
      switch (this.type) {
        case 'success':
          return `${baseClass} bg-green-100 text-green-600 ${this.isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-600'}`
        case 'warning':
          return `${baseClass} bg-yellow-100 text-yellow-600 ${this.isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-600'}`
        case 'error':
          return `${baseClass} bg-red-100 text-red-600 ${this.isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'}`
        default:
          return `${baseClass} bg-blue-100 text-blue-600 ${this.isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'}`
      }
    },
    getConfirmButtonClass() {
      const baseClass = 'transition-colors duration-300'
      switch (this.type) {
        case 'success':
          return `${baseClass} bg-green-600 hover:bg-green-700`
        case 'warning':
          return `${baseClass} bg-yellow-600 hover:bg-yellow-700`
        case 'error':
          return `${baseClass} bg-red-600 hover:bg-red-700`
        default:
          return `${baseClass} bg-blue-600 hover:bg-blue-700`
      }
    }
  }
}
</script>

<style scoped>
/* 確保動畫效果 */
.transform {
  transform: translateZ(0);
}
</style>
