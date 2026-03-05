import { ref, reactive } from 'vue'

// 全局alert狀態
const alertState = reactive({
  show: false,
  type: 'info',
  title: '提示',
  message: '',
  confirmText: '確定',
  cancelText: '取消',
  showCancelButton: false,
  showCloseButton: true,
  closeOnBackdrop: false,
  isDarkMode: false
})

// Promise resolve函數
let currentResolve = null

export function useAlert() {
  const showAlert = (options = {}) => {
    return new Promise((resolve) => {
      // 設置alert狀態
      Object.assign(alertState, {
        show: true,
        type: options.type || 'info',
        title: options.title || '提示',
        message: options.message || '',
        confirmText: options.confirmText || '確定',
        cancelText: options.cancelText || '取消',
        showCancelButton: options.showCancelButton || false,
        showCloseButton: options.showCloseButton !== false,
        closeOnBackdrop: options.closeOnBackdrop || false,
        isDarkMode: options.isDarkMode || false
      })
      
      currentResolve = resolve
    })
  }

  const hideAlert = (result = false) => {
    alertState.show = false
    if (currentResolve) {
      currentResolve(result)
      currentResolve = null
    }
  }

  const confirm = (result) => {
    hideAlert(result)
  }

  const cancel = () => {
    hideAlert(false)
  }

  const close = () => {
    hideAlert(false)
  }

  return {
    alertState,
    showAlert,
    hideAlert,
    confirm,
    cancel,
    close
  }
}
