<template>
  <div class="temporal-data-manager">
    <!-- 時序資料列表 -->
    <div v-if="temporalDataList.length > 0" class="space-y-1">
        <TemporalDataLayerCard
          v-for="data in temporalDataList"
          :key="data.temporal_id"
          :temporal-data="data"
          :is-visible="temporalDataVisibility[data.temporal_id] === true"
          @locate="handleLocate"
          @edit="handleEdit"
          @delete="handleDelete"
          @toggle-visibility="handleToggleVisibility"
        />
      </div>
      
      <!-- 空狀態 -->
      <div v-else class="text-center py-12">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <h3 class="text-lg font-medium transition-colors duration-300"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
          尚無時序資料
        </h3>
        <p class="text-sm transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
          點擊上方按鈕上傳您的第一個時序資料
        </p>
      </div>
    
    <!-- 圖表模態框 -->
    <TemporalDataChartModal
      v-if="showChartModal"
      :is-visible="showChartModal"
      :temporal-data="selectedTemporalData"
      @close="showChartModal = false"
    />
  </div>
</template>

<script>
import { ref, onMounted, inject } from 'vue'
import axios from 'axios'
import TemporalDataLayerCard from './TemporalDataLayerCard.vue'
import TemporalDataChartModal from './TemporalDataChartModal.vue'

export default {
  name: 'TemporalDataManager',
  components: {
    TemporalDataLayerCard,
    TemporalDataChartModal
  },
  props: {
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['locate', 'toggle-visibility', 'edit'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', false)
    
    // 調試：檢查 props
    
    // 響應式數據
    const temporalDataList = ref([])
    const temporalDataVisibility = ref({})
    const showChartModal = ref(false)
    const selectedTemporalData = ref(null)
    const isLoading = ref(false)
    
    // 載入時序資料列表
    const loadTemporalDataList = async () => {
      isLoading.value = true
      try {
        const response = await axios.get(`/api/temporal-data-enhanced/${props.projectId}/list`)
        if (response.data.success) {
          temporalDataList.value = response.data.data
        }
      } catch (error) {
        console.error('載入時序資料列表失敗:', error)
      } finally {
        isLoading.value = false
      }
    }
    
    // 處理定位
    const handleLocate = (locationData) => {
      emit('locate', locationData)
    }
    
    // 處理顯示圖表
    const handleShowChart = (temporalData) => {
      selectedTemporalData.value = temporalData
      showChartModal.value = true
    }
    
    // 處理編輯
    const handleEdit = (temporalData) => {
      // 發送編輯事件給父組件
      emit('edit', temporalData)
    }
    
    // 處理刪除
    const handleDelete = async (temporalId) => {
      try {
        const response = await axios.delete(`/api/temporal-data-enhanced/${temporalId}`)
        if (response.data.success) {
          // 重新載入列表
          await loadTemporalDataList()
        }
      } catch (error) {
        console.error('刪除時序資料失敗:', error)
      }
    }
    
    // 切換顯示/隱藏
    const handleToggleVisibility = (temporalId) => {
      
      // 處理 temporalId 可能是物件的情況
      let actualTemporalId
      if (typeof temporalId === 'object' && temporalId.temporal_id) {
        actualTemporalId = temporalId.temporal_id
      } else {
        actualTemporalId = String(temporalId)
      }
      
      // 如果沒有設定可見性，預設為 false（隱藏）
      const currentVisibility = temporalDataVisibility.value[actualTemporalId] === true
      const newVisibility = !currentVisibility
      temporalDataVisibility.value[actualTemporalId] = newVisibility
      
      // 找到對應的時序資料
      const temporalData = temporalDataList.value.find(data => data.temporal_id === actualTemporalId)
      if (temporalData) {
        
        // 創建包含 isVisible 的完整資料
        const eventData = {
          ...temporalData,
          isVisible: newVisibility
        }
        
        emit('toggle-visibility', eventData)
      } else {
        console.error('找不到對應的時序資料:', actualTemporalId)
      }
    }
    
    // 組件掛載時載入資料
    onMounted(() => {
      loadTemporalDataList()
    })
    
    return {
      isDarkMode,
      temporalDataList,
      temporalDataVisibility,
      showChartModal,
      selectedTemporalData,
      isLoading,
      loadTemporalDataList,
      handleLocate,
      handleShowChart,
      handleEdit,
      handleDelete,
      handleToggleVisibility
    }
  },
  
  // 暴露方法給父組件
  expose: ['loadTemporalDataList']
}
</script>

<style scoped>
/* 移除固定高度，讓容器適應內容 */
</style>