import { createApp, h } from 'vue'
import CustomAlert from '@/components/CustomAlert.vue'

class AlertService {
  constructor() {
    this.currentAlert = null
    this.alertContainer = null
  }

  // 創建alert容器
  createContainer() {
    if (!this.alertContainer) {
      this.alertContainer = document.createElement('div')
      this.alertContainer.id = 'alert-container'
      document.body.appendChild(this.alertContainer)
    }
  }

  // 清理alert
  cleanup() {
    if (this.currentAlert) {
      this.currentAlert.unmount()
      this.currentAlert = null
    }
  }

  // 顯示alert
  show(options = {}) {
    return new Promise((resolve) => {
      this.cleanup()
      this.createContainer()

      const {
        type = 'info',
        title = '提示',
        message = '',
        confirmText = '確定',
        cancelText = '取消',
        showCancelButton = false,
        showCloseButton = true,
        closeOnBackdrop = false,
        isDarkMode = false
      } = options

      // 創建一個包裝組件來處理事件
      const AlertWrapper = {
        components: { CustomAlert },
        data() {
          return {
            show: true
          }
        },
        methods: {
          handleConfirm() {
            this.show = false
            setTimeout(() => {
              resolve(true)
            }, 100)
          },
          handleCancel() {
            this.show = false
            setTimeout(() => {
              resolve(false)
            }, 100)
          },
          handleClose() {
            this.show = false
            setTimeout(() => {
              resolve(false)
            }, 100)
          }
        },
        render() {
          return h(CustomAlert, {
            props: {
              show: this.show,
              type,
              title,
              message,
              confirmText,
              cancelText,
              showCancelButton,
              showCloseButton,
              closeOnBackdrop,
              isDarkMode
            },
            on: {
              confirm: this.handleConfirm,
              cancel: this.handleCancel,
              close: this.handleClose
            }
          })
        }
      }

      const alertApp = createApp(AlertWrapper)

      this.currentAlert = alertApp
      alertApp.mount(this.alertContainer)
    })
  }

  // 簡化方法
  alert(message, title = '提示', isDarkMode = false) {
    return this.show({
      type: 'info',
      title,
      message,
      isDarkMode
    })
  }

  confirm(message, title = '確認', isDarkMode = false) {
    return this.show({
      type: 'warning',
      title,
      message,
      showCancelButton: true,
      isDarkMode
    })
  }

  success(message, title = '成功', isDarkMode = false) {
    return this.show({
      type: 'success',
      title,
      message,
      isDarkMode
    })
  }

  warning(message, title = '警告', isDarkMode = false) {
    return this.show({
      type: 'warning',
      title,
      message,
      isDarkMode
    })
  }

  error(message, title = '錯誤', isDarkMode = false) {
    return this.show({
      type: 'error',
      title,
      message,
      isDarkMode
    })
  }
}

// 創建單例
const alertService = new AlertService()

// 導出服務
export default alertService

// 導出便捷方法
export const alert = (message, title, isDarkMode) => alertService.alert(message, title, isDarkMode)
export const confirm = (message, title, isDarkMode) => alertService.confirm(message, title, isDarkMode)
export const success = (message, title, isDarkMode) => alertService.success(message, title, isDarkMode)
export const warning = (message, title, isDarkMode) => alertService.warning(message, title, isDarkMode)
export const error = (message, title, isDarkMode) => alertService.error(message, title, isDarkMode)