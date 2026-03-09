<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4"
           @click.self="handleClose">
        <div class="relative w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
             @click.stop>
          
          <!-- 標題欄 -->
          <div class="flex items-center justify-between px-6 py-4 border-b"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded-lg"
                   :class="isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-semibold"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  影像紀錄
                </h2>
                <p class="text-sm mt-0.5"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  {{ childProject?.name || '事件紀錄' }}
                </p>
              </div>
            </div>
            
            <button @click="handleClose"
                    class="p-2 rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 主要內容區域 -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <!-- 上傳區域 -->
            <div class="px-6 py-4 border-b"
                 :class="isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'">
              <div class="flex items-center space-x-4">
                <!-- 照片上傳 -->
                <label class="flex-1">
                  <input
                    ref="photoInput"
                    type="file"
                    accept="image/*"
                    multiple
                    @change="handlePhotoUpload"
                    class="hidden"
                  />
                  <div class="flex items-center justify-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300"
                       :class="isDarkMode ? 
                         'border-slate-600 hover:border-orange-500 bg-slate-800/50 hover:bg-slate-800' : 
                         'border-gray-300 hover:border-orange-500 bg-white hover:bg-orange-50'">
                    <div class="flex items-center space-x-2"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span class="text-sm font-medium">上傳照片</span>
                    </div>
                  </div>
                </label>
                
                <!-- 影片上傳 -->
                <label class="flex-1">
                  <input
                    ref="videoInput"
                    type="file"
                    accept="video/*"
                    multiple
                    @change="handleVideoUpload"
                    class="hidden"
                  />
                  <div class="flex items-center justify-center px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300"
                       :class="isDarkMode ? 
                         'border-slate-600 hover:border-orange-500 bg-slate-800/50 hover:bg-slate-800' : 
                         'border-gray-300 hover:border-orange-500 bg-white hover:bg-orange-50'">
                    <div class="flex items-center space-x-2"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      <span class="text-sm font-medium">上傳影片</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 媒體瀏覽區域 -->
            <div class="flex-1 overflow-y-auto p-6">
              <!-- 載入中 -->
              <div v-if="isLoading" class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2"
                     :class="isDarkMode ? 'border-orange-400' : 'border-orange-500'"></div>
              </div>

              <!-- 空狀態 -->
              <div v-else-if="mediaList.length === 0" class="flex flex-col items-center justify-center py-12">
                <svg class="w-16 h-16 mb-4"
                     :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p class="text-lg font-medium mb-2"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  尚無影像紀錄
                </p>
                <p class="text-sm"
                   :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
                  請上傳照片或影片建立事件紀錄
                </p>
              </div>

              <!-- 媒體網格 -->
              <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                  v-for="media in mediaList"
                  :key="media.id"
                  class="group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105"
                  :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'"
                  @click="openPreview(media)"
                >
                  <!-- 照片 -->
                  <img
                    v-if="media.type === 'image'"
                    :src="media.thumbnail || media.url"
                    :alt="media.name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                  
                  <!-- 影片 -->
                  <div v-else class="w-full h-full flex items-center justify-center bg-black">
                    <video
                      :src="media.url"
                      class="w-full h-full object-cover"
                      preload="metadata"
                    ></video>
                    <!-- 播放圖標 -->
                    <div class="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg class="w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                      </svg>
                    </div>
                  </div>

                  <!-- 懸浮操作欄 -->
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                    <button
                      @click.stop="openPreview(media)"
                      class="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                      title="預覽"
                    >
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button
                      @click.stop="handleDelete(media)"
                      class="p-2 rounded-lg bg-red-500/80 hover:bg-red-600 transition-colors"
                      title="刪除"
                    >
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>

                  <!-- 類型標籤 -->
                  <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
                       :class="media.type === 'image' ? 
                         'bg-blue-500/80 text-white' : 
                         'bg-purple-500/80 text-white'">
                    {{ media.type === 'image' ? '照片' : '影片' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 預覽模態框 -->
  <Teleport to="body">
    <Transition name="modal">
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
            v-if="previewMedia.type === 'image'"
            :src="previewMedia.url"
            :alt="previewMedia.name"
            class="max-w-full max-h-[90vh] mx-auto object-contain rounded-lg"
          />

          <!-- 影片預覽 -->
          <div v-else class="max-w-full max-h-[90vh] mx-auto">
            <video
              :src="previewMedia.url"
              controls
              class="max-w-full max-h-[90vh] rounded-lg"
            ></video>
          </div>

          <!-- 媒體信息 -->
          <div class="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3">
            <p class="text-white font-medium">{{ previewMedia.name }}</p>
            <p class="text-white/80 text-sm mt-1">
              {{ formatDate(previewMedia.uploadDate || previewMedia.createdAt) }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ImageRecordModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    childProject: {
      type: Object,
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
      mediaList: [],
      isLoading: false,
      previewMedia: null,
      uploadingFiles: []
    }
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        this.loadMediaList()
      } else {
        this.mediaList = []
        this.previewMedia = null
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },

    async loadMediaList() {
      if (!this.childProject?.project_id) {
        console.warn('缺少子專案 ID，無法載入影像紀錄')
        return
      }

      this.isLoading = true
      try {
        // TODO: 連接後端 API
        // const response = await this.$api.get(`/child-projects/${this.childProject.project_id}/media`)
        // if (response.success) {
        //   this.mediaList = response.data
        // }
        
        // 暫時使用模擬數據
        this.mediaList = []
      } catch (error) {
        console.error('載入影像紀錄失敗:', error)
      } finally {
        this.isLoading = false
      }
    },

    async handlePhotoUpload(event) {
      const files = Array.from(event.target.files)
      if (files.length === 0) return

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          console.warn('不是有效的圖片文件:', file.name)
          continue
        }

        await this.uploadFile(file, 'image')
      }

      // 重置 input
      if (this.$refs.photoInput) {
        this.$refs.photoInput.value = ''
      }
    },

    async handleVideoUpload(event) {
      const files = Array.from(event.target.files)
      if (files.length === 0) return

      for (const file of files) {
        if (!file.type.startsWith('video/')) {
          console.warn('不是有效的影片文件:', file.name)
          continue
        }

        await this.uploadFile(file, 'video')
      }

      // 重置 input
      if (this.$refs.videoInput) {
        this.$refs.videoInput.value = ''
      }
    },

    async uploadFile(file, type) {
      if (!this.childProject?.project_id) {
        console.error('缺少子專案 ID，無法上傳')
        return
      }

      const fileId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.uploadingFiles.push({ id: fileId, file, type, progress: 0 })

      try {
        // 創建預覽 URL
        const previewUrl = URL.createObjectURL(file)

        // TODO: 連接後端 API 上傳
        // const formData = new FormData()
        // formData.append('file', file)
        // formData.append('type', type)
        // formData.append('projectId', this.childProject.project_id)
        // 
        // const response = await this.$api.post('/media/upload', formData, {
        //   headers: { 'Content-Type': 'multipart/form-data' },
        //   onUploadProgress: (progressEvent) => {
        //     const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        //     const uploadItem = this.uploadingFiles.find(item => item.id === fileId)
        //     if (uploadItem) {
        //       uploadItem.progress = progress
        //     }
        //   }
        // })
        // 
        // if (response.success) {
        //   this.mediaList.unshift({
        //     id: response.data.id,
        //     url: response.data.url,
        //     thumbnail: response.data.thumbnail,
        //     name: file.name,
        //     type: type,
        //     uploadDate: new Date(),
        //     ...response.data
        //   })
        // }

        // 暫時使用模擬數據
        const mockMedia = {
          id: fileId,
          url: previewUrl,
          thumbnail: type === 'image' ? previewUrl : null,
          name: file.name,
          type: type,
          uploadDate: new Date(),
          size: file.size
        }

        this.mediaList.unshift(mockMedia)

        // 移除上傳中的文件
        const index = this.uploadingFiles.findIndex(item => item.id === fileId)
        if (index > -1) {
          this.uploadingFiles.splice(index, 1)
        }
      } catch (error) {
        console.error('上傳失敗:', error)
        
        // 移除上傳中的文件
        const index = this.uploadingFiles.findIndex(item => item.id === fileId)
        if (index > -1) {
          this.uploadingFiles.splice(index, 1)
        }
      }
    },

    openPreview(media) {
      this.previewMedia = media
    },

    closePreview() {
      this.previewMedia = null
    },

    async handleDelete(media) {
      if (!confirm(`確定要刪除「${media.name}」嗎？`)) {
        return
      }

      try {
        // TODO: 連接後端 API 刪除
        // await this.$api.delete(`/media/${media.id}`)
        
        // 暫時直接從列表中移除
        const index = this.mediaList.findIndex(item => item.id === media.id)
        if (index > -1) {
          this.mediaList.splice(index, 1)
          
          // 如果是預覽中的媒體，關閉預覽
          if (this.previewMedia?.id === media.id) {
            this.closePreview()
          }
        }

      } catch (error) {
        console.error('刪除失敗:', error)
        alert('刪除失敗，請稍後再試')
      }
    },

    handleImageError(event) {
      // 圖片載入失敗時顯示佔位圖
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+'
    },

    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
