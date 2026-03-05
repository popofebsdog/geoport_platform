<template>
  <div class="h-full flex flex-col transition-colors duration-300" :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'">
    
    <!-- 標題欄 -->
    <div class="px-6 py-4 border-b transition-colors duration-300"
         :class="isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            📁 專案管理
          </h1>
          <span class="text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
            Project Management
          </span>
        </div>
        
        <div class="flex items-center space-x-3">
          <!-- 搜尋框 -->
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋專案..."
              class="pl-10 pr-4 py-2 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
            />
            <svg class="absolute left-3 top-2.5 w-5 h-5" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          
          <!-- 新增地點按鈕 -->
          <button 
            @click="showCreateParentModal = true"
            class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 shadow-sm"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
            新增地點
          </button>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- 載入中 -->
      <div v-if="isLoading" class="flex items-center justify-center h-64">
        <div class="flex flex-col items-center space-y-3">
          <svg class="animate-spin h-10 w-10" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">載入中...</p>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-else-if="filteredParentProjects.length === 0 && !searchQuery" 
           class="flex flex-col items-center justify-center h-64">
        <svg class="w-24 h-24 mb-4 opacity-30" :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
        </svg>
        <h3 class="text-xl font-semibold mb-2" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          尚無專案
        </h3>
        <p class="mb-4" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
          開始創建您的第一個地點專案
        </p>
        <button
          @click="showCreateParentModal = true"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 shadow-sm font-medium"
        >
          新增地點專案
        </button>
      </div>

      <!-- 搜尋無結果 -->
      <div v-else-if="filteredParentProjects.length === 0 && searchQuery"
           class="flex flex-col items-center justify-center h-64">
        <svg class="w-24 h-24 mb-4 opacity-30" :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <h3 class="text-xl font-semibold mb-2" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
          找不到符合的專案
        </h3>
        <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
          請嘗試其他搜尋關鍵字
        </p>
      </div>

      <!-- 專案列表 -->
      <div v-else class="space-y-4">
        <ParentProjectCard
          v-for="parent in filteredParentProjects"
          :key="parent.project_id"
          :parent-project="parent"
          :child-projects="getChildProjects(parent.project_id)"
          :is-dark-mode="isDarkMode"
          @add-child="handleAddChild"
          @locate="handleLocateParent"
          @edit="handleEditParent"
          @delete="handleDeleteParent"
          @open-child="handleOpenChild"
          @edit-child="handleEditChild"
          @delete-child="handleDeleteChild"
        />
      </div>
    </div>

    <!-- 創建母專案模態框 -->
    <CreateParentProjectModal
      :is-visible="showCreateParentModal"
      @close="showCreateParentModal = false"
      @created="handleParentCreated"
    />
    
    <!-- 編輯母專案模態框 -->
    <EditParentProjectModal
      :is-visible="showEditParentModal"
      :parent-project="selectedParentForEdit"
      @close="showEditParentModal = false; selectedParentForEdit = null"
      @updated="handleParentUpdated"
    />

    <!-- 創建子專案模態框 -->
    <CreateChildProjectModal
      :is-visible="showCreateChildModal"
      :parent-project="selectedParentProject"
      @close="showCreateChildModal = false"
      @created="handleChildCreated"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import ParentProjectCard from '@/components/project/ParentProjectCard.vue'
import CreateParentProjectModal from '@/components/project/CreateParentProjectModal.vue'
import EditParentProjectModal from '@/components/project/EditParentProjectModal.vue'
import CreateChildProjectModal from '@/components/project/CreateChildProjectModal.vue'

export default {
  name: 'ProjectManagement',
  components: {
    ParentProjectCard,
    CreateParentProjectModal,
    EditParentProjectModal,
    CreateChildProjectModal
  },
  setup() {
    const isDarkMode = inject('isDarkMode', ref(false))
    const router = useRouter()
    
    const parentProjects = ref([])
    const childProjectsMap = ref({}) // key: parent_id, value: array of children
    const isLoading = ref(false)
    const searchQuery = ref('')
    
    const showCreateParentModal = ref(false)
    const showCreateChildModal = ref(false)
    const showEditParentModal = ref(false)
    const selectedParentProject = ref(null)
    const selectedParentForEdit = ref(null)
    
    // 過濾專案
    const filteredParentProjects = computed(() => {
      if (!searchQuery.value.trim()) {
        return parentProjects.value
      }
      
      const query = searchQuery.value.toLowerCase()
      return parentProjects.value.filter(project => {
        return project.name.toLowerCase().includes(query) ||
               project.description?.toLowerCase().includes(query) ||
               project.road_number?.toLowerCase().includes(query) ||
               project.location_name?.toLowerCase().includes(query)
      })
    })
    
    // 獲取子專案列表
    const getChildProjects = (parentId) => {
      return childProjectsMap.value[parentId] || []
    }
    
    // 載入母專案列表
    const loadParentProjects = async () => {
      isLoading.value = true
      try {
        const response = await window.$api.get('/parent-projects')
        if (response.success) {
          parentProjects.value = response.data
          console.log('母專案列表載入成功:', response.data.length, '個')
          
          // 載入每個母專案的子專案
          for (const parent of parentProjects.value) {
            await loadChildProjects(parent.project_id)
          }
        }
      } catch (error) {
        console.error('載入母專案列表失敗:', error)
        alert('載入專案列表失敗')
      } finally {
        isLoading.value = false
      }
    }
    
    // 載入子專案列表
    const loadChildProjects = async (parentId) => {
      try {
        const response = await window.$api.get(`/parent-projects/${parentId}/children`)
        if (response.success) {
          childProjectsMap.value[parentId] = response.data.children
          console.log(`母專案 ${parentId} 的子專案:`, response.data.children.length, '個')
        }
      } catch (error) {
        console.error(`載入母專案 ${parentId} 的子專案失敗:`, error)
      }
    }
    
    // 處理母專案創建成功
    const handleParentCreated = async (parentProject) => {
      console.log('母專案創建成功:', parentProject)
      await loadParentProjects()
    }
    
    // 處理新增子專案
    const handleAddChild = (parentProject) => {
      selectedParentProject.value = parentProject
      showCreateChildModal.value = true
    }
    
    // 處理子專案創建成功
    const handleChildCreated = async (childProject) => {
      console.log('子專案創建成功:', childProject)
      // 重新載入該母專案的子專案列表
      await loadChildProjects(childProject.parent_project_id)
    }
    
    // 處理定位母專案
    const handleLocateParent = (parentProject) => {
      console.log('定位母專案:', parentProject)
      // TODO: 實現地圖定位功能
      alert(`定位到: ${parentProject.name}\n座標: ${parentProject.latitude}, ${parentProject.longitude}`)
    }
    
    // 處理編輯母專案
    const handleEditParent = (parentProject) => {
      console.log('編輯母專案:', parentProject)
      selectedParentForEdit.value = parentProject
      showEditParentModal.value = true
    }
    
    // 處理母專案更新成功
    const handleParentUpdated = async (updatedParent) => {
      console.log('母專案更新成功:', updatedParent)
      // 重新載入母專案列表
      await loadParentProjects()
      // 關閉模態框
      showEditParentModal.value = false
      selectedParentForEdit.value = null
    }
    
    // 處理刪除母專案
    const handleDeleteParent = async (parentProject) => {
      if (!confirm(`確定要刪除地點「${parentProject.name}」嗎？\n\n此操作將同時刪除所有相關的時期專案！`)) {
        return
      }
      
      try {
        const response = await window.$api.delete(`/parent-projects/${parentProject.project_id}`)
        if (response.success) {
          console.log('母專案刪除成功')
          await loadParentProjects()
        }
      } catch (error) {
        console.error('刪除母專案失敗:', error)
        alert(`刪除失敗: ${error.response?.data?.message || error.message}`)
      }
    }
    
    // 處理開啟子專案
    const handleOpenChild = (childProject) => {
      console.log('開啟子專案:', childProject)
      // 導航到專案詳情頁面
      router.push({
        name: 'project-detail',
        params: { id: childProject.project_id }
      })
    }
    
    // 處理編輯子專案
    const handleEditChild = (childProject) => {
      console.log('編輯子專案:', childProject)
      // TODO: 實現編輯功能
      alert('編輯子專案功能開發中')
    }
    
    // 處理刪除子專案
    const handleDeleteChild = async (childProject) => {
      if (!confirm(`確定要刪除時期「${childProject.name}」嗎？`)) {
        return
      }
      
      try {
        const response = await window.$api.delete(`/child-projects/${childProject.project_id}`)
        if (response.success) {
          console.log('子專案刪除成功')
          // 重新載入該母專案的子專案列表
          await loadChildProjects(childProject.parent_project_id)
        }
      } catch (error) {
        console.error('刪除子專案失敗:', error)
        alert(`刪除失敗: ${error.response?.data?.message || error.message}`)
      }
    }
    
    // 初始化
    onMounted(() => {
      loadParentProjects()
    })
    
    return {
      isDarkMode,
      parentProjects,
      filteredParentProjects,
      childProjectsMap,
      isLoading,
      searchQuery,
      showCreateParentModal,
      showCreateChildModal,
      showEditParentModal,
      selectedParentProject,
      selectedParentForEdit,
      getChildProjects,
      handleParentCreated,
      handleAddChild,
      handleChildCreated,
      handleLocateParent,
      handleEditParent,
      handleParentUpdated,
      handleDeleteParent,
      handleOpenChild,
      handleEditChild,
      handleDeleteChild
    }
  }
}
</script>

<style scoped>
/* 自訂滾動條 */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175); /* gray-400 */
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128); /* gray-500 */
}

/* 暗色模式滾動條 */
:global(.dark) ::-webkit-scrollbar-thumb {
  background-color: rgb(71 85 105); /* slate-600 */
}

:global(.dark) ::-webkit-scrollbar-thumb:hover {
  background-color: rgb(100 116 139); /* slate-500 */
}
</style>

