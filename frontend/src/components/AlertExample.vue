<template>
  <div class="p-6 space-y-4">
    <h2 class="text-xl font-bold mb-4">自定義Alert組件示例</h2>
    
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <!-- 基本Alert -->
      <button @click="showBasicAlert" 
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        基本Alert
      </button>
      
      <!-- 成功Alert -->
      <button @click="showSuccessAlert" 
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
        成功Alert
      </button>
      
      <!-- 警告Alert -->
      <button @click="showWarningAlert" 
              class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
        警告Alert
      </button>
      
      <!-- 錯誤Alert -->
      <button @click="showErrorAlert" 
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
        錯誤Alert
      </button>
      
      <!-- 確認對話框 -->
      <button @click="showConfirmDialog" 
              class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
        確認對話框
      </button>
      
      <!-- 自定義Alert -->
      <button @click="showCustomAlert" 
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
        自定義Alert
      </button>
    </div>
    
    <!-- 結果顯示 -->
    <div v-if="lastResult" class="mt-4 p-4 bg-gray-100 rounded">
      <p>最後操作結果: {{ lastResult }}</p>
    </div>
  </div>
</template>

<script>
import { alert, confirm, success, warning, error } from '@/utils/alertService'

export default {
  name: 'AlertExample',
  data() {
    return {
      lastResult: null
    }
  },
  methods: {
    async showBasicAlert() {
      await alert('這是一個基本的提示訊息', '提示', this.isDarkMode)
      this.lastResult = '基本Alert已顯示'
    },
    
    async showSuccessAlert() {
      await success('操作成功完成！', '成功', this.isDarkMode)
      this.lastResult = '成功Alert已顯示'
    },
    
    async showWarningAlert() {
      await warning('這是一個警告訊息', '警告', this.isDarkMode)
      this.lastResult = '警告Alert已顯示'
    },
    
    async showErrorAlert() {
      await error('發生了一個錯誤', '錯誤', this.isDarkMode)
      this.lastResult = '錯誤Alert已顯示'
    },
    
    async showConfirmDialog() {
      const result = await confirm('您確定要執行此操作嗎？', '確認操作', this.isDarkMode)
      this.lastResult = result ? '用戶確認了操作' : '用戶取消了操作'
    },
    
    async showCustomAlert() {
      const result = await alert('這是一個自定義的Alert，支援多種配置選項', '自定義標題', this.isDarkMode)
      this.lastResult = '自定義Alert已顯示'
    }
  },
  inject: ['isDarkMode']
}
</script>
