<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- 背景遮罩 -->
      <div 
        class="absolute inset-0 transition-opacity duration-300"
        :class="isDarkMode ? 'bg-black/70' : 'bg-black/50'"
        @click="handleClose"
      ></div>
      
      <!-- 模態框內容 -->
      <div 
        class="relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl transition-all duration-300 transform overflow-hidden flex flex-col"
        :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
      >
        <!-- 標題列 -->
        <div 
          class="flex items-center justify-between p-6 border-b flex-shrink-0"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <div class="flex items-center space-x-3">
            <!-- 災點圖標 -->
            <div class="p-2 rounded-lg bg-red-600/20">
              <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg">
                !
              </div>
            </div>
            <div>
              <h3 class="text-xl font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ disasterPoint?.name || '災點紀錄' }}
              </h3>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                災點詳情資訊
              </p>
            </div>
          </div>
          
          <!-- 關閉按鈕 -->
          <button
            @click="handleClose"
            class="p-2 rounded-lg transition-all duration-300"
            :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 內容區域 -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- 所屬事件資訊 -->
          <div v-if="disasterPoint?.project_info">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              所屬事件
            </label>
            <div class="px-4 py-3 rounded-lg"
                 :class="isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-50 text-gray-900'">
              <div class="font-semibold">{{ disasterPoint.project_info.project_name }}</div>
              <div v-if="disasterPoint.project_info.project_description" class="text-sm mt-1"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                {{ disasterPoint.project_info.project_description }}
              </div>
            </div>
          </div>
          
          <!-- 災點描述 -->
          <div v-if="disasterPoint?.description">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              災點描述
            </label>
            <div class="px-4 py-3 rounded-lg"
                 :class="isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-50 text-gray-900'">
              {{ disasterPoint.description }}
            </div>
          </div>
          
          <!-- 災害時間 -->
          <div v-if="disasterPoint?.disaster_time">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              災害時間
            </label>
            <div class="px-4 py-3 rounded-lg"
                 :class="isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-50 text-gray-900'">
              {{ formatDisasterTime(disasterPoint.disaster_time) }}
            </div>
          </div>
          
          <!-- 座標資訊 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              座標位置
            </label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs font-medium mb-1"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  緯度 (Latitude)
                </div>
                <div class="px-4 py-2 rounded-lg font-mono text-sm"
                     :class="isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-50 text-gray-900'">
                  {{ formatCoordinate(disasterPoint?.latitude) }}
                </div>
              </div>
              <div>
                <div class="text-xs font-medium mb-1"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  經度 (Longitude)
                </div>
                <div class="px-4 py-2 rounded-lg font-mono text-sm"
                     :class="isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-50 text-gray-900'">
                  {{ formatCoordinate(disasterPoint?.longitude) }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 照片和影片 -->
          <div v-if="mediaFiles && mediaFiles.length > 0">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              照片與影片 ({{ mediaFiles.length }})
            </label>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="media in mediaFiles"
                :key="media.media_id"
                class="relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:scale-105"
                :class="isDarkMode ? 'border-slate-600' : 'border-gray-300'"
              >
                <!-- 刪除按鈕 -->
                <button
                  @click.stop="deleteMedia(media)"
                  class="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="刪除照片"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
                
                <div @click="openMediaPreview(media)" class="relative w-full h-full">
                  <!-- 照片 -->
                  <img
                    v-if="media.media_type === 'image'"
                    :src="getMediaUrl(media)"
                    :alt="media.original_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                    loading="lazy"
                    :data-error-handled="false"
                  />
                  
                  <!-- 影片 -->
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center"
                    :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'"
                  >
                    <svg class="w-12 h-12" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  
                  <!-- 檔案名稱提示 -->
                  <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ media.original_name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 無媒體提示 -->
          <div v-else class="text-center py-8">
            <svg class="w-16 h-16 mx-auto mb-4"
                 :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-sm" :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
              暫無照片或影片
            </p>
          </div>
          
        </div>
        
        <!-- 底部按鈕 -->
        <div 
          class="flex items-center justify-end space-x-3 p-6 border-t flex-shrink-0"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <button
            @click="handleClose"
            class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300"
            :class="isDarkMode 
              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
    
    <!-- 媒體預覽模態框 -->
    <Teleport to="body">
      <div v-if="previewMedia" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
           @click.self="closePreview">
        <div class="relative max-w-7xl max-h-[90vh] w-full">
          <!-- 關閉按鈕 -->
          <button
            @click="closePreview"
            class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>

          <!-- 照片預覽 -->
          <img
            v-if="previewMedia.media_type === 'image'"
            :src="getMediaUrl(previewMedia)"
            :alt="previewMedia.original_name"
            class="max-w-full max-h-[90vh] mx-auto object-contain rounded-lg"
          />

          <!-- 影片預覽 -->
          <div v-else class="max-w-full max-h-[90vh] mx-auto">
            <video
              :src="getMediaUrl(previewMedia)"
              controls
              class="max-w-full max-h-[90vh] rounded-lg"
            ></video>
          </div>

          <!-- 媒體信息 -->
          <div class="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3">
            <p class="text-white font-medium">{{ previewMedia.original_name }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </Teleport>
</template>

<script>
export default {
  name: 'DisasterPointViewModal',
  props: {
    isVisible: {
      type: Boolean,
      required: true
    },
    disasterPoint: {
      type: Object,
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'media-deleted'],
  data() {
    return {
      previewMedia: null
    }
  },
  computed: {
    mediaFiles() {
      if (!this.disasterPoint || !this.disasterPoint.media_files) {
        return []
      }
      // 確保 media_files 是陣列，並過濾掉已刪除的照片（storage_path 為 null 或空）
      const files = Array.isArray(this.disasterPoint.media_files) 
        ? this.disasterPoint.media_files 
        : []
      return files.filter(m => m.storage_path && m.storage_path.trim() !== '')
    }
  },
  methods: {
    handleClose() {
      this.previewMedia = null
      this.$emit('close')
    },
    
    getMediaUrl(media) {
      // 構建媒體文件的 URL
      if (media.storage_path) {
        // 如果是相對路徑（以 /uploads/ 開頭），直接使用（後端會通過 /uploads 路由提供）
        if (media.storage_path.startsWith('/uploads/')) {
          // 確保路徑正確：如果是 Windows 路徑風格，轉換為 Unix 風格
          return media.storage_path.replace(/\\/g, '/')
        }
        // 如果是完整路徑，直接使用
        return media.storage_path
      }
      // 如果有 thumbnail_path，使用縮圖
      if (media.thumbnail_path) {
        return media.thumbnail_path
      }
      return ''
    },
    
    openMediaPreview(media) {
      this.previewMedia = media
    },
    
    closePreview() {
      this.previewMedia = null
    },
    
    // 刪除照片
    async deleteMedia(media) {
      if (!media || !media.media_id || !this.disasterPoint || !this.disasterPoint.disaster_point_id) {
        return
      }
      
      // 使用自定義確認框（如果需要，可以替換為 CustomAlert）
      if (!confirm(`確定要刪除「${media.original_name}」嗎？此操作無法復原。`)) {
        return
      }
      
      try {
        const response = await this.$api.delete(
          `/disaster-points/${this.disasterPoint.disaster_point_id}/media/${media.media_id}`
        )
        
        if (response.success) {
          // 觸發事件，通知父組件更新災點數據
          this.$emit('media-deleted')
        } else {
          throw new Error(response.message || '刪除失敗')
        }
      } catch (error) {
        console.error('刪除照片失敗:', error)
        alert(`刪除失敗：${error.response?.data?.message || error.message || '未知錯誤'}`)
      }
    },
    
    handleImageError(event) {
      // 圖片載入失敗時顯示佔位圖
      // 如果已經設置過佔位圖，就不再重複設置，避免無限循環
      // 防止404錯誤的無限循環
      if (event.target.dataset.errorHandled === 'true') {
        return
      }
      event.target.dataset.errorHandled = 'true'
      if (event.target.src && !event.target.src.includes('data:image/svg+xml')) {
        event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ccc"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E圖片載入失敗%3C/text%3E%3C/svg%3E'
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    formatCoordinate(value) {
      if (value === null || value === undefined) return 'N/A'
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(num)) return 'N/A'
      return num.toFixed(7)
    },
    formatDisasterTime(timeString) {
      if (!timeString) return 'N/A'
      try {
        const date = new Date(timeString)
        if (isNaN(date.getTime())) return 'N/A'
        // 格式化為本地時間：YYYY年MM月DD日 上午/下午 HH:mm
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        // 轉換為12小時制
        let hours = date.getHours()
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const ampm = hours >= 12 ? '下午' : '上午'
        hours = hours % 12
        hours = hours ? hours : 12 // 0點顯示為12點
        const hoursStr = String(hours).padStart(2, '0')
        
        return `${year}年${month}月${day}日 ${ampm} ${hoursStr}:${minutes}`
      } catch (e) {
        return 'N/A'
      }
    }
  }
}
</script>

<style scoped>
/* 自訂滾動條 */
::-webkit-scrollbar {
  width: 8px;
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

