<template>
  <div class="p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg backdrop-blur-sm relative"
       :class="isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300'">
    
    <!-- 刪除確認框 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black bg-opacity-50"
           @click.self="showDeleteConfirm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4 transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              確認刪除
            </h3>
            <p class="text-sm mb-6 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
              確定要刪除「{{ temporalData.name }}」此時序資料嗎？此操作無法復原。
            </p>
            <div class="flex items-center justify-end space-x-3">
              <button @click="showDeleteConfirm = false"
                      class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                      :class="isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-slate-700' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'">
                取消
              </button>
              <button @click="confirmDelete"
                      class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg transition-all duration-300 hover:bg-red-700">
                確定刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <div class="flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center">
          <h4 class="text-sm font-medium transition-colors duration-300 truncate"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ temporalData.name }}
          </h4>
        </div>
      </div>
      <div class="flex items-center space-x-0.5 ml-2">
        <!-- 顯示/隱藏按鈕 -->
        <button @click="toggleVisibility"
                class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                :class="isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-400/10' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'"
                :title="isVisible ? '隱藏' : '顯示'">
          <svg v-if="isVisible" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
          </svg>
        </button>
        
        <!-- 定位按鈕 -->
        <button @click="locateOnMap"
                class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                title="定位">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </button>
        
        <!-- 編輯按鈕 -->
        <button @click="editData"
                class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                title="編輯">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        
        <!-- 刪除按鈕 -->
        <button @click="deleteData"
                class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                :class="isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'"
                title="刪除">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
    
  </div>
</template>

<script>
import { ref, inject } from 'vue'

export default {
  name: 'TemporalDataLayerCard',
  props: {
    temporalData: {
      type: Object,
      required: true
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  emits: ['locate', 'edit', 'delete', 'toggle-visibility'],
  setup(props, { emit }) {
    const isDarkMode = inject('isDarkMode', false)
    const showDeleteConfirm = ref(false)
    
    // 定位到地圖
    const locateOnMap = () => {
      emit('locate', {
        longitude: props.temporalData.longitude,
        latitude: props.temporalData.latitude,
        name: props.temporalData.name
      })
    }
    
    // 編輯資料
    const editData = () => {
      emit('edit', props.temporalData)
    }
    
    // 刪除資料 - 顯示確認框
    const deleteData = () => {
      showDeleteConfirm.value = true
    }
    
    // 確認刪除
    const confirmDelete = () => {
      showDeleteConfirm.value = false
        emit('delete', props.temporalData.temporal_id)
    }
    
    // 切換顯示/隱藏
    const toggleVisibility = () => {
      console.log('TemporalDataLayerCard 發送 toggle-visibility 事件:', props.temporalData.temporal_id)
      emit('toggle-visibility', props.temporalData.temporal_id)
    }
    
    return {
      isDarkMode,
      showDeleteConfirm,
      locateOnMap,
      editData,
      deleteData,
      confirmDelete,
      toggleVisibility
    }
  }
}
</script>

<style scoped>
.temporal-data-layer-card {
  min-height: 200px;
}

.temporal-data-layer-card:hover {
  transform: translateY(-2px);
}
</style>
