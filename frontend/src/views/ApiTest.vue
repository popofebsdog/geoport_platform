<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-6">API 測試頁面</h1>
    
    <div class="space-y-4">
      <button @click="testGetProjects" 
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        測試獲取專案列表
      </button>
      
      <button @click="testCreateProject" 
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
        測試創建專案
      </button>
    </div>
    
    <div v-if="result" class="mt-6 p-4 bg-gray-100 rounded">
      <h3 class="font-bold mb-2">結果:</h3>
      <pre class="text-sm overflow-auto">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
    
    <div v-if="error" class="mt-6 p-4 bg-red-100 rounded">
      <h3 class="font-bold mb-2 text-red-800">錯誤:</h3>
      <pre class="text-sm text-red-600 overflow-auto">{{ error }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ApiTest',
  data() {
    return {
      result: null,
      error: null
    }
  },
  methods: {
    async testGetProjects() {
      try {
        this.error = null
        this.result = null
        
        const response = await this.$api.projectAPI.getAll()
        
        this.result = response
      } catch (error) {
        console.error('獲取專案列表錯誤:', error)
        this.error = error.message || error
      }
    },
    
    async testCreateProject() {
      try {
        this.error = null
        this.result = null
        
        const projectData = {
          name: 'API 測試專案',
          description: '這是一個 API 測試專案',
          locationGeometry: {
            type: 'Point',
            coordinates: [121.5654, 25.0330]
          },
          roadType: 'national',
          roadNumber: '國道1號',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天後
          status: 'active'
        }
        
        const response = await this.$api.projectAPI.create(projectData)
        
        this.result = response
      } catch (error) {
        console.error('創建專案錯誤:', error)
        this.error = error.message || error
      }
    }
  }
}
</script>
