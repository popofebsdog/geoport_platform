<template>
  <div class="p-4">
    <button @click="testAlert" class="px-4 py-2 bg-blue-500 text-white rounded">
      測試 Alert
    </button>
    <p v-if="message" class="mt-2">{{ message }}</p>
  </div>
</template>

<script>
import { alert } from '@/utils/alertService'

export default {
  name: 'SimpleAlertTest',
  data() {
    return {
      message: ''
    }
  },
  methods: {
    async testAlert() {
      try {
        console.log('開始測試alert...')
        await alert('這是一個測試', '測試標題', false)
        this.message = 'Alert 測試成功！'
        console.log('Alert 測試完成')
      } catch (error) {
        this.message = 'Alert 測試失敗: ' + error.message
        console.error('Alert 測試失敗:', error)
      }
    }
  }
}
</script>
