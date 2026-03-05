<template>
  <div v-if="show" class="fixed inset-0 z-[1200] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="w-[900px] max-w-[95vw] h-[85vh] max-h-[700px] mx-auto rounded-2xl shadow-2xl transition-all duration-300 flex flex-col transform"
         :class="[
           isDarkMode 
             ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700' 
             : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200',
           'animate-in fade-in-0 zoom-in-95 duration-300'
         ]">
      
      <!-- 模態框標題 -->
      <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white/50'">
        <div class="flex items-center space-x-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-300"
               :class="isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              關聯資料管理
            </h3>
            <p class="text-sm transition-colors duration-300 mt-1"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              {{ associateTargetData?.file_name || '未命名圖層' }}
            </p>
          </div>
        </div>
        <button @click="closeModal" 
                class="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 hover:scale-105"
                :class="isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- 模態框內容 -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Feature 上傳器列表 -->
        <div class="space-y-6">
          <div v-for="feature in availableFeatures" :key="feature.id" 
               class="rounded-2xl border transition-all duration-300 hover:shadow-lg"
               :class="[
                 isDarkMode 
                   ? (featureUploads[feature.id] && featureUploads[feature.id].length > 0 
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-slate-900/20' 
                      : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700')
                   : (featureUploads[feature.id] && featureUploads[feature.id].length > 0 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-blue-100/50' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200')
               ]">
            
            <!-- Feature 標題（可點擊展開/收縮） -->
            <button @click="toggleFeatureExpanded(feature.id)" 
                    class="w-full flex items-center justify-between p-6 text-left hover:bg-opacity-50 transition-all duration-300 rounded-t-2xl"
                    :class="isDarkMode ? 'hover:bg-slate-600/50' : 'hover:bg-gray-100/50'">
              <div class="flex items-center space-x-3">
                <div class="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-300"
                     :class="isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-lg transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    {{ feature.name }} 上傳區
                  </h4>
                  <p v-if="featureUploads[feature.id] && featureUploads[feature.id].length > 0" 
                     class="text-sm transition-colors duration-300 mt-1"
                     :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    {{ featureUploads[feature.id].length }} 個檔案已上傳
                  </p>
                  <p v-else class="text-sm transition-colors duration-300 mt-1"
                     :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
                    尚未上傳任何檔案
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div v-if="featureUploads[feature.id] && featureUploads[feature.id].length > 0" 
                     class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors duration-300"
                     :class="isDarkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'">
                  {{ featureUploads[feature.id].length }}
                </div>
                <svg class="w-5 h-5 transition-all duration-300"
                     :class="[
                       featureExpanded[feature.id] ? 'rotate-180' : 'rotate-0',
                       isDarkMode ? 'text-gray-400' : 'text-gray-500'
                     ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </button>

            <!-- Feature 內容（可展開/收縮） -->
            <div v-if="featureExpanded[feature.id]" class="px-6 pb-6">
              <!-- Feature 上傳表單 -->
              <form @submit.prevent="handleFeatureUpload(feature)" class="space-y-4">
                <!-- 上傳名稱 -->
                <div>
                  <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    檔案名稱
                  </label>
                  <input
                    v-model="featureUploadForms[feature.id].name"
                    type="text"
                    required
                    class="w-full px-4 py-3 text-sm border rounded-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:bg-slate-600' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-gray-50'"
                    placeholder="請輸入檔案名稱"
                  />
                </div>

                <!-- 上傳描述 -->
                <div>
                  <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    檔案描述
                  </label>
                  <textarea
                    v-model="featureUploadForms[feature.id].description"
                    rows="3"
                    class="w-full px-4 py-3 text-sm border rounded-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    :class="isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:bg-slate-600' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-gray-50'"
                    placeholder="請輸入檔案描述（選填）"
                  ></textarea>
                </div>

                <!-- 檔案選擇 -->
                <div>
                  <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    選擇檔案
                  </label>
                  <div class="relative">
                    <input
                      :ref="`fileInput_${feature.id}`"
                      type="file"
                      @change="handleFeatureFileSelect(feature.id, $event)"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.tiff,.pdf,.txt"
                      class="w-full px-4 py-3 text-sm border rounded-xl transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium"
                      :class="isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white' 
                        : 'bg-white border-gray-300 text-gray-900 file:bg-gray-100 file:text-gray-700'"
                    />
                  </div>
                  <div v-if="featureUploadForms[feature.id].file" class="mt-3 p-3 rounded-lg transition-colors duration-300"
                       :class="isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'">
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span class="text-sm font-medium transition-colors duration-300"
                            :class="isDarkMode ? 'text-green-400' : 'text-green-700'">
                        已選擇: {{ featureUploadForms[feature.id].file.name }}
                      </span>
                      <span class="text-xs transition-colors duration-300"
                            :class="isDarkMode ? 'text-green-500' : 'text-green-600'">
                        ({{ formatFileSize(featureUploadForms[feature.id].file.size) }})
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 上傳按鈕 -->
                <div class="flex justify-end pt-2">
                  <button
                    type="submit"
                    :disabled="!featureUploadForms[feature.id].name || !featureUploadForms[feature.id].file"
                    class="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <span>上傳檔案</span>
                  </button>
                </div>
              </form>

              <!-- 已上傳資料列表 -->
              <div v-if="featureUploads[feature.id] && featureUploads[feature.id].length > 0" class="mt-6 pt-6 border-t transition-colors duration-300"
                   :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
                <div class="flex items-center space-x-2 mb-4">
                  <div class="flex items-center justify-center w-6 h-6 rounded-lg transition-colors duration-300"
                       :class="isDarkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h5 class="text-lg font-semibold transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    已上傳資料
                  </h5>
                  <div class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors duration-300"
                       :class="isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'">
                    {{ featureUploads[feature.id].length }}
                  </div>
                </div>
                <div class="space-y-4">
                  <div v-for="upload in featureUploads[feature.id]" :key="upload.upload_id" 
                       class="rounded-xl border transition-all duration-300 overflow-hidden hover:shadow-lg"
                       :class="isDarkMode 
                         ? 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:border-slate-500' 
                         : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'">
                    
                    <!-- 檔案標題和操作按鈕 -->
                    <div class="flex items-center justify-between p-4 border-b transition-colors duration-300"
                         :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2 mb-1">
                          <div class="flex items-center justify-center w-5 h-5 rounded-md transition-colors duration-300"
                               :class="isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                          <p class="text-sm font-semibold transition-colors duration-300 truncate"
                             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                            {{ upload.upload_name || '未命名' }}
                          </p>
                        </div>
                        <p v-if="upload.upload_description" class="text-xs transition-colors duration-300 truncate mb-2"
                           :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                          {{ upload.upload_description }}
                        </p>
                        <div class="flex items-center space-x-2 text-xs transition-colors duration-300"
                             :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
                          <span class="px-2 py-1 rounded-md transition-colors duration-300"
                                :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-100'">
                            {{ upload.original_name || '未知檔案' }}
                          </span>
                          <span>•</span>
                          <span>{{ formatFileSize(upload.file_size) }}</span>
                        </div>
                      </div>
                      <button @click="deleteFeatureUpload(upload.upload_id, feature.id)" 
                              class="p-2 rounded-lg transition-all duration-300 hover:scale-105 ml-3"
                              :class="isDarkMode 
                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' 
                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'"
                              title="刪除檔案">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>

                    <!-- 檔案內容顯示區域 -->
                    <div class="p-4">
                      <!-- 圖片檔案顯示 -->
                      <div v-if="isImageFile(upload)" class="flex justify-center">
                        <div class="relative group">
                          <img 
                            :src="getFileUrl(upload.storage_path)" 
                            :alt="upload.upload_name || '上傳圖片'"
                            class="max-w-full max-h-64 rounded-xl shadow-lg object-contain transition-transform duration-300 group-hover:scale-105"
                            @error="handleImageError"
                            loading="lazy"
                          />
                          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-300 flex items-center justify-center">
                            <button @click="downloadFile(upload)" 
                                    class="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                              下載
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 其他檔案類型顯示 -->
                      <div v-else class="flex items-center justify-center p-8">
                        <div class="text-center">
                          <div class="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-2xl transition-colors duration-300 group"
                               :class="isDarkMode ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-gray-100 to-gray-200'">
                            <svg class="w-10 h-10 transition-colors duration-300"
                                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                          </div>
                          <p class="text-sm font-semibold transition-colors duration-300 mb-1"
                             :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                            {{ getFileTypeDisplayName(upload) }}
                          </p>
                          <p class="text-xs transition-colors duration-300 mb-4"
                             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                            {{ upload.file_extension ? upload.file_extension.toUpperCase() : 'UNKNOWN' }} 檔案
                          </p>
                          <button @click="downloadFile(upload)" 
                                  class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2 mx-auto">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>下載檔案</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAlert } from '@/composables/useAlert'

export default {
  name: 'FeatureUploadModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    associateTargetData: {
      type: Object,
      default: null
    },
    availableFeatures: {
      type: Array,
      default: () => []
    },
    featureUploads: {
      type: Object,
      default: () => ({})
    },
    featureUploadForms: {
      type: Object,
      default: () => ({})
    },
    featureExpanded: {
      type: Object,
      default: () => ({})
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'feature-upload', 'delete-feature-upload', 'toggle-feature-expanded', 'feature-file-select'],
  setup() {
    const { showAlert } = useAlert()
    return { showAlert }
  },
  methods: {
    closeModal() {
      this.$emit('close')
    },

    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    toggleFeatureExpanded(featureId) {
      this.$emit('toggle-feature-expanded', featureId)
    },

    handleFeatureFileSelect(featureId, event) {
      this.$emit('feature-file-select', featureId, event)
    },

    handleFeatureUpload(feature) {
      this.$emit('feature-upload', feature)
    },

    async deleteFeatureUpload(uploadId, featureId) {
      try {
        const confirmed = await this.showAlert({
          type: 'warning',
          title: '確認刪除',
          message: '確定要刪除此上傳資料嗎？此操作無法復原。',
          showCancelButton: true,
          confirmText: '刪除',
          cancelText: '取消'
        })

        if (confirmed) {
          this.$emit('delete-feature-upload', uploadId, featureId)
        }
      } catch (error) {
        console.error('刪除確認錯誤:', error)
      }
    },

    // 判斷是否為圖片檔案
    isImageFile(upload) {
      if (!upload || !upload.file_extension || !upload.mime_type) {
        return false
      }
      
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp']
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp']
      
      return imageExtensions.includes(upload.file_extension.toLowerCase()) || 
             imageTypes.includes(upload.mime_type)
    },

    // 獲取檔案 URL
    getFileUrl(storagePath) {
      // 檢查 storagePath 是否存在
      if (!storagePath) {
        console.warn('storagePath 為空，無法構建檔案 URL')
        return ''
      }
      
      // 如果 storage_path 已經是完整 URL，直接返回
      if (storagePath.startsWith('http')) {
        return storagePath
      }
      
      // 否則構建完整的 URL
      const baseUrl = 'http://localhost:3001'
      return `${baseUrl}/${storagePath}`
    },

    // 獲取檔案類型顯示名稱
    getFileTypeDisplayName(upload) {
      if (!upload || !upload.file_extension) {
        return '檔案'
      }
      
      const extension = upload.file_extension.toLowerCase()
      const typeMap = {
        '.pdf': 'PDF 文件',
        '.doc': 'Word 文件',
        '.docx': 'Word 文件',
        '.txt': '文字文件',
        '.csv': 'CSV 文件',
        '.xlsx': 'Excel 文件',
        '.xls': 'Excel 文件',
        '.mp4': '影片檔案',
        '.avi': '影片檔案',
        '.mov': '影片檔案',
        '.mp3': '音訊檔案',
        '.wav': '音訊檔案',
        '.zip': '壓縮檔案',
        '.rar': '壓縮檔案'
      }
      
      return typeMap[extension] || '檔案'
    },

    // 處理圖片載入錯誤
    handleImageError(event) {
      console.error('圖片載入失敗:', event.target.src)
      // 可以設置一個預設的錯誤圖片
      event.target.style.display = 'none'
    },

    // 下載檔案
    downloadFile(upload) {
      if (!upload || !upload.storage_path || !upload.original_name) {
        console.warn('下載檔案失敗：缺少必要資訊', upload)
        return
      }
      
      const url = this.getFileUrl(upload.storage_path)
      if (!url) {
        console.warn('下載檔案失敗：無法構建檔案 URL')
        return
      }
      
      const link = document.createElement('a')
      link.href = url
      link.download = upload.original_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>
