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
        class="p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg backdrop-blur-sm"
        :class="[
          isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300',
          selectedBaseMapId === baseMap.id ? (isDarkMode ? 'ring-2 ring-blue-400/60 shadow-blue-400/20' : 'ring-2 ring-blue-500/60 shadow-blue-500/20') : ''
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-medium transition-colors duration-300 truncate"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ baseMap.name }}
              </h4>
            </div>
            <p class="text-xs mt-1 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              {{ formatDate(baseMap.uploadDate) }}
            </p>
        </div>
        
          <div class="flex items-center space-x-1 ml-2">
            <!-- 眼睛按鈕（顯示/隱藏） -->
            <button @click="toggleBaseMap(baseMap)"
                    class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                    :class="isBaseMapActive && selectedBaseMapId === baseMap.id 
                      ? (isDarkMode ? 'text-blue-400 bg-blue-400/10' : 'text-blue-600 bg-blue-50')
                      : (isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50')"
                    :disabled="isLoadingBaseMap"
                    title="顯示/隱藏正射影像">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="isBaseMapActive && selectedBaseMapId === baseMap.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path v-if="isBaseMapActive && selectedBaseMapId === baseMap.id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
              </svg>
            </button>
            
            <!-- 定位按鈕 -->
            <button @click="locateBaseMap(baseMap)"
                    class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                    :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                    title="定位到正射影像">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
            
            <!-- 編輯按鈕 -->
            <button @click="editBaseMap(baseMap)"
                    class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                    :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                    title="編輯正射影像">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            
            <!-- 刪除按鈕 -->
            <button @click="deleteBaseMap(baseMap)"
                    class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                    :class="isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'"
                    title="刪除正射影像">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
            
        </div>
        </div>
      </div>
    </div>

    <!-- 無底圖狀態 -->
    <div v-else class="p-3 text-center">
      <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
        暫無正射影像底圖
      </p>
      <p class="text-xs mt-1" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
        請先上傳正射影像檔案
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
        const response = await fetch(`http://localhost:3001/api/data/project/${props.projectId}/basemaps`)
        const result = await response.json()
        
        if (result.success) {
          baseMaps.value = result.data
          console.log('底圖列表載入成功:', result.data)
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
      console.log('toggleBaseMap 被調用:', baseMap.name, 'isLoadingBaseMap:', isLoadingBaseMap.value)
      
      if (baseMap && !isLoadingBaseMap.value) {
        // 檢查是否為 COG 文件
        const isCOG = props.baseMapService?.isCOGFile(baseMap.storagePath || baseMap.originalName)
        console.log('是否為 COG 文件:', isCOG)
        
        
        console.log('可以切換底圖')
        
        // 如果點擊的是當前選中的底圖，切換其狀態
        if (selectedBaseMapId.value === baseMap.id) {
          if (isBaseMapActive.value) {
            // 關閉底圖
            console.log('關閉底圖')
            isBaseMapActive.value = false
            emit('base-map-changed', null)
          } else {
            // 開啟底圖，顯示載入動畫
            console.log('開啟底圖')
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
          console.log('切換到新底圖')
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
        
        console.log('切換底圖狀態:', isBaseMapActive.value ? '開啟' : '關閉')
      } else {
        console.log('無法切換底圖 - baseMap:', !!baseMap, 'isLoadingBaseMap:', isLoadingBaseMap.value)
      }
    }

    // 載入完成回調（由父組件調用）
    const onLoadingComplete = () => {
      isLoadingBaseMap.value = false
    }

    // 定位正射影像
    const locateBaseMap = (baseMap) => {
      console.log('定位正射影像:', baseMap.name)
      emit('base-map-located', baseMap)
    }

    // 編輯正射影像
    const editBaseMap = (baseMap) => {
      console.log('編輯正射影像:', baseMap.name)
      emit('base-map-edited', baseMap)
    }

    // 刪除正射影像
    const deleteBaseMap = (baseMap) => {
      console.log('請求刪除正射影像:', baseMap.name)
      
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
      console.log('BaseMapSelector baseMapService 變化:', !!newService)
      if (newService) {
        console.log('BaseMapSelector 收到 baseMapService')
      }
    }, { immediate: true })

    // 組件掛載時載入底圖列表
    onMounted(() => {
      if (props.projectId) {
        loadBaseMaps()
      }
      
      
      // 檢查 baseMapService 是否已準備好
      if (props.baseMapService) {
        console.log('BaseMapService 已準備好')
      } else {
        console.log('BaseMapService 尚未準備好，等待傳遞...')
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
