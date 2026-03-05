<template>
  <div v-if="isVisible" class="absolute top-0 right-0 w-2/5 h-3/4 z-[1002] overflow-hidden">
    <!-- 主要照片容器 -->
    <div class="relative w-full h-full">
      <!-- 滿版照片 -->
      <div v-if="mainPhoto" class="w-full h-full relative bg-gray-900">
        <!-- 照片（完整顯示，可點擊放大） -->
        <img
          :src="getMediaUrl(mainPhoto)"
          :alt="mainPhoto.original_name"
          class="w-full h-full object-contain cursor-pointer"
          @error="handleImageError"
          @click="openFullscreen"
          loading="lazy"
          :data-error-handled="false"
          title="點擊放大查看"
        />
        
        <!-- 左右切換按鈕（當有多張照片時） -->
        <template v-if="hasMultiplePhotos">
          <!-- 上一張按鈕 -->
          <button
            v-if="canGoPrevious"
            @click="previousPhoto"
            class="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full backdrop-blur-md bg-white/80 hover:bg-white shadow-lg transition-all z-10"
            title="上一張照片"
          >
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <!-- 下一張按鈕 -->
          <button
            v-if="canGoNext"
            @click="nextPhoto"
            class="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full backdrop-blur-md bg-white/80 hover:bg-white shadow-lg transition-all z-10"
            title="下一張照片"
          >
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
          
          <!-- 照片計數器 -->
          <div class="absolute top-4 left-4 px-3 py-1 rounded-lg backdrop-blur-md bg-black/50 text-white text-sm font-medium">
            {{ currentPhotoIndex + 1 }} / {{ mediaFiles.length }}
          </div>
        </template>
        
        <!-- 右上方：發生時間 -->
        <div 
          v-if="currentDisasterTime"
          class="absolute top-4 right-4 px-4 py-2 rounded-lg backdrop-blur-sm"
          style="background-color: rgba(255, 255, 255, 0.8);"
        >
          <span class="text-sm font-medium text-gray-900">
            {{ formatDisasterTime(currentDisasterTime) }}
          </span>
        </div>
        
        <!-- 底部：災點描述和縮略圖 -->
        <div class="absolute bottom-0 left-0 right-0 backdrop-blur-sm" style="background-color: rgba(255, 255, 255, 0.9);">
          <!-- 災點描述 -->
          <div 
            v-if="currentDisasterDescription"
            class="px-6 py-3 border-b border-gray-200"
          >
            <p class="text-center text-sm text-gray-900 leading-relaxed">
              {{ currentDisasterDescription }}
            </p>
          </div>
          
          <!-- 縮略圖列表（當有多張照片時） -->
          <div 
            v-if="hasMultiplePhotos"
            class="px-4 py-3 overflow-x-auto"
          >
            <div class="flex space-x-2">
              <button
                v-for="(photo, index) in mediaFiles"
                :key="`thumb-${photo.media_id}-${index}`"
                @click="goToPhoto(index)"
                class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all"
                :class="index === currentPhotoIndex ? 'border-blue-500 shadow-lg' : 'border-gray-300 opacity-60 hover:opacity-100'"
                :title="getThumbnailTitle(photo, index)"
              >
                <img
                  :src="getMediaUrl(photo)"
                  :alt="photo.original_name || '照片'"
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                  loading="lazy"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 無照片提示 -->
      <div v-else class="w-full h-full flex items-center justify-center bg-gray-100">
        <div class="text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p class="text-sm text-gray-500">
            暫無照片
          </p>
        </div>
      </div>
    </div>
    
  </div>
  
  <!-- 全螢幕照片預覽模態框（使用 Teleport 渲染到 body） -->
  <Teleport to="body">
    <Transition name="fullscreen-fade">
      <div 
        v-if="isFullscreenOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center"
        @click.self="closeFullscreen"
      >
        <!-- 模糊背景 -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
        
        <!-- 照片容器 -->
        <div class="relative z-10 w-full h-full flex items-center justify-center p-8">
          <!-- 主照片 -->
          <img
            v-if="mainPhoto"
            :src="getMediaUrl(mainPhoto)"
            :alt="mainPhoto.original_name"
            class="max-w-full max-h-full object-contain"
            @error="handleImageError"
          />
          
          <!-- 左右切換按鈕 -->
          <template v-if="hasMultiplePhotos">
            <!-- 上一張 -->
            <button
              v-if="canGoPrevious"
              @click="fullscreenPrevious"
              class="absolute left-8 top-1/2 transform -translate-y-1/2 p-4 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all"
              title="上一張照片"
            >
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            
            <!-- 下一張 -->
            <button
              v-if="canGoNext"
              @click="fullscreenNext"
              class="absolute right-8 top-1/2 transform -translate-y-1/2 p-4 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all"
              title="下一張照片"
            >
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </template>
          
          <!-- 關閉按鈕 -->
          <button
            @click="closeFullscreen"
            class="absolute top-4 right-4 p-3 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all"
            title="關閉全螢幕"
          >
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <!-- 照片資訊 -->
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg bg-black/60 backdrop-blur-sm max-w-2xl">
            <div class="text-center">
              <p class="text-white text-sm font-medium">
                {{ mainPhoto?.original_name || '照片' }}
              </p>
              <p v-if="mainPhoto?.disasterPointDescription" class="text-white/90 text-xs mt-2">
                {{ mainPhoto.disasterPointDescription }}
              </p>
              <p v-if="hasMultiplePhotos" class="text-white/80 text-xs mt-1">
                {{ currentPhotoIndex + 1 }} / {{ mediaFiles.length }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'DisasterPointBrowseModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    // 支援單個災點（用於子專案內瀏覽）
    disasterPoint: {
      type: Object,
      default: null
    },
    // 支援多個災點（用於動畫模式）
    disasterPoints: {
      type: Array,
      default: () => []
    },
    orderNumber: {
      type: Number,
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  data() {
    return {
      previewMedia: null,
      currentPhotoIndex: 0,  // 當前顯示的照片索引
      isFullscreenOpen: false  // 是否開啟全螢幕預覽
    }
  },
  watch: {
    // 當災點改變時，重置照片索引（監聽兩個 prop）
    disasterPoint() {
      this.currentPhotoIndex = 0
    },
    disasterPoints: {
      handler() {
        this.currentPhotoIndex = 0
      },
      deep: false
    },
    
    // 當模態框可見性改變時
    isVisible(newVal) {
      if (!newVal) {
        // 關閉時重置索引
        this.currentPhotoIndex = 0
      }
    },
    
    // 監聽全螢幕模式，添加/移除鍵盤事件監聽
    isFullscreenOpen(newVal) {
      if (newVal) {
        window.addEventListener('keydown', this.handleKeydown)
      } else {
        window.removeEventListener('keydown', this.handleKeydown)
      }
    }
  },
  
  mounted() {
    // 組件掛載時，如果全螢幕模式已開啟，添加鍵盤監聽
    if (this.isFullscreenOpen) {
      window.addEventListener('keydown', this.handleKeydown)
    }
  },
  
  beforeUnmount() {
    // 組件卸載時移除鍵盤監聽
    window.removeEventListener('keydown', this.handleKeydown)
  },
  computed: {
    // 合併所有災點的照片（支援單個或多個災點）
    mediaFiles() {
      console.log('===== [DisasterPointBrowseModal.mediaFiles] 開始計算 =====')
      console.log('[DisasterPointBrowseModal.mediaFiles] isVisible:', this.isVisible)
      console.log('[DisasterPointBrowseModal.mediaFiles] orderNumber:', this.orderNumber)
      console.log('[DisasterPointBrowseModal.mediaFiles] disasterPoint:', this.disasterPoint)
      console.log('[DisasterPointBrowseModal.mediaFiles] disasterPoints 數量:', this.disasterPoints?.length)
      
      // 決定使用哪個 prop（優先使用 disasterPoints 數組，其次使用單個 disasterPoint）
      let pointsToProcess = []
      if (this.disasterPoints && this.disasterPoints.length > 0) {
        // 使用多個災點（動畫模式）
        pointsToProcess = this.disasterPoints
        console.log('[DisasterPointBrowseModal.mediaFiles] 使用多個災點模式')
      } else if (this.disasterPoint) {
        // 使用單個災點（子專案內瀏覽）
        pointsToProcess = [this.disasterPoint]
        console.log('[DisasterPointBrowseModal.mediaFiles] 使用單個災點模式')
      }
      
      if (pointsToProcess.length === 0) {
        console.log('[DisasterPointBrowseModal.mediaFiles] ❌ 沒有災點數據')
        return []
      }
      
      // 先按災點時間排序災點數組
      const sortedDisasterPoints = [...pointsToProcess].sort((a, b) => {
        const timeA = a.disaster_time ? new Date(a.disaster_time).getTime() : 0
        const timeB = b.disaster_time ? new Date(b.disaster_time).getTime() : 0
        return timeA - timeB  // 時間早的在前面
      })
      
      console.log('[DisasterPointBrowseModal.mediaFiles] 災點排序結果:', sortedDisasterPoints.map(dp => ({
        id: dp.disaster_point_id,
        time: dp.disaster_time,
        description: dp.description
      })))
      
      const allMediaFiles = []
      
      // 遍歷排序後的災點，收集照片
      sortedDisasterPoints.forEach((disasterPoint, dpIdx) => {
        console.log(`[DisasterPointBrowseModal.mediaFiles] 處理災點 ${dpIdx + 1}:`, {
          disaster_point_id: disasterPoint.disaster_point_id,
          description: disasterPoint.description || '無描述',
          disaster_time: disasterPoint.disaster_time || '無時間',
          has_media_files: !!disasterPoint.media_files
        })
        
        if (!disasterPoint.media_files || !Array.isArray(disasterPoint.media_files)) {
          console.log(`[DisasterPointBrowseModal.mediaFiles] 災點 ${dpIdx + 1} 沒有媒體文件`)
          return
        }
        
        // 過濾並添加媒體文件（同時記錄災點信息）
        disasterPoint.media_files.forEach((media, mediaIdx) => {
          if (media.storage_path && media.storage_path.trim() !== '') {
            // 將災點描述和時間附加到媒體對象
            const mediaWithInfo = {
              ...media,
              disasterPointDescription: disasterPoint.description || '無描述',
              disasterPointTime: disasterPoint.disaster_time || null,
              disasterPointId: disasterPoint.disaster_point_id
            }
            
            allMediaFiles.push(mediaWithInfo)
            
            console.log(`[DisasterPointBrowseModal.mediaFiles] 添加媒體 ${mediaIdx + 1}:`, {
              media_id: media.media_id,
              original_name: media.original_name,
              storage_path: media.storage_path,
              disaster_description: mediaWithInfo.disasterPointDescription,
              disaster_time: mediaWithInfo.disasterPointTime
            })
          }
        })
      })
      
      console.log('[DisasterPointBrowseModal.mediaFiles] ✅ 總共收集到照片:', allMediaFiles.length)
      console.log('[DisasterPointBrowseModal.mediaFiles] ✅ 所有照片詳情:')
      allMediaFiles.forEach((photo, idx) => {
        console.log(`  照片 ${idx + 1}:`, {
          media_id: photo.media_id,
          description: photo.disasterPointDescription,
          time: photo.disasterPointTime,
          has_description: !!photo.disasterPointDescription,
          has_time: !!photo.disasterPointTime
        })
      })
      console.log('===== [DisasterPointBrowseModal.mediaFiles] 計算完成 =====')
      
      return allMediaFiles
    },
    // 獲取當前顯示的照片（根據索引）
    mainPhoto() {
      console.log('===== [DisasterPointBrowseModal.mainPhoto] 開始計算 =====')
      console.log('[DisasterPointBrowseModal.mainPhoto] mediaFiles 數量:', this.mediaFiles?.length)
      console.log('[DisasterPointBrowseModal.mainPhoto] currentPhotoIndex:', this.currentPhotoIndex)
      
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        console.log('[DisasterPointBrowseModal.mainPhoto] ❌ 沒有媒體文件可顯示')
        return null
      }
      
      // 確保索引在有效範圍內
      const validIndex = Math.max(0, Math.min(this.currentPhotoIndex, this.mediaFiles.length - 1))
      const result = this.mediaFiles[validIndex] || null
      
      console.log('[DisasterPointBrowseModal.mainPhoto] ✅ 最終結果:', result)
      console.log('===== [DisasterPointBrowseModal.mainPhoto] 計算完成 =====')
      
      return result
    },
    
    // 獲取當前照片的災點描述（安全訪問）
    currentDisasterDescription() {
      const description = this.mainPhoto?.disasterPointDescription
      console.log('[currentDisasterDescription]', {
        mainPhoto: this.mainPhoto,
        description: description,
        has_description: !!description
      })
      // 如果描述是 '無描述'，則不顯示
      if (!description || description === '無描述') {
        return ''
      }
      return description
    },
    
    // 獲取當前照片的災點時間（安全訪問）
    currentDisasterTime() {
      const time = this.mainPhoto?.disasterPointTime
      console.log('[currentDisasterTime]', {
        mainPhoto: this.mainPhoto,
        time: time,
        has_time: !!time
      })
      return time || null
    },
    
    // 是否有多張照片
    hasMultiplePhotos() {
      return this.mediaFiles && this.mediaFiles.length > 1
    },
    
    // 是否可以顯示上一張
    canGoPrevious() {
      return this.currentPhotoIndex > 0
    },
    
    // 是否可以顯示下一張
    canGoNext() {
      return this.currentPhotoIndex < (this.mediaFiles?.length || 0) - 1
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },
    
    // 上一張照片
    previousPhoto() {
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        return
      }
      if (this.canGoPrevious) {
        this.currentPhotoIndex--
      }
    },
    
    // 下一張照片
    nextPhoto() {
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        return
      }
      if (this.canGoNext) {
        this.currentPhotoIndex++
      }
    },
    
    // 跳轉到指定照片
    goToPhoto(index) {
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        return
      }
      if (index >= 0 && index < this.mediaFiles.length) {
        this.currentPhotoIndex = index
      }
    },
    
    // 開啟全螢幕預覽
    openFullscreen() {
      this.isFullscreenOpen = true
    },
    
    // 關閉全螢幕預覽
    closeFullscreen() {
      this.isFullscreenOpen = false
    },
    
    // 全螢幕模式下的上一張
    fullscreenPrevious() {
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        return
      }
      if (this.canGoPrevious) {
        this.currentPhotoIndex--
      }
    },
    
    // 全螢幕模式下的下一張
    fullscreenNext() {
      if (!this.mediaFiles || this.mediaFiles.length === 0) {
        return
      }
      if (this.canGoNext) {
        this.currentPhotoIndex++
      }
    },
    
    // 處理鍵盤事件
    handleKeydown(event) {
      if (!this.isFullscreenOpen) return
      
      switch (event.key) {
        case 'Escape':
          this.closeFullscreen()
          break
        case 'ArrowLeft':
          this.fullscreenPrevious()
          break
        case 'ArrowRight':
          this.fullscreenNext()
          break
      }
    },
    
    // 獲取縮略圖的提示文字
    getThumbnailTitle(photo, index) {
      if (!photo) return `照片 ${index + 1}`
      
      let title = `照片 ${index + 1}`
      if (photo.disasterPointDescription) {
        title += `: ${photo.disasterPointDescription}`
      }
      if (photo.original_name) {
        title += ` (${photo.original_name})`
      }
      return title
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
    },
    
    getMediaUrl(media) {
      console.log('[DisasterPointBrowseModal] getMediaUrl - media:', media)
      
      // 構建媒體文件的 URL
      if (media.storage_path) {
        let url = ''
        // 如果是相對路徑（以 /uploads/ 開頭），直接使用（後端會通過 /uploads 路由提供）
        if (media.storage_path.startsWith('/uploads/')) {
          // 確保路徑正確：如果是 Windows 路徑風格，轉換為 Unix 風格
          url = media.storage_path.replace(/\\/g, '/')
        } else {
          // 如果是完整路徑，直接使用
          url = media.storage_path
        }
        
        console.log('[DisasterPointBrowseModal] 媒體 URL:', url)
        return url
      }
      
      // 如果有 thumbnail_path，使用縮圖
      if (media.thumbnail_path) {
        console.log('[DisasterPointBrowseModal] 使用縮圖:', media.thumbnail_path)
        return media.thumbnail_path
      }
      
      // 如果沒有 storage_path，返回空字符串（前端會顯示錯誤處理）
      console.log('[DisasterPointBrowseModal] 沒有有效的媒體路徑')
      return ''
    },
    
    
    handleImageError(event) {
      // 圖片載入失敗時顯示佔位圖
      // 防止404錯誤的無限循環
      if (event.target.dataset.errorHandled === 'true') {
        return
      }
      event.target.dataset.errorHandled = 'true'
      if (event.target.src && !event.target.src.includes('data:image/svg+xml')) {
        event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ccc"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E圖片載入失敗%3C/text%3E%3C/svg%3E'
      }
    }
  }
}
</script>

<style scoped>
/* 全螢幕模態框淡入淡出動畫 */
.fullscreen-fade-enter-active,
.fullscreen-fade-leave-active {
  transition: opacity 0.3s ease;
}

.fullscreen-fade-enter-from,
.fullscreen-fade-leave-to {
  opacity: 0;
}

/* 圖片區域背景色，確保照片完整顯示 */
.bg-gray-900 {
  background-color: #111827;
}
</style>

