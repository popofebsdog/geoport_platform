<template>
  <div class="w-full shadow-lg transition-colors duration-300 flex flex-col h-full border-r"
       :class="isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'">
    
    <!-- 側邊欄內容 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 可滾動的側邊欄內容 -->
      <div class="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
        <!-- 圖層資料區域 -->
        <div class="border-b transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <button @click="toggleExpanded('addData')" 
                class="w-full flex items-center justify-between p-4 text-left transition-all duration-300 rounded-lg mx-2 my-1"
                :class="isDarkMode ? 'bg-blue-900/20 hover:bg-blue-800/30 border-l-4 border-blue-500' : 'bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-blue-500'">
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
              <h3 class="font-semibold text-lg transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                圖層資料
              </h3>
            </div>
            <svg class="w-5 h-5 transition-all duration-300"
                 :class="[
                   expandedAreas.addData ? 'rotate-180' : 'rotate-0',
                   isDarkMode ? 'text-gray-400' : 'text-gray-500'
                 ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        
        <div v-if="expandedAreas.addData" class="px-4 pb-4">
          <!-- 圖層管理標題和上傳按鈕 -->
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              圖層管理
            </h4>
            
            <!-- 上傳資料圖標按鈕 -->
            <button @click="$emit('open-layer-upload')"
                    class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                    :class="isDarkMode 
                      ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' 
                      : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                    title="上傳資料">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </button>
          </div>
          
          <!-- 統一圖層列表 -->
          <div v-if="allLayers.length > 0" class="space-y-2">
            
            <!-- 圖層拖拽容器 -->
            <div class="space-y-2">
              
              <div v-for="(layer, index) in allLayers" :key="layer.id" 
                   draggable="true"
                   @dragstart="handleDragStart($event, layer)"
                   @dragend="handleDragEnd"
                   @dragover="handleDragOver"
                   @dragenter="handleDragEnter($event, layer)"
                   @dragleave="handleDragLeave"
                   @drop="handleDrop($event, layer)"
                   class="p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg cursor-move backdrop-blur-sm relative"
                   :class="[
                     isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300',
                     layer.isGeojson && activeGeojsonLayer === layer.id ? (isDarkMode ? 'ring-2 ring-blue-400/60 shadow-blue-400/20' : 'ring-2 ring-blue-500/60 shadow-blue-500/20') : '',
                     draggedOverLayer && draggedOverLayer.id === layer.id ? (isDarkMode ? 'ring-2 ring-yellow-400/60 bg-slate-600/80' : 'ring-2 ring-yellow-500/60 bg-gray-50') : ''
                   ]">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2">
                    <!-- 拖拽手柄 -->
                    <div class="flex flex-col space-y-0.5 cursor-move opacity-60 hover:opacity-100 transition-opacity duration-200"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-400'"
                         title="拖拽到其他圖層交換位置">
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                      <div class="w-1 h-1 rounded-full bg-current"></div>
                    </div>
                    <h4 class="text-sm font-medium transition-colors duration-300 truncate"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                      {{ layer.name }}
                    </h4>
                  </div>
                </div>
                <div class="flex items-center space-x-0.5 ml-2">
                  <!-- 顯示/隱藏按鈕（所有圖層） -->
                  <button @click="toggleLayerVisibility(layer)" 
                          class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                          :class="getLayerVisibility(layer.id) ? (isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50') : (isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50')"
                          :title="getLayerVisibility(layer.id) ? '隱藏圖層' : '顯示圖層'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="getLayerVisibility(layer.id)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path v-if="getLayerVisibility(layer.id)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    </svg>
                  </button>
                  
                  <!-- 定位按鈕（所有圖層） -->
                  <button @click="$emit('locate-data', layer.data)" 
                          class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                          :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                          title="定位">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </button>
                  
                  <!-- 關聯上傳按鈕（所有圖層） -->
                  <button @click="$emit('associate-data', layer.data)" 
                          class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                          :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                          title="關聯上傳">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </button>
                  
                  <!-- 編輯按鈕（所有圖層） -->
                  <button @click="$emit('edit-data', layer.data)" 
                          class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                          :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                          title="編輯">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  
                  <!-- 刪除按鈕（所有圖層） -->
                  <button @click="$emit('delete-data', layer.data)" 
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
            
            </div> <!-- 圖層拖拽容器結束 -->
          </div>
          
          <!-- 沒有圖層時的提示 -->
          <div v-else class="text-center py-8">
            <div class="text-gray-400 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <p class="text-sm transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              還沒有上傳任何圖層資料
            </p>
            <p class="text-xs mt-1 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
              點擊上方的上傳按鈕開始添加圖層
            </p>
          </div>
        </div>
      </div>
      
      <!-- 時序資料區域 -->
      <div class="border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <button @click="toggleExpanded('externalData')" 
                class="w-full flex items-center justify-between p-4 text-left transition-all duration-300 rounded-lg mx-2 my-1"
                :class="isDarkMode ? 'bg-blue-900/20 hover:bg-blue-800/30 border-l-4 border-blue-500' : 'bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-blue-500'">
          <div class="flex items-center">
            <div class="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
            <h3 class="font-semibold text-lg transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              時序資料
            </h3>
          </div>
          <svg class="w-5 h-5 transition-all duration-300"
               :class="[
                 expandedAreas.externalData ? 'rotate-180' : 'rotate-0',
                 isDarkMode ? 'text-gray-400' : 'text-gray-500'
               ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div v-if="expandedAreas.externalData" class="px-4 pb-4 space-y-3">
          <!-- 上傳資料 -->
          <div class="border rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm"
               :class="isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300'">
            <div class="flex items-center justify-between p-3">
              <h4 class="font-medium transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                時序資料管理
              </h4>
              
              <!-- 上傳圖標按鈕 -->
              <button @click="showTemporalUploadModal = true"
                      class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                      :class="isDarkMode 
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' 
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                      title="上傳時序資料">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </button>
            </div>
            
            <div class="px-3 pb-3">
              <TemporalDataManager
                ref="temporalManager"
                :project-id="projectId"
                @locate="onLocateTemporalData"
                @toggle-visibility="onToggleTemporalDataVisibility"
                @edit="onEditTemporalData"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底圖套疊區域 -->
      <div class="border-b transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <button @click="toggleExpanded('overlayLayers')" 
                class="w-full flex items-center justify-between p-4 text-left transition-all duration-300 rounded-lg mx-2 my-1"
                :class="isDarkMode ? 'bg-blue-900/20 hover:bg-blue-800/30 border-l-4 border-blue-500' : 'bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-blue-500'">
          <div class="flex items-center">
            <div class="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
            <h3 class="font-semibold text-lg transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              底圖套疊
            </h3>
          </div>
          <svg class="w-5 h-5 transition-all duration-300"
               :class="[
                 expandedAreas.overlayLayers ? 'rotate-180' : 'rotate-0',
                 isDarkMode ? 'text-gray-400' : 'text-gray-500'
               ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div v-if="expandedAreas.overlayLayers" class="px-4 pb-4 space-y-3">
          <!-- 正射影像底圖 -->
          <div class="border rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-sm"
               :class="isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300'">
            <div class="flex items-center justify-between p-3">
              <h4 class="font-medium transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                正射影像底圖
              </h4>
              
              <!-- 上傳圖標按鈕 -->
              <button @click="$emit('open-basemap-upload')"
                      class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                      :class="isDarkMode 
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' 
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
                      title="上傳正射影像底圖">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </button>
            </div>
            
            <div class="px-3 pb-3">
              <!-- 底圖選擇器 -->
              <BaseMapSelector
                ref="baseMapSelector"
                :project-id="projectId"
                :is-dark-mode="isDarkMode"
                :current-base-map-id="currentBaseMapId"
                :base-map-service="baseMapService"
                @base-map-selected="onBaseMapSelected"
                @base-map-changed="onBaseMapChanged"
                @base-map-located="onBaseMapLocated"
                @base-map-edited="onBaseMapEdited"
                @base-map-deleted="onBaseMapDeleted"
                @base-map-delete-request="onBaseMapDeleteRequest"
              />
            </div>
          </div>
          
        </div>
      </div>
      </div> <!-- 結束可滾動內容 -->
    </div>

    <!-- 刪除確認對話框 -->
    <CustomAlert
      :show="showDeleteConfirm"
      type="error"
      title="刪除正射影像"
      :message="deleteConfirmMessage"
      confirm-text="刪除"
      cancel-text="取消"
      :show-cancel-button="true"
      :show-close-button="true"
      :close-on-backdrop="true"
      :is-dark-mode="isDarkMode"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    />
    
    <!-- 時序資料上傳模態框 -->
    <TemporalDataUploadModal
      ref="temporalUploadModal"
      :is-visible="showTemporalUploadModal"
      :project-id="projectId"
      @close="showTemporalUploadModal = false"
      @uploaded="handleTemporalDataUploaded"
    />
  </div>
</template>

<script>
import BaseMapSelector from '../basemap/BaseMapSelector.vue'
import TemporalDataManager from '../temporal/TemporalDataManager.vue'
import TemporalDataUploadModal from '../temporal/TemporalDataUploadModal.vue'
import CustomAlert from '../CustomAlert.vue'

export default {
  name: 'ProjectSidebar',
  components: {
    BaseMapSelector,
    TemporalDataManager,
    TemporalDataUploadModal,
    CustomAlert
  },
  props: {
    isDarkMode: {
      type: Boolean,
      default: false
    },
    expandedAreas: {
      type: Object,
      default: () => ({
        addData: true,
        externalData: false,
        overlayLayers: false
      })
    },
    overlayLayersExpanded: {
      type: Object,
      default: () => ({
        ownLayers: true,
        externalLayers: true
      })
    },
    uploadedData: {
      type: Array,
      default: () => []
    },
    layerVisibility: {
      type: Object,
      default: () => ({})
    },
    geojsonLayers: {
      type: Array,
      default: () => []
    },
    activeGeojsonLayer: {
      type: String,
      default: null
    },
    projectId: {
      type: String,
      required: true
    },
    currentBaseMapId: {
      type: String,
      default: ''
    },
    baseMapService: {
      type: Object,
      default: null
    },
    temporalDataList: {
      type: Array,
      default: () => []
    },
    temporalDataVisibility: {
      type: Object,
      default: () => ({})
    },
    activeTemporalDataId: {
      type: String,
      default: null
    },
    temporalDataOrder: {
      type: Array,
      default: () => []
    },
    highwayMileageVisible: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // 合併所有圖層（統一處理所有類型）
    allLayers() {
      const layers = []
      
      
      // 添加所有上傳的資料（包括 GeoJSON 和其他類型）
      this.uploadedData.forEach(data => {
        // 不再過濾 potential_analysis 類型的資料，讓所有類型都能顯示
        
        const isGeojson = data.file_extension === '.geojson' || data.file_extension === '.kml' || data.file_extension === '.tif'
        const layerType = this.getLayerTypeLabel(data.file_type, isGeojson)
        
        layers.push({
          id: data.file_id,
          name: data.file_name,
          type: data.file_type,
          typeLabel: layerType,
          description: data.metadata?.data_description || '',
          isGeojson: isGeojson,
          isProfileObservation: data.file_type === 'profile_observation',
          isPotentialAnalysis: data.file_type === 'potential_analysis' || data.file_type === 'potential_analysis_snapshot',
          data: data
        })
      })
      
      
      // 檢查是否有新圖層需要添加到 layerOrder 中
      const currentLayerIds = layers.map(l => l.id)
      const newLayerIds = currentLayerIds.filter(id => !this.layerOrder.includes(id))
      
      if (newLayerIds.length > 0) {
        // 將新圖層添加到 layerOrder 的開頭（最上面）
        this.layerOrder = [...newLayerIds, ...this.layerOrder]
      }
      
      // 清理 layerOrder 中不存在的圖層
      const validLayerIds = this.layerOrder.filter(id => currentLayerIds.includes(id))
      if (validLayerIds.length !== this.layerOrder.length) {
        this.layerOrder = validLayerIds
      }
      
      // 如果有自定義順序，按照自定義順序排序
      if (this.layerOrder.length > 0) {
        
        const sortedLayers = layers.sort((a, b) => {
          const indexA = this.layerOrder.indexOf(a.id)
          const indexB = this.layerOrder.indexOf(b.id)
          
          // 如果兩個圖層都在自定義順序中，按照自定義順序排序
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB
          }
          // 如果只有一個在自定義順序中，優先顯示
          if (indexA !== -1) return -1
          if (indexB !== -1) return 1
          // 如果都不在自定義順序中，保持原順序
          return 0
        })
        
        return sortedLayers
      }
      
      // 沒有自定義順序時，按照上傳時間倒序排列（最新的在上面）
      // 但如果有新圖層，新圖層應該在最上面
      const sortedLayers = layers.sort((a, b) => {
        // 如果兩個圖層都是新圖層，按照上傳時間倒序
        const aIsNew = newLayerIds.includes(a.id)
        const bIsNew = newLayerIds.includes(b.id)
        
        if (aIsNew && bIsNew) {
          return new Date(b.data.upload_date) - new Date(a.data.upload_date)
        }
        // 新圖層優先
        if (aIsNew) return -1
        if (bIsNew) return 1
        // 舊圖層按照上傳時間倒序
        return new Date(b.data.upload_date) - new Date(a.data.upload_date)
      })
      
      return sortedLayers
    }
  },
  watch: {
    baseMapService: {
      handler(newVal) {
      },
      immediate: true
    },
    layerVisibility: {
      handler(newVal) {
      },
      deep: true,
      immediate: true
    },
    layerOrder: {
      handler(newVal) {
      },
      deep: true,
      immediate: true
    }
  },
  emits: [
    'toggle-expanded',
    'toggle-overlay-layer-expanded',
    'open-layer-upload',
    'open-basemap-upload',
    'open-temporal-upload',
    'open-analysis',
    'locate-data',
    'associate-data',
    'toggle-layer-visibility',
    'edit-data',
    'delete-data',
    'toggle-external-layer',
    'toggle-temporal-layer',
    'switch-geojson-layer',
    'toggle-geojson-layer-visibility',
    'base-map-selected',
    'base-map-changed',
    'base-map-located',
    'base-map-edited',
    'base-map-deleted',
    'base-map-delete-request',
    'toggle-geological-map',
    'layer-order-changed',
    'update-layer-z-index',
    'locate-temporal-data',
    'delete-temporal-data',
    'toggle-temporal-data-visibility',
    'temporal-data-order-changed',
    'show-error'
  ],
  data() {
    return {
      // 拖拽排序相關
      draggedLayer: null,
      draggedOverLayer: null,
      layerOrder: [], // 存儲圖層的自定義順序
      
      // 刪除確認對話框
      showDeleteConfirm: false,
      deleteConfirmMessage: '',
      pendingDeleteBaseMap: null,
      
      // 時序資料上傳
      showTemporalUploadModal: false
    }
  },
  methods: {
    toggleExpanded(area) {
      this.$emit('toggle-expanded', area)
    },
    
    toggleOverlayLayerExpanded(layer) {
      this.$emit('toggle-overlay-layer-expanded', layer)
    },
    
    // 統一的圖層可見性切換
    toggleLayerVisibility(layer) {
      // 所有圖層都使用相同的 ID 和事件
      this.$emit('toggle-geojson-layer-visibility', layer.id)
    },
    
    // 獲取圖層可見性狀態
    getLayerVisibility(layerId) {
      const visibility = this.layerVisibility[layerId]
      // 明確處理 undefined 的情況，默認返回 false（隱藏狀態）
      return visibility === undefined ? false : visibility
    },
    
    
    // 獲取圖層類型標籤（保留用於未來擴展）
    getLayerTypeLabel(fileType, isGeojson) {
      if (isGeojson) {
        switch (fileType) {
          case 'profile_observation':
            return '剖面觀測'
          case 'potential_analysis':
            return '潛勢評估'
          case 'potential_analysis_snapshot':
            return '潛勢評估快照'
          default:
            return 'GeoJSON'
        }
      } else {
        switch (fileType) {
          case 'general':
            return '一般圖層'
          case 'basemap':
            return '底圖'
          default:
            return fileType || '其他'
        }
      }
    },
    
    // 底圖選擇事件處理
    onBaseMapSelected(baseMap) {
      this.$emit('base-map-selected', baseMap)
    },
    
    onBaseMapChanged(baseMap) {
      this.$emit('base-map-changed', baseMap)
    },
    
    onBaseMapLocated(baseMap) {
      this.$emit('base-map-located', baseMap)
    },
    
    onBaseMapEdited(baseMap) {
      this.$emit('base-map-edited', baseMap)
    },
    
    onBaseMapDeleted(baseMap) {
      this.$emit('base-map-deleted', baseMap)
    },
    
    onBaseMapDeleteRequest(baseMap) {
      
      // 設置待刪除的底圖和確認訊息
      this.pendingDeleteBaseMap = baseMap
      this.deleteConfirmMessage = `確定要刪除正射影像「${baseMap.name}」嗎？\n\n此操作無法復原，請謹慎操作。`
      this.showDeleteConfirm = true
    },
    
    // 確認刪除
    async confirmDelete() {
      if (!this.pendingDeleteBaseMap) return
      
      const baseMap = this.pendingDeleteBaseMap
      
      try {
        const response = await fetch(`http://localhost:3001/api/data/${baseMap.id}`, {
          method: 'DELETE'
        })
        
        const result = await response.json()
        
        if (result.success) {
          this.$emit('base-map-deleted', baseMap)
          // 通知 BaseMapSelector 重新載入底圖列表
          if (this.$refs.baseMapSelector) {
            this.$refs.baseMapSelector.loadBaseMaps()
          }
        } else {
          throw new Error(result.message || '刪除失敗')
        }
      } catch (error) {
        console.error('刪除正射影像失敗:', error)
        // 顯示錯誤訊息（通過 emit 傳遞給父組件）
        this.$emit('show-error', {
          type: 'error',
          title: '刪除失敗',
          message: `刪除失敗: ${error.message}`
        })
      } finally {
        // 關閉對話框並清理狀態
        this.showDeleteConfirm = false
        this.pendingDeleteBaseMap = null
        this.deleteConfirmMessage = ''
      }
    },
    
    // 取消刪除
    cancelDelete() {
      this.showDeleteConfirm = false
      this.pendingDeleteBaseMap = null
      this.deleteConfirmMessage = ''
    },
    
    

    // 拖拽排序相關方法
    handleDragStart(event, layer) {
      
      // 如果沒有自定義順序，基於當前視覺順序初始化
      if (this.layerOrder.length === 0) {
        this.layerOrder = this.allLayers.map(layer => layer.id)
      }
      
      this.draggedLayer = layer
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/html', event.target.outerHTML)
      
      // 添加拖拽樣式
      event.target.style.opacity = '0.5'
    },

    handleDragEnd(event) {
      event.target.style.opacity = '1'
      
      // 延遲清除拖拽狀態，給 drop 事件一些時間
      setTimeout(() => {
        this.draggedOverLayer = null
        this.draggedLayer = null
      }, 100)
    },

    handleDragOver(event) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },

    handleDragEnter(event, layer) {
      event.preventDefault()
      if (this.draggedLayer && this.draggedLayer.id !== layer.id) {
        this.draggedOverLayer = layer
      }
    },


    handleDragLeave(event) {
      // 只有當離開整個元素時才清除 draggedOverLayer
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.draggedOverLayer = null
      }
    },

    handleDrop(event, targetLayer) {
      event.preventDefault()
      event.stopPropagation()
      
      
      if (!this.draggedLayer || this.draggedLayer.id === targetLayer.id) {
        return
      }

      // 直接交換兩個圖層的位置
      this.updateLayerOrder(this.draggedLayer, targetLayer)
      
      // 清除拖拽狀態
      this.draggedLayer = null
      this.draggedOverLayer = null
    },



    // 使用插入方式更新圖層順序（支持跳層拖拽）
    updateLayerOrderWithInsertion(draggedLayer, targetLayer, insertAfter) {
      
      // 找到拖拽圖層和目標圖層的索引
      const draggedIndex = this.layerOrder.indexOf(draggedLayer.id)
      const targetIndex = this.layerOrder.indexOf(targetLayer.id)
      

      if (draggedIndex === -1 || targetIndex === -1) {
        return
      }

      
      // 移除拖拽的圖層
      this.layerOrder.splice(draggedIndex, 1)
      
      // 計算新的目標索引（考慮到已經移除了一個元素）
      let newTargetIndex = targetIndex
      if (draggedIndex < targetIndex) {
        newTargetIndex = targetIndex - 1
      }
      
      // 決定插入位置
      if (insertAfter) {
        newTargetIndex += 1
      }
      
      // 插入到新位置
      this.layerOrder.splice(newTargetIndex, 0, draggedLayer.id)
      
      
      // 觸發更新
      this.triggerLayerOrderUpdate()
    },

    updateLayerOrder(draggedLayer, targetLayer) {
      
      // 找到拖拽圖層和目標圖層的索引
      const draggedIndex = this.layerOrder.indexOf(draggedLayer.id)
      const targetIndex = this.layerOrder.indexOf(targetLayer.id)
      

      if (draggedIndex === -1 || targetIndex === -1) {
        return
      }

      // 簡單交換位置
      
      // 交換兩個圖層的位置
      const temp = this.layerOrder[draggedIndex]
      this.layerOrder[draggedIndex] = this.layerOrder[targetIndex]
      this.layerOrder[targetIndex] = temp
      
      
      // 觸發更新
      this.triggerLayerOrderUpdate()
    },

    // 獲取圖層順序描述（用於調試）
    getLayerOrderDescription() {
      const layerNames = this.layerOrder.map(id => {
        const layer = this.allLayers.find(l => l.id === id)
        return layer ? layer.name : `未知圖層(${id})`
      })
      return layerNames.join(' → ')
    },

    // 觸發圖層順序更新
    triggerLayerOrderUpdate() {
      // 強制重新創建 layerOrder 數組以觸發響應式更新
      this.layerOrder = [...this.layerOrder]
      
      // 使用 nextTick 確保響應式更新完成後再強制重新渲染
      this.$nextTick(() => {
        // 強制重新計算 allLayers
        this.$forceUpdate()
        
        // 再次使用 nextTick 確保渲染完成
        this.$nextTick(() => {
          // 保存圖層順序到 localStorage
          this.saveLayerOrder()
          
          // 發送事件通知父組件圖層順序已更改
          this.$emit('layer-order-changed', this.layerOrder)
          
          // 立即更新地圖上的圖層 z-index
          this.$emit('update-layer-z-index', this.layerOrder)
        })
      })
    },

    // 保存圖層順序到 localStorage
    saveLayerOrder() {
      if (this.layerOrder.length > 0) {
        const key = `layerOrder_${this.projectId}`
        localStorage.setItem(key, JSON.stringify(this.layerOrder))
      }
    },

    // 從 localStorage 載入圖層順序
    loadLayerOrder() {
      const key = `layerOrder_${this.projectId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          this.layerOrder = JSON.parse(saved)
        } catch (error) {
          console.error('載入圖層順序失敗:', error)
          this.layerOrder = []
        }
      }
    },

    // 刷新底圖列表（供父組件調用）
    refreshBaseMaps() {
      // 這裡可以觸發 BaseMapSelector 組件重新載入底圖列表
      // 由於 BaseMapSelector 是子組件，我們需要通過事件通知它
      this.$refs.baseMapSelector?.refreshBaseMaps?.()
    },
    
    // 時序資料相關方法
    onToggleTemporalDataVisibility(temporalData) {
      this.$emit('toggle-temporal-data-visibility', temporalData)
    },
    
    onLocateTemporalData(temporalData) {
      this.$emit('locate-temporal-data', temporalData)
    },
    
    onEditTemporalData(temporalData) {
      this.$emit('edit-temporal-data', temporalData)
    },
    
    onDeleteTemporalData(temporalData) {
      this.$emit('delete-temporal-data', temporalData)
    },
    
    onTemporalDataOrderChanged(newOrder) {
      this.$emit('temporal-data-order-changed', newOrder)
    },
    
    // 處理時序資料上傳完成
    async handleTemporalDataUploaded() {
      this.showTemporalUploadModal = false
      // 觸發 TemporalDataManager 重新載入列表
      // 使用 $nextTick 確保 DOM 更新後再執行
      this.$nextTick(() => {
        if (this.$refs.temporalManager && this.$refs.temporalManager.loadTemporalDataList) {
          this.$refs.temporalManager.loadTemporalDataList()
        }
      })
    }
  },
  
  mounted() {
    // 調試：檢查 projectId
    
    // 組件掛載時載入保存的圖層順序
    this.loadLayerOrder()
  }
}
</script>