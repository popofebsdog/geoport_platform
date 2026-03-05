import { useAlert } from '@/composables/useAlert'

// 創建全局alert實例
const { showAlert } = useAlert()

// 簡化方法
export const alert = (message, title = '提示', isDarkMode = false) => {
  return showAlert({
    type: 'info',
    title,
    message,
    isDarkMode
  })
}

export const confirm = (message, title = '確認', isDarkMode = false) => {
  return showAlert({
    type: 'warning',
    title,
    message,
    showCancelButton: true,
    isDarkMode
  })
}

export const success = (message, title = '成功', isDarkMode = false) => {
  return showAlert({
    type: 'success',
    title,
    message,
    isDarkMode
  })
}

export const warning = (message, title = '警告', isDarkMode = false) => {
  return showAlert({
    type: 'warning',
    title,
    message,
    isDarkMode
  })
}

export const error = (message, title = '錯誤', isDarkMode = false) => {
  return showAlert({
    type: 'error',
    title,
    message,
    isDarkMode
  })
}

export default {
  alert,
  confirm,
  success,
  warning,
  error
}
