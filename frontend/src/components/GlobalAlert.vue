<template>
  <!-- 使用 Teleport 確保 Alert 渲染在最上層 -->
  <Teleport to="body">
    <!-- 背景遮罩 -->
    <div v-if="alertState.show" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] transition-opacity duration-300"
         @click="handleBackdropClick">
      
      <!-- 提示視窗 -->
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300"
           :class="[
             alertState.isDarkMode ? 'bg-slate-800' : 'bg-white',
             'scale-100 opacity-100'
           ]"
           @click.stop>
        
        <!-- 標題欄 -->
        <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
             :class="alertState.isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <div class="flex items-center space-x-3">
            <!-- 圖標 -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
                 :class="getIconClass()">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="alertState.type === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                <path v-else-if="alertState.type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                <path v-else-if="alertState.type === 'error'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            
            <!-- 標題 -->
            <h3 class="text-sm font-semibold transition-colors duration-300"
                :class="alertState.isDarkMode ? 'text-white' : 'text-gray-900'">
              {{ alertState.title }}
            </h3>
          </div>
          
          <!-- 關閉按鈕 -->
          <button v-if="alertState.showCloseButton" 
                  @click="close"
                  class="p-1 rounded-md transition-colors duration-300"
                  :class="alertState.isDarkMode ? 
                    'hover:bg-slate-700 text-gray-400 hover:text-gray-300' : 
                    'hover:bg-gray-100 text-gray-400 hover:text-gray-600'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 內容區域 -->
        <div class="p-6">
          <p class="text-base leading-relaxed transition-colors duration-300"
             :class="alertState.isDarkMode ? 'text-gray-300' : 'text-gray-600'">
            {{ alertState.message }}
          </p>
        </div>
        
        <!-- 按鈕區域 -->
        <div class="flex justify-end space-x-3 p-6 pt-0">
          <button v-if="alertState.showCancelButton" 
                  @click="cancel"
                  class="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                  :class="alertState.isDarkMode ? 
                    'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                    'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
            {{ alertState.cancelText }}
          </button>
          <button @click="confirm(true)"
                  class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-300"
                  :class="getConfirmButtonClass()">
            {{ alertState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { useAlert } from '@/composables/useAlert'

export default {
  name: 'GlobalAlert',
  setup() {
    const { alertState, confirm, cancel, close } = useAlert()

    const handleBackdropClick = () => {
      if (alertState.closeOnBackdrop) {
        close()
      }
    }

    const getIconClass = () => {
      const baseClass = 'transition-colors duration-300'
      switch (alertState.type) {
        case 'success':
          return `${baseClass} ${alertState.isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-600'}`
        case 'warning':
          return `${baseClass} ${alertState.isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-600'}`
        case 'error':
          return `${baseClass} ${alertState.isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'}`
        default:
          // 驚嘆號圖標使用紅色背景
          return `${baseClass} ${alertState.isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'}`
      }
    }

    const getConfirmButtonClass = () => {
      const baseClass = 'transition-colors duration-300'
      // 統一按鈕顏色：確認按鈕用藍色，刪除/警告按鈕用紅色
      switch (alertState.type) {
        case 'warning':
        case 'error':
          return `${baseClass} bg-red-600 hover:bg-red-700`
        case 'success':
        case 'info':
        default:
          return `${baseClass} bg-blue-600 hover:bg-blue-700`
      }
    }

    return {
      alertState,
      confirm,
      cancel,
      close,
      handleBackdropClick,
      getIconClass,
      getConfirmButtonClass
    }
  }
}
</script>
