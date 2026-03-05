<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-6">Alert 測試頁面</h1>
    
    <div class="space-y-4">
      <button @click="testAlert" 
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        測試 Alert
      </button>
      
      <button @click="testConfirm" 
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
        測試 Confirm
      </button>
      
      <button @click="testSuccess" 
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        測試 Success
      </button>
    </div>
    
    <div v-if="result" class="mt-6 p-4 bg-gray-100 rounded">
      <p>結果: {{ result }}</p>
    </div>
  </div>
</template>

<script>
import { alert, confirm, success } from '@/utils/alertService'

export default {
  name: 'TestAlert',
  data() {
    return {
      result: null
    }
  },
  methods: {
    async testAlert() {
      try {
        await alert('這是一個測試alert', '測試', false)
        this.result = 'Alert 測試完成'
      } catch (error) {
        this.result = 'Alert 測試失敗: ' + error.message
      }
    },
    
    async testConfirm() {
      try {
        const confirmed = await confirm('確定要執行此操作嗎？', '確認', false)
        this.result = confirmed ? '用戶確認了操作' : '用戶取消了操作'
      } catch (error) {
        this.result = 'Confirm 測試失敗: ' + error.message
      }
    },
    
    async testSuccess() {
      try {
        await success('操作成功完成！', '成功', false)
        this.result = 'Success 測試完成'
      } catch (error) {
        this.result = 'Success 測試失敗: ' + error.message
      }
    }
  }
}
</script>
