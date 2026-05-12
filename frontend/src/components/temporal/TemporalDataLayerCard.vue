<template>
  <div class="flex items-center gap-1.5 px-2 py-2 rounded-md border transition-colors duration-150"
       :class="isDarkMode
         ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
         : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300'">

    <!-- 刪除確認框 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[1300] flex items-center justify-center bg-black bg-opacity-50"
           @click.self="showDeleteConfirm = false">
        <div class="rounded border w-full max-w-md mx-4"
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

    <!-- 名稱 + 日期 -->
    <div class="flex-1 min-w-0">
      <p class="text-xs font-medium truncate transition-colors duration-150"
         :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'">
        {{ temporalData.name }}
      </p>
      <p class="text-xs mt-0.5 transition-colors duration-150"
         :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
        {{ formatDate(temporalData.upload_date || temporalData.created_at) }}
      </p>
    </div>

    <!-- 操作按鈕 -->
    <div class="flex items-center gap-0.5 flex-shrink-0">
      <button @click="toggleVisibility"
              class="p-1 rounded transition-colors duration-150"
              :class="isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
              :title="isVisible ? '隱藏' : '顯示'">
        <svg v-if="isVisible" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
        </svg>
      </button>

      <button @click="locateOnMap"
              class="p-1 rounded transition-colors duration-150"
              :class="isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
              title="定位">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </button>

      <button @click="editData"
              class="p-1 rounded transition-colors duration-150"
              :class="isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
              title="編輯">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>

      <button @click="deleteData"
              class="p-1 rounded transition-colors duration-150"
              :class="isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'"
              title="刪除">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
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
      emit('toggle-visibility', props.temporalData.temporal_id)
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return '—'
      return new Date(dateString).toLocaleDateString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
    }

    return {
      isDarkMode,
      showDeleteConfirm,
      locateOnMap,
      editData,
      deleteData,
      confirmDelete,
      toggleVisibility,
      formatDate
    }
  }
}
</script>
