<template>
  <div class="basemap-selector">
    <!-- 載入狀態 -->
    <div v-if="loading" class="p-3 text-center">
      <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      <p class="mt-1 text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">載入中...</p>
    </div>

    <!-- 底圖列表 -->
    <div v-else-if="baseMaps.length > 0" class="space-y-1">
      <div
        v-for="baseMap in baseMaps"
        :key="baseMap.id"
        class="flex items-center gap-1.5 px-2 py-2 rounded-md border transition-colors duration-150"
        :class="[
          isDarkMode
            ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
            : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300',
          selectedBaseMapId === baseMap.id
            ? (isDarkMode ? 'ring-1 ring-blue-400/60' : 'ring-1 ring-blue-500/60') : ''
        ]"
      >
        <!-- 名稱 + 日期 -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate transition-colors duration-150"
             :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'">
            {{ baseMap.name }}
          </p>
          <p class="text-xs mt-0.5 transition-colors duration-150"
             :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
            {{ formatDate(baseMap.uploadDate) }}
          </p>
        </div>

        <!-- 操作按鈕 -->
        <div class="flex items-center gap-0.5 flex-shrink-0">
          <button @click="toggleBaseMap(baseMap)"
                  class="p-1 rounded transition-colors duration-150"
                  :class="isBaseMapActive && selectedBaseMapId === baseMap.id
                    ? (isDarkMode ? 'text-blue-400 bg-blue-400/10' : 'text-blue-600 bg-blue-50')
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')"
                  :disabled="isLoadingBaseMap"
                  title="顯示/隱藏正射影像">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="isBaseMapActive && selectedBaseMapId === baseMap.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path v-if="isBaseMapActive && selectedBaseMapId === baseMap.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
            </svg>
          </button>

          <button @click="locateBaseMap(baseMap)"
                  class="p-1 rounded transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
                  title="定位到正射影像">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>

          <button @click="editBaseMap(baseMap)"
                  class="p-1 rounded transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
                  title="編輯正射影像">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>

          <button @click="deleteBaseMap(baseMap)"
                  class="p-1 rounded transition-colors duration-150"
                  :class="isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'"
                  title="刪除正射影像">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 無底圖狀態 -->
    <div v-else class="py-8 text-center">
      <svg class="w-9 h-9 mx-auto mb-2 transition-colors duration-150"
           :class="isDarkMode ? 'text-slate-600' : 'text-gray-300'"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <p class="text-xs transition-colors duration-150"
         :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
        尚未上傳正射影像
      </p>
    </div>

    <!-- 錯誤訊息 -->
    <div 
      v-if="error" 
      class="mt-2 p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md"
      :class="isDarkMode ? 'bg-red-900/20 border-red-800 text-red-400' : ''"
    >
      {{ error }}
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { dataFileAPI } from '../../services/api'

export default {
  name: 'BaseMapSelector',
  props: {
    projectId: {
      type: String,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    currentBaseMapId: {
      type: String,
      default: ''
    },
    baseMapService: {
      type: Object,
      default: null
    }
  },
  emits: ['base-map-selected', 'base-map-changed', 'base-map-located', 'base-map-edited', 'base-map-deleted', 'base-map-delete-request'],
  setup(props, { emit }) {
    const baseMaps = ref([])
    const selectedBaseMapId = ref('')
    const loading = ref(false)
    const error = ref('')
    const isBaseMapActive = ref(false)
    const isLoadingBaseMap = ref(false)

    // 計算選中的底圖
    const selectedBaseMap = computed(() => {
      return baseMaps.value.find(map => map.id === selectedBaseMapId.value)
    })

    // 載入底圖列表
    const loadBaseMaps = async () => {
      if (!props.projectId) return
      
      loading.value = true
      error.value = ''
      
      try {
        const result = await dataFileAPI.getProjectBasemaps(props.projectId)
        
        if (result.success) {
          baseMaps.value = result.data
        } else {
          throw new Error(result.message || '載入底圖列表失敗')
        }
      } catch (err) {
        console.error('載入底圖列表錯誤:', err)
        error.value = err.message || '載入底圖列表失敗'
        baseMaps.value = []
      } finally {
        loading.value = false
      }
    }

    // 重新整理底圖列表
    const refreshBaseMaps = () => {
      loadBaseMaps()
    }


    // 切換底圖開啟/關閉
    const toggleBaseMap = async (baseMap) => {
      
      if (baseMap && !isLoadingBaseMap.value) {
        // 檢查是否為 COG 文件
        const isCOG = props.baseMapService?.isCOGFile(baseMap.storagePath || baseMap.originalName)
        
        
        
        // 如果點擊的是當前選中的底圖，切換其狀態
        if (selectedBaseMapId.value === baseMap.id) {
          if (isBaseMapActive.value) {
            // 關閉底圖
            isBaseMapActive.value = false
            emit('base-map-changed', null)
          } else {
            // 開啟底圖，顯示載入動畫
            isLoadingBaseMap.value = true
            isBaseMapActive.value = true
            
            // 如果是 COG 文件，添加額外的信息
            if (isCOG) {
              emit('base-map-changed', {
                ...baseMap,
                isCOG: true,
                cogOptions: {
                  minZoom: 0,
                  maxZoom: 22,
                  opacity: 1
                }
              })
            } else {
              emit('base-map-changed', baseMap)
            }
          }
        } else {
          // 如果點擊的是其他底圖，先選擇它，然後開啟
          selectedBaseMapId.value = baseMap.id
          isLoadingBaseMap.value = true
          isBaseMapActive.value = true
          
          // 如果是 COG 文件，添加額外的信息
          if (isCOG) {
            emit('base-map-selected', {
              ...baseMap,
              isCOG: true,
              cogOptions: {
                minZoom: 0,
                maxZoom: 22,
                opacity: 1
              }
            })
            emit('base-map-changed', {
              ...baseMap,
              isCOG: true,
              cogOptions: {
                minZoom: 0,
                maxZoom: 22,
                opacity: 1
              }
            })
          } else {
            emit('base-map-selected', baseMap)
            emit('base-map-changed', baseMap)
          }
        }
        
      } else {
      }
    }

    // 載入完成回調（由父組件調用）
    const onLoadingComplete = () => {
      isLoadingBaseMap.value = false
    }

    // 定位正射影像
    const locateBaseMap = (baseMap) => {
      emit('base-map-located', baseMap)
    }

    // 編輯正射影像
    const editBaseMap = (baseMap) => {
      emit('base-map-edited', baseMap)
    }

    // 刪除正射影像
    const deleteBaseMap = (baseMap) => {
      
      // 發射事件給父組件處理
      emit('base-map-delete-request', baseMap)
    }


    // 格式化檔案大小
    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B'
      
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 監聽專案 ID 變化
    watch(() => props.projectId, (newProjectId) => {
      if (newProjectId) {
        loadBaseMaps()
      } else {
        baseMaps.value = []
        selectedBaseMapId.value = ''
      }
    })

    // 監聽當前底圖 ID 變化
    watch(() => props.currentBaseMapId, (newId) => {
      selectedBaseMapId.value = newId
    })
    
    // 監聽 baseMapService 變化
    watch(() => props.baseMapService, (newService) => {
      if (newService) {
      }
    }, { immediate: true })

    // 組件掛載時載入底圖列表
    onMounted(() => {
      if (props.projectId) {
        loadBaseMaps()
      }
      
      
      // 檢查 baseMapService 是否已準備好
      if (props.baseMapService) {
      } else {
      }
    })

    // 組件卸載時清理
    onUnmounted(() => {
      try {
        
        // 清理狀態
        baseMaps.value = []
        selectedBaseMapId.value = ''
        isBaseMapActive.value = false
        isLoadingBaseMap.value = false
        loading.value = false
        error.value = ''
      } catch (error) {
        console.warn('BaseMapSelector 組件卸載時發生錯誤:', error)
      }
    })

    return {
      baseMaps,
      selectedBaseMapId,
      selectedBaseMap,
      loading,
      error,
      isBaseMapActive,
      isLoadingBaseMap,
      loadBaseMaps,
      refreshBaseMaps,
      toggleBaseMap,
      onLoadingComplete,
      locateBaseMap,
      editBaseMap,
      deleteBaseMap,
      formatFileSize,
      formatDate
    }
  }
}
</script>

<style scoped>
.basemap-selector {
  @apply w-full;
}

/* 載入動畫 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
