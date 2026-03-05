<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4"
           @click.self="handleClose">
        <div class="relative w-full max-w-7xl max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'"
             @click.stop>
          
          <!-- 標題欄 -->
          <div class="flex items-center justify-between px-6 py-4 border-b"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <div class="flex items-center space-x-3">
              <div class="p-2 rounded-lg"
                   :class="isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-semibold"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  照片瀏覽
                </h2>
                <p class="text-sm mt-0.5"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  {{ parentProject?.name || '母專案' }} - 所有時期照片
                </p>
              </div>
            </div>
            
            <button @click="handleClose"
                    class="p-2 rounded-lg transition-colors"
                    :class="isDarkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- 內容區域 -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- 載入中 -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
              <svg class="animate-spin h-10 w-10 mb-4" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">載入照片中...</p>
            </div>
            
            <!-- 無照片提示 -->
            <div v-else-if="allPhotos.length === 0" class="flex flex-col items-center justify-center py-12">
              <svg class="w-20 h-20 mb-4" :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <p class="text-lg font-medium mb-2" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                尚無照片
              </p>
              <p class="text-sm" :class="isDarkMode ? 'text-gray-500' : 'text-gray-600'">
                目前沒有任何時期的照片資料
              </p>
            </div>
            
            <!-- 照片列表 - 按子專案分組 -->
            <div v-else class="space-y-8">
              <div v-for="childProject in childProjectsWithPhotos" :key="childProject.project_id"
                   class="rounded-lg overflow-hidden"
                   :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'">
                
                <!-- 子專案標題 -->
                <div class="px-6 py-4 border-b"
                     :class="isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="text-lg font-semibold"
                          :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                        {{ childProject.name }}
                      </h3>
                      <p class="text-sm mt-1" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                        {{ formatEventDate(childProject.event_date) }}
                      </p>
                    </div>
                    <div class="px-3 py-1 rounded-full text-sm font-medium"
                         :class="isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'">
                      {{ childProject.photos.length }} 張照片
                    </div>
                  </div>
                </div>
                
                <!-- 照片網格 -->
                <div class="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div v-for="photo in childProject.photos" :key="photo.media_id"
                       @click="openPhotoPreview(photo, childProject)"
                       class="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                    <img
                      :src="getMediaUrl(photo)"
                      :alt="photo.original_name"
                      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      @error="handleImageError"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                      <svg class="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                      </svg>
                    </div>
                    <!-- 照片描述 -->
                    <div v-if="photo.description" class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {{ photo.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 照片預覽模態框 -->
        <div v-if="previewPhoto" class="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
             @click="closePhotoPreview">
          <button @click="closePhotoPreview"
                  class="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <!-- 預覽圖片 -->
          <div class="relative max-w-5xl max-h-[90vh] flex flex-col" @click.stop>
            <img
              :src="getMediaUrl(previewPhoto)"
              :alt="previewPhoto.original_name"
              class="max-w-full max-h-[80vh] object-contain rounded-lg"
              @error="handleImageError"
            />
            
            <!-- 照片信息 -->
            <div class="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
              <p class="font-medium text-lg mb-1">{{ previewChildProject?.name }}</p>
              <p v-if="previewPhoto.description" class="text-sm text-gray-300 mb-2">{{ previewPhoto.description }}</p>
              <p class="text-xs text-gray-400">{{ formatEventDate(previewChildProject?.event_date) }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ParentProjectPhotoGalleryModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    parentProject: {
      type: Object,
      default: null
    },
    childProjects: {
      type: Array,
      default: () => []
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  data() {
    return {
      isLoading: false,
      allPhotos: [],
      previewPhoto: null,
      previewChildProject: null
    }
  },
  computed: {
    childProjectsWithPhotos() {
      // 過濾出有照片的子專案，並按時間排序
      return this.childProjects
        .map(child => ({
          ...child,
          photos: this.getChildProjectPhotos(child.project_id)
        }))
        .filter(child => child.photos.length > 0)
        .sort((a, b) => {
          const dateA = new Date(a.event_date || 0)
          const dateB = new Date(b.event_date || 0)
          return dateA - dateB
        })
    }
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        this.loadAllPhotos()
      } else {
        this.allPhotos = []
        this.previewPhoto = null
        this.previewChildProject = null
      }
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    },

    async loadAllPhotos() {
      if (!this.childProjects || this.childProjects.length === 0) {
        return
      }

      this.isLoading = true
      try {
        // 為每個子專案載入災點照片
        const photoPromises = this.childProjects.map(async (childProject) => {
          try {
            const response = await this.$api.get(`/disaster-points/project/${childProject.project_id}`)
            if (response && response.success && response.data) {
              // 提取所有災點的照片
              const disasterPoints = response.data
              const photos = []
              
              disasterPoints.forEach(point => {
                if (point.media_files && Array.isArray(point.media_files)) {
                  point.media_files.forEach(media => {
                    if (media.media_type === 'image' && media.storage_path) {
                      photos.push({
                        ...media,
                        child_project_id: childProject.project_id,
                        disaster_point_id: point.disaster_point_id,
                        disaster_description: point.description
                      })
                    }
                  })
                }
              })
              
              return photos
            }
            return []
          } catch (error) {
            console.error(`載入子專案 ${childProject.project_id} 的照片失敗:`, error)
            return []
          }
        })

        const photosArrays = await Promise.all(photoPromises)
        this.allPhotos = photosArrays.flat()
        
        console.log(`總共載入了 ${this.allPhotos.length} 張照片`)
      } catch (error) {
        console.error('載入照片失敗:', error)
      } finally {
        this.isLoading = false
      }
    },

    getChildProjectPhotos(childProjectId) {
      return this.allPhotos.filter(photo => photo.child_project_id === childProjectId)
    },

    getMediaUrl(media) {
      if (!media || !media.storage_path) {
        return '/placeholder-image.jpg'
      }
      // 使用後端 API 獲取照片 URL
      return `${window.location.origin}/api/media/${media.media_id}`
    },

    handleImageError(event) {
      // 如果已經處理過錯誤，不重複處理
      if (event.target.dataset.errorHandled === 'true') {
        return
      }
      
      event.target.dataset.errorHandled = 'true'
      event.target.src = '/placeholder-image.jpg'
      event.target.alt = '圖片載入失敗'
    },

    openPhotoPreview(photo, childProject) {
      this.previewPhoto = photo
      this.previewChildProject = childProject
    },

    closePhotoPreview() {
      this.previewPhoto = null
      this.previewChildProject = null
    },

    formatEventDate(dateString) {
      if (!dateString) return '未設定日期'
      
      try {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        
        if (hours !== '00' || minutes !== '00') {
          return `${year}/${month}/${day} ${hours}:${minutes}`
        } else {
          return `${year}/${month}/${day}`
        }
      } catch (error) {
        return '日期格式錯誤'
      }
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

/* 自訂滾動條 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128);
}
</style>

