<template>
  <div class="fixed top-16 left-0 right-0 bottom-0 z-50 transition-colors duration-300 flex flex-col"
       :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'">
    <!-- 專案地圖標題欄 -->
    <ProjectTitleBar 
      :project="project"
      :is-dark-mode="isDarkMode"
      :show-back-to-parent="!isParentProject && project?.parent_project_id"
      @close="$emit('close')"
      @locate-project="locateProject"
      @edit-project="editProject"
      @show-project-info="showProjectInfo"
      @back-to-parent="handleBackToParent"
      @view-photos="handleViewPhotos"
    />
    
    <!-- 主要內容區域 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 上方內容區域 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 側邊欄或時間軸 -->
        <div class="w-96 flex flex-col overflow-hidden">
          <!-- 如果是母專案，顯示時間軸 -->
          <div v-if="isParentProject" class="flex-1 overflow-y-auto overflow-x-visible p-4" style="overflow-x: visible;">
            <ChildProjectTimeline
              :child-projects="childProjects"
              :is-dark-mode="isDarkMode"
              :parent-project="project"
              @open="handleOpenChildProject"
              @locate="handleLocateChildProject"
              @disaster-record="handleDisasterRecord"
              @add-record="handleAddRecord"
              @edit="handleEditChildProject"
              @delete="handleDeleteChildProject"
              @show-detail="handleShowChildDetail"
              @animation-mode="handleAnimationMode"
            />
          </div>
          
          <!-- 如果是子專案，顯示側邊欄 -->
          <div v-else class="flex-1 flex flex-col overflow-hidden">
          <ProjectSidebar
            ref="projectSidebar"
            :is-dark-mode="isDarkMode"
            :expanded-areas="expandedAreas"
            :overlay-layers-expanded="overlayLayersExpanded"
            :uploaded-data="uploadedData"
            :layer-visibility="layerVisibility"
            :geojson-layers="geojsonLayers"
            :active-geojson-layer="activeGeojsonLayer"
            :project-id="project.projectId"
            :current-base-map-id="currentBaseMapId"
            :base-map-service="baseMapService"
            :temporal-data-list="temporalDataList"
            :temporal-data-visibility="temporalDataVisibility"
            :active-temporal-data-id="activeTemporalDataId"
            :temporal-data-order="temporalDataOrder"
            :highway-mileage-visible="highwayMileageVisible"
            @toggle-expanded="toggleExpanded"
            @toggle-overlay-layer-expanded="toggleOverlayLayerExpanded"
            @open-layer-upload="openLayerUpload"
            @open-basemap-upload="openBaseMapUpload"
            @open-temporal-upload="openTemporalUpload"
            @open-analysis="openAnalysis"
            @locate-data="locateData"
            @associate-data="associateData"
            @edit-data="editData"
            @delete-data="deleteData"
            @toggle-external-layer="toggleExternalLayer"
            @toggle-temporal-layer="toggleTemporalLayer"
            @switch-geojson-layer="switchGeoJSONLayer"
            @toggle-geojson-layer-visibility="toggleGeojsonLayerVisibility"
            @base-map-selected="onBaseMapSelected"
            @base-map-changed="onBaseMapChanged"
            @base-map-located="onBaseMapLocated"
            @toggle-geological-map="toggleGeologicalMap"
            @toggle-highway-mileage="toggleHighwayMileage"
            @layer-order-changed="onLayerOrderChanged"
            @update-layer-z-index="onUpdateLayerZIndex"
            @locate-temporal-data="onLocateTemporalData"
            @edit-temporal-data="onEditTemporalData"
            @delete-temporal-data="onDeleteTemporalData"
            @toggle-temporal-data-visibility="onToggleTemporalDataVisibility"
            @temporal-data-order-changed="onTemporalDataOrderChanged"
            @show-error="onShowError"
          />
          </div>
        </div>
        
        <!-- 地圖容器 -->
        <div class="flex-1 relative ml-2">
          <!-- 災點瀏覽專用模態框（固定在地圖右上） -->
          <DisasterPointBrowseModal
            :is-visible="showDisasterPointBrowseModal"
            :disaster-point="selectedDisasterPointForBrowse"
            :order-number="currentBrowseIndex >= 0 ? currentBrowseIndex + 1 : null"
            :is-dark-mode="isDarkMode"
            @close="showDisasterPointBrowseModal = false"
          />
          
          <!-- 新增/編輯/刪除災點紀錄按鈕（僅在子專案顯示，位置在地圖左側上方，切齊地圖左側） -->
          <div v-if="!isParentProject" class="absolute top-4 left-0 z-[1001]">
            <!-- 主按鈕：災點功能 -->
            <button
              @click="toggleDisasterPointButtons"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 mb-2"
              :class="isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white shadow-gray-900/50' 
                : 'bg-gray-600 hover:bg-gray-500 text-white shadow-gray-900/30'"
              :title="isDisasterPointMode ? disasterPointModeText : '災點功能'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span>{{ isDisasterPointMode ? disasterPointModeText : '災點功能' }}</span>
              <svg v-if="!isDisasterPointMode" class="w-4 h-4 transition-transform duration-300" :class="showDisasterPointButtons ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            <!-- 三個模式按鈕（新增/編輯/刪除）直接顯示在地圖上 -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 transform scale-95 translate-y-[-10px]"
              enter-to-class="opacity-100 transform scale-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 transform scale-100 translate-y-0"
              leave-to-class="opacity-0 transform scale-95 translate-y-[-10px]"
            >
              <div v-if="showDisasterPointButtons && !isDisasterPointMode" 
                   class="flex flex-col space-y-2"
                   @click.stop>
                <!-- 新增按鈕（藍色） -->
                <button
                  @click="setDisasterPointMode('add')"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 transform hover:scale-105"
                  :class="disasterPointMode === 'add'
                    ? (isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400 shadow-blue-900/50' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white ring-2 ring-blue-300 shadow-blue-900/30')
                    : (isDarkMode 
                        ? 'bg-blue-600/80 hover:bg-blue-600 text-white/90 shadow-blue-900/30' 
                        : 'bg-blue-500/80 hover:bg-blue-500 text-white/90 shadow-blue-900/20')"
                  title="新增災點紀錄"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  <span>新增災點紀錄</span>
                </button>
                
                <!-- 編輯按鈕（藍色） -->
                <button
                  @click="setDisasterPointMode('edit')"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 transform hover:scale-105"
                  :class="disasterPointMode === 'edit'
                    ? (isDarkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400 shadow-blue-900/50' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white ring-2 ring-blue-300 shadow-blue-900/30')
                    : (isDarkMode 
                        ? 'bg-blue-600/80 hover:bg-blue-600 text-white/90 shadow-blue-900/30' 
                        : 'bg-blue-500/80 hover:bg-blue-500 text-white/90 shadow-blue-900/20')"
                  title="編輯災點紀錄（點擊地圖上的災點標記）"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span>編輯災點紀錄</span>
                </button>
                
                <!-- 瀏覽災點按鈕（綠色） -->
                <button
                  @click="setDisasterPointMode('browse')"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 transform hover:scale-105"
                  :class="disasterPointMode === 'browse'
                    ? (isDarkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-400 shadow-green-900/50' 
                        : 'bg-green-500 hover:bg-green-600 text-white ring-2 ring-green-300 shadow-green-900/30')
                    : (isDarkMode 
                        ? 'bg-green-600/80 hover:bg-green-600 text-white/90 shadow-green-900/30' 
                        : 'bg-green-500/80 hover:bg-green-500 text-white/90 shadow-green-900/20')"
                  title="瀏覽災點功能"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  <span>瀏覽災點功能</span>
                </button>
                
                <!-- 刪除按鈕（紅色） -->
                <button
                  @click="setDisasterPointMode('delete')"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 transform hover:scale-105"
                  :class="disasterPointMode === 'delete'
                    ? (isDarkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400 shadow-red-900/50' 
                        : 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-300 shadow-red-900/30')
                    : (isDarkMode 
                        ? 'bg-red-600/80 hover:bg-red-600 text-white/90 shadow-red-900/30' 
                        : 'bg-red-500/80 hover:bg-red-500 text-white/90 shadow-red-900/20')"
                  title="刪除災點紀錄（點擊地圖上的災點標記）"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>刪除災點紀錄</span>
                </button>
              </div>
            </Transition>
            
            <!-- 取消按鈕（統一在按鈕組下方，僅在災點功能模式顯示） -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 transform scale-95 translate-y-[-10px]"
              enter-to-class="opacity-100 transform scale-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 transform scale-100 translate-y-0"
              leave-to-class="opacity-0 transform scale-95 translate-y-[-10px]"
            >
              <button
                v-if="isDisasterPointMode"
                @click="disableDisasterPointMode"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg flex items-center space-x-2 mt-2"
                :class="isDarkMode
                  ? 'bg-gray-600 hover:bg-gray-700 text-white shadow-gray-900/50'
                  : 'bg-gray-500 hover:bg-gray-600 text-white shadow-gray-900/30'"
                :title="cancelButtonText"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span>{{ cancelButtonText }}</span>
              </button>
            </Transition>
          </div>
          
          <div class="relative w-full h-full">
          <ProjectMap
            ref="projectMap"
            :project="project"
            :is-dark-mode="isDarkMode"
            :geojson-data="geojsonData"
            :feature-uploads="featureUploads"
            :potential-analysis-layer="potentialAnalysisLayer"
            :loaded-geojson-layers="loadedGeojsonLayers"
            :layer-visibility="layerVisibility"
            :current-base-map="currentBaseMap"
            :highway-mileage-visible="highwayMileageVisible"
              :mileage-label-visible="mileageLabelVisible"
              :active-child-project-id="showAnimationBrowseModal ? currentAnimationChild?.project_id : null"
            @map-ready="onMapReady"
            @toggle-highway-mileage="toggleHighwayMileage"
              @toggle-mileage-label="toggleMileageLabel"
            @feature-click="onFeatureClick"
            @map-click="onMapClick"
            @show-loading="onShowLoading"
            @hide-loading="onHideLoading"
            @base-map-service-ready="onBaseMapServiceReady"
          />
            
            <!-- 動畫瀏覽模態框（地圖右上角照片展示） -->
            <DisasterPointBrowseModal
              :is-visible="showAnimationBrowseModal"
              :disaster-points="currentAnimationDisasterPoints"
              :order-number="currentAnimationChildIndex + 1"
              :is-dark-mode="isDarkMode"
              @close="closeAnimationBrowse"
            />
            
            <!-- 動畫瀏覽控制按鈕（地圖上方左側） -->
            <div v-if="showAnimationBrowseModal" class="absolute top-4 left-8 z-[1003] flex items-center space-x-4">
              <!-- 子專案資訊顯示 -->
              <div class="px-6 py-3 rounded-lg backdrop-blur-md bg-white/90 shadow-lg flex items-center space-x-4">
                <!-- 上一個按鈕 -->
                <button @click="previousAnimationChild()"
                        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="上一個時期">
                  <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                
                <!-- 時期信息 -->
                <div class="text-center">
                  <div class="text-sm font-semibold text-gray-900">
                    {{ currentAnimationChild?.name || '載入中...' }}
                  </div>
                  <div class="text-xs text-gray-600">
                    {{ currentAnimationChildIndex + 1 }} / {{ childProjects.length }}
                  </div>
                </div>
                
                <!-- 下一個按鈕 -->
                <button @click="nextAnimationChild()"
                        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="下一個時期">
                  <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                
                <!-- 關閉按鈕 -->
                <button @click="closeAnimationBrowse"
                        class="p-2 rounded-lg hover:bg-red-100 transition-colors"
                        title="關閉">
                  <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 災點紀錄模式提示（地圖置中上方，增加透明度） -->
          <!-- 新增模式提示欄 -->
          <div v-if="isDisasterPointMode && disasterPointInputMode === 'map-click' && !showDisasterPointModal && disasterPointMode === 'add'" 
               class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
               :class="isDarkMode ? 'bg-blue-600/60 text-white' : 'bg-blue-500/60 text-white'">
            <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
            </svg>
            <span class="text-sm font-medium">點擊地圖標記災點位置</span>
          </div>
          
          <!-- 編輯模式提示欄 -->
          <div v-if="disasterPointMode === 'edit' && isDisasterPointMode && !showDisasterPointModal" 
               class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
               :class="isDarkMode ? 'bg-blue-600/60 text-white' : 'bg-blue-500/60 text-white'">
            <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <span class="text-sm font-medium">點擊地圖上的紅色驚嘆號標記進行編輯</span>
          </div>
          
          <!-- 瀏覽災點模式提示欄 -->
          <div v-if="disasterPointMode === 'browse' && isDisasterPointMode" 
               class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-md"
               :class="isDarkMode ? 'bg-slate-800/95 text-white border border-slate-700' : 'bg-white/95 text-gray-800 border border-gray-200'">
            <div class="flex items-center space-x-4">
              <span class="text-sm font-medium">請點擊按鈕瀏覽災情</span>
              <div class="flex items-center space-x-2">
                <!-- 上一步按鈕 -->
                <button
                  @click="handleBrowsePrevious"
                  class="px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200"
                  :class="isDarkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                  title="上一步"
                >
                  <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                  
                </button>
                
                <!-- 下一步按鈕 -->
                <button
                  @click="handleBrowseNext"
                  class="px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200"
                  :class="isDarkMode 
                    ? 'bg-slate-700 text-white hover:bg-slate-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
                  title="下一步"
                >
                  下一步
                  <svg class="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 刪除模式提示欄 -->
          <div v-if="disasterPointMode === 'delete' && isDisasterPointMode" 
               class="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
               :class="isDarkMode ? 'bg-red-600/60 text-white' : 'bg-red-500/60 text-white'">
            <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span class="text-sm font-medium">點擊地圖上的紅色驚嘆號標記進行刪除</span>
          </div>
        </div>
      </div>
      
      <!-- Footer - 延伸到整個寬度 -->
      <Footer :is-dark-mode="isDarkMode" />
    </div>
    
    <!-- 災點地圖聚焦組件 -->
    <DisasterPointMapFocus
      :map="map"
      :markers="disasterPointMarkers"
      :should-focus="shouldFocusDisasterPoints"
    />
    
    <!-- 災點瀏覽組件 -->
    <DisasterPointBrowse
      ref="disasterPointBrowse"
      :map="map"
      :markers="disasterPointMarkers"
      :is-active="disasterPointMode === 'browse' && isDisasterPointMode"
      :is-dark-mode="isDarkMode"
      @show-disaster-point="handleBrowseShowDisasterPoint"
      @update:current-index="currentBrowseIndex = $event"
    />
    
    <!-- 上傳模態框 -->
    <LayerUploadModal
      :show="showUploadModal || showLayerUploadModal"
      :project-id="project?.projectId"
      :is-dark-mode="isDarkMode"
      :editing-data="editingData"
      :is-edit-mode="isEditMode"
      @close="closeUploadModal"
      @upload-success="handleUploadSuccess"
      @color-changed="handleColorChanged"
    />
    
    <BaseMapUploadModal
      :show="showBaseMapUploadModal"
      :project-id="project?.projectId"
      :is-dark-mode="isDarkMode"
      @close="closeBaseMapUploadModal"
      @upload-success="handleUploadSuccess"
    />
    
    <TemporalDataUploadModal
      :is-visible="showTemporalUploadModal"
      :is-dark-mode="isDarkMode"
      :project-id="project?.projectId"
      :editing-data="editingTemporalData"
      @close="closeTemporalUploadModal"
      @upload-success="handleTemporalUploadSuccess"
      @updated="handleTemporalUpdateSuccess"
    />
    
    <!-- 影像紀錄模態框 -->
    <ImageRecordModal
      :is-visible="showImageRecordModal"
      :child-project="selectedChildProjectForImageRecord"
      :is-dark-mode="isDarkMode"
      @close="closeImageRecordModal"
    />
    
    <!-- 新增子專案模態框 -->
    <CreateChildProjectModal
      :is-visible="showCreateChildModal"
      :parent-project="selectedParentProjectForChild"
      :is-dark-mode="isDarkMode"
      @close="showCreateChildModal = false; selectedParentProjectForChild = null"
      @created="handleChildCreated"
    />
    
    <!-- 編輯子專案模態框 -->
    <EditChildProjectModal
      :is-visible="showEditChildModal"
      :child-project="selectedChildProjectForEdit"
      :parent-project="project"
      @close="showEditChildModal = false; selectedChildProjectForEdit = null"
      @updated="handleChildUpdated"
    />
    
    <!-- 編輯母專案模態框 -->
    <EditParentProjectModal
      :is-visible="showEditParentModal"
      :parent-project="project"
      @close="showEditParentModal = false"
      @updated="handleParentUpdated"
    />
    
    <!-- 事件詳情模態框 -->
    <ChildProjectDetailModal
      :is-visible="showChildDetailModal"
      :child-project="selectedChildProjectForDetail"
      :is-dark-mode="isDarkMode"
      @close="showChildDetailModal = false; selectedChildProjectForDetail = null"
    />
    
    <!-- 母專案照片瀏覽模態框 -->
    <ParentProjectPhotoGalleryModal
      :is-visible="showPhotoGalleryModal"
      :parent-project="project"
      :child-projects="childProjects"
      :is-dark-mode="isDarkMode"
      @close="showPhotoGalleryModal = false"
    />
    
    <!-- 災點紀錄模式選擇模態框 -->
    <DisasterPointModeSelectModal
      :is-visible="showDisasterPointModeSelect"
      :is-dark-mode="isDarkMode"
      @close="showDisasterPointModeSelect = false"
      @select-map-click="handleSelectMapClick"
      @select-manual-input="handleSelectManualInput"
    />
    
    <!-- 災點紀錄模態框（新增/編輯） -->
    <DisasterPointModal
      :is-visible="showDisasterPointModal"
      :location="selectedMapLocation"
      :project="project"
      :is-dark-mode="isDarkMode"
      :is-edit-mode="disasterPointMode === 'edit'"
      :editing-disaster-point="selectedDisasterPointForEdit"
      @close="handleDisasterPointModalClose"
      @created="handleDisasterPointCreated"
      @updated="handleDisasterPointUpdated"
    />
    
    <!-- 災點詳情模態框 -->
      <DisasterPointViewModal
        :is-visible="showDisasterPointViewModal"
        :disaster-point="selectedDisasterPointForView"
        :is-dark-mode="isDarkMode"
        @close="showDisasterPointViewModal = false; selectedDisasterPointForView = null"
        @media-deleted="handleMediaDeleted"
      />
    
    <!-- 自定義提示框 -->
    <CustomAlert
      :show="showAlert"
      :type="alertType"
      :title="alertTitle"
      :message="alertMessage"
      :is-dark-mode="isDarkMode"
      :show-cancel-button="alertType === 'warning' && deleteDisasterPointPending !== null"
      confirm-text="確定"
      cancel-text="取消"
      @confirm="handleAlertConfirm"
      @cancel="handleAlertCancel"
      @close="handleAlertClose"
    />
    
    <!-- 專案資訊模態框 -->
    <ProjectInfoModal
      :is-visible="showProjectInfoModal"
      :is-dark-mode="isDarkMode"
      :project="project"
      @close="closeProjectInfoModal"
    />
    
    <!-- 時序圖表模態框 -->
    <div v-if="showTemporalChartModal" class="fixed inset-0 z-[1200] flex items-center justify-center bg-black bg-opacity-50">
      <div class="rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
        <!-- 模態框標題 -->
        <div class="flex items-center justify-between p-4 border-b transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <h3 class="text-lg font-semibold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ temporalChartData?.temporalData?.name }}
          </h3>
          <button @click="closeTemporalChartModal"
                  class="p-2 rounded-lg transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 圖表內容 -->
        <div class="p-6 overflow-auto flex-1 min-h-0">
          <div v-if="temporalChartData" class="space-y-4">
            <!-- 基本信息 -->
            <div class="flex items-center gap-2 text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ Number(temporalChartData.temporalData.longitude).toFixed(6) }}, 
                {{ Number(temporalChartData.temporalData.latitude).toFixed(6) }}
              </span>
            </div>
            
            <!-- 圖表區域 -->
            <div class="rounded-lg border p-4 transition-colors duration-300"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'">
              <apexchart 
                v-if="apexChartOptions && apexChartSeries"
                :type="apexChartOptions.chart.type"
                height="400"
                :options="apexChartOptions"
                :series="apexChartSeries"
              />
              <div v-else class="text-center py-8">
                <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">載入圖表中...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <FeatureUploadModal
      :show="!!associateTargetData"
      :associate-target-data="associateTargetData"
      :available-features="availableFeatures"
      :feature-uploads="featureUploads"
      :feature-upload-forms="featureUploadForms"
      :feature-expanded="featureExpanded"
      :is-dark-mode="isDarkMode"
      @close="closeAssociateModal"
      @feature-upload="handleFeatureUpload"
      @delete-feature-upload="deleteFeatureUpload"
      @toggle-feature-expanded="toggleFeatureExpanded"
      @feature-file-select="handleFeatureFileSelect"
    />
    
    <!-- 潛勢評估分析模態框 -->
    <div v-if="showAnalysisModal" class="fixed inset-0 z-[1200] bg-black bg-opacity-50 flex items-center justify-center">
      <div class="w-[800px] max-w-[90vw] h-[80vh] max-h-[600px] mx-4 rounded-lg shadow-2xl transition-colors duration-300 flex flex-col"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
        <!-- 模態框標題 -->
        <div class="flex items-center justify-between p-6 border-b transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <h3 class="text-lg font-semibold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            潛勢評估分析設定
          </h3>
          <button @click="closeAnalysisModal" 
                  class="flex items-center justify-center w-8 h-8 transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 模態框內容 -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- 數值欄位選擇 -->
          <div v-if="getNumericFields().length > 0" class="mb-6">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              數值欄位選擇
            </label>
            <select v-model="analysisConfig.valueField"
                    class="w-full px-3 py-2 border rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'">
              <option value="">請選擇數值欄位</option>
              <option v-for="field in getNumericFields()" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
          </div>

          <!-- 區間設定 -->
          <div v-if="analysisConfig.valueField" class="mb-6">
            <h4 class="text-lg font-medium mb-4 transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              區間設定
            </h4>
            <div class="space-y-4">
              <div v-for="(interval, index) in analysisConfig.intervals" :key="index" 
                   class="flex items-center space-x-4 p-4 border rounded-lg transition-colors duration-300"
                   :class="isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-50'">
                <div class="flex-1">
                  <label class="block text-sm font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    區間 {{ index + 1 }}
                  </label>
                  <div class="flex space-x-2">
                    <input v-model.number="interval.min" type="number" step="0.1" 
                           class="w-20 px-2 py-1 text-sm border rounded transition-colors duration-300"
                           :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
                           placeholder="最小值">
                    <span class="flex items-center text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">~</span>
                    <input v-model.number="interval.max" type="number" step="0.1" 
                           class="w-20 px-2 py-1 text-sm border rounded transition-colors duration-300"
                           :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
                           placeholder="最大值">
                  </div>
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    標籤
                  </label>
                  <input v-model="interval.label" type="text" 
                         class="w-full px-2 py-1 text-sm border rounded transition-colors duration-300"
                         :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300 text-gray-900'"
                         placeholder="區間標籤">
                </div>
                <div class="flex items-center space-x-2">
                  <label class="block text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    顏色
                  </label>
                  <input v-model="interval.color" type="color" 
                         class="w-12 h-8 border rounded cursor-pointer">
                </div>
              </div>
            </div>
          </div>

          <!-- 顏色預覽 -->
          <div v-if="analysisConfig.valueField" class="mb-6">
            <h4 class="text-lg font-medium mb-4 transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              顏色預覽
            </h4>
            <div class="flex space-x-2">
              <div v-for="(interval, index) in analysisConfig.intervals" :key="index" 
                   class="flex-1 h-8 rounded border-2 border-gray-300"
                   :style="{ backgroundColor: interval.color }"
                   :title="`${interval.label}: ${interval.min} - ${interval.max}`">
              </div>
            </div>
          </div>
        </div>

        <!-- 模態框底部 -->
        <div class="flex items-center justify-end space-x-4 p-6 border-t transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <button @click="closeAnalysisModal" 
                  class="px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg"
                  :class="isDarkMode ? 'text-gray-300 hover:text-white hover:bg-slate-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'">
            取消
          </button>
          <button @click="applyAnalysis" 
                  :disabled="!analysisConfig.valueField"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
            應用分析
          </button>
        </div>
      </div>
    </div>
    
    <!-- 關聯上傳資料顯示模態框 -->
    <div v-if="showFeatureDisplayModal" class="fixed inset-0 z-[1300] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-[95vw] max-w-5xl h-[90vh] max-h-[800px] mx-auto rounded-2xl shadow-2xl transition-all duration-300 flex flex-col transform overflow-hidden"
           :class="[
             isDarkMode 
               ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700' 
               : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200',
             'animate-in fade-in-0 zoom-in-95 duration-300'
           ]">
        
        <!-- 模態框標題 -->
        <div class="flex items-center justify-between p-6 border-b transition-colors duration-300 rounded-t-2xl"
             :class="isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-gray-300 bg-gray-100'">
          <div class="flex items-center space-x-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-300"
                 :class="isDarkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                關聯資料檢視
              </h3>
              <p class="text-sm transition-colors duration-300 mt-1"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                Feature ID: {{ featureDisplayData?.feature?.properties?.Id || featureDisplayData?.featureId }}
              </p>
            </div>
          </div>
          <button @click="closeFeatureDisplayModal" 
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
        <div class="flex-1 p-6 rounded-b-2xl overflow-y-auto"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
          
          <!-- 標籤頁導航 -->
          <div class="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1"
               :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'">
            <button @click="activeTab = 'view'"
                    class="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-300"
                    :class="activeTab === 'view' 
                      ? (isDarkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span>檢視資料</span>
                <span v-if="imageUploads.length > 0" 
                      class="px-2 py-0.5 text-xs rounded-full"
                      :class="isDarkMode ? 'bg-slate-500 text-white' : 'bg-gray-200 text-gray-700'">
                  {{ imageUploads.length }}
                </span>
              </div>
            </button>
            <button @click="activeTab = 'upload'"
                    class="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-300"
                    :class="activeTab === 'upload' 
                      ? (isDarkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                      : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')">
              <div class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <span>上傳資料</span>
              </div>
            </button>
          </div>

          <!-- 檢視資料標籤頁 -->
          <div v-if="activeTab === 'view'" class="space-y-6">
          <!-- 只顯示圖片檔案 -->
          <div v-if="imageUploads.length > 0" class="flex flex-col items-center space-y-8">
            <!-- 主圖片和標題描述區域 -->
            <div class="flex items-start space-x-6">
              <!-- 主圖片顯示區域 -->
              <div class="relative group">
                <div class="w-[600px] h-[400px] flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300"
                     :class="isDarkMode ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-gray-200'">
                  <img 
                    :src="getFileUrl(imageUploads[currentImageIndex].storage_path)" 
                    :alt="imageUploads[currentImageIndex].upload_name"
                    class="max-w-full max-h-full object-contain rounded-xl transition-all duration-300 group-hover:scale-105"
                    @error="handleImageError"
                    loading="lazy"
                  />
                </div>
              </div>
              
              <!-- 圖片標題和描述區域 -->
              <div class="w-[300px] h-[400px] p-6 rounded-2xl transition-colors duration-300 flex flex-col"
                   :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'">
                <!-- 標題區域 -->
                <div class="text-center mb-6">
                  <h4 class="text-xl font-bold transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    {{ imageUploads[currentImageIndex].upload_name || '未命名' }}
                  </h4>
                </div>
                
                <!-- 描述區域 -->
                <div class="flex-1 flex items-start justify-center">
                  <div class="text-center">
                    <p v-if="imageUploads[currentImageIndex].upload_description" 
                       class="text-sm transition-colors duration-300 leading-relaxed"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
                      {{ imageUploads[currentImageIndex].upload_description }}
                    </p>
                    <div v-else class="text-sm transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
                      無描述
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 幻燈片控制區 -->
            <div class="flex flex-col items-center space-y-4">
              <!-- 小圖預覽 -->
              <div class="flex space-x-3 max-w-96 overflow-x-auto py-2">
                <button v-for="(upload, index) in imageUploads" 
                        :key="upload.upload_id"
                        @click="currentImageIndex = index"
                        class="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
                        :class="index === currentImageIndex 
                          ? 'ring-2 ring-blue-500 shadow-lg scale-110' 
                          : 'opacity-70 hover:opacity-100 shadow-md'">
                  <img 
                    :src="getFileUrl(upload.storage_path)" 
                    :alt="upload.upload_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                    loading="lazy"
                  />
                </button>
              </div>
              
              <!-- 控制按鈕和計數器 -->
              <div class="flex items-center justify-center space-x-6">
                <!-- 左箭頭 -->
                <button @click="previousImage" 
                        :disabled="imageUploads.length <= 1"
                        class="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                        :class="isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                
                <!-- 圖片計數器 -->
                <div class="flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors duration-300"
                     :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'">
                  <svg class="w-4 h-4 transition-colors duration-300"
                       :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="text-sm font-medium transition-colors duration-300"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    {{ currentImageIndex + 1 }} / {{ imageUploads.length }}
                  </span>
                </div>
                
                <!-- 右箭頭 -->
                <button @click="nextImage" 
                        :disabled="imageUploads.length <= 1"
                        class="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                        :class="isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>
              
              <!-- 總數資訊 -->
              <div class="text-xs transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                共 {{ imageUploads.length }} 張圖片
              </div>
            </div>
          </div>
          
          <!-- 如果沒有圖片檔案，顯示提示 -->
          <div v-else class="flex flex-col items-center justify-center h-64 space-y-4">
            <div class="flex items-center justify-center w-20 h-20 rounded-2xl transition-colors duration-300"
                 :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-200'">
              <svg class="w-10 h-10 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="text-center">
              <p class="text-lg font-medium transition-colors duration-300"
                 :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                此 Feature 沒有關聯的圖片資料
              </p>
              <p class="text-sm transition-colors duration-300 mt-1"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  切換到「上傳資料」標籤頁來上傳相關圖片
              </p>
            </div>
          </div>
        </div>

          <!-- 上傳資料標籤頁 -->
          <div v-if="activeTab === 'upload'" class="space-y-6">
            <!-- 上傳表單 -->
            <div class="bg-white rounded-2xl border p-6 shadow-sm"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'">
              <div class="mb-6">
                <h4 class="text-lg font-semibold transition-colors duration-300"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  上傳關聯資料
                </h4>
                <p class="text-sm transition-colors duration-300 mt-1"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  為 Feature ID: {{ featureDisplayData?.feature?.properties?.Id || featureDisplayData?.featureId }} 上傳相關圖片
                </p>
      </div>

              <form @submit.prevent="handleFeatureUpload" class="space-y-4">
                <!-- 檔案上傳區域 -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    選擇圖片檔案
                  </label>
                  <div class="relative">
                    <input 
                      ref="fileInput"
                      type="file" 
                      multiple 
                      accept="image/*"
                      @change="handleFileSelect"
                      class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:transition-all file:duration-300 file:cursor-pointer"
                      :class="isDarkMode 
                        ? 'file:bg-slate-600 file:text-white file:hover:bg-slate-500 bg-slate-800 border-slate-600 text-gray-300' 
                        : 'file:bg-blue-50 file:text-blue-700 file:hover:bg-blue-100 bg-white border-gray-300 text-gray-900'"
                    />
                  </div>
                  <p class="text-xs transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
                    支援 JPG、PNG、GIF 格式，可一次選擇多個檔案
                  </p>
                </div>

                <!-- 上傳名稱 -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    上傳名稱
                  </label>
                  <input 
                    v-model="uploadForm.upload_name"
                    type="text" 
                    placeholder="請輸入上傳名稱"
                    class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                    required
                  />
                </div>

                <!-- 上傳描述 -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                    上傳描述
                  </label>
                  <textarea 
                    v-model="uploadForm.upload_description"
                    rows="3"
                    placeholder="請輸入上傳描述（選填）"
                    class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    :class="isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  ></textarea>
                </div>

                <!-- 上傳按鈕 -->
                <div class="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    @click="resetUploadForm"
                    class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                    :class="isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-slate-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
                  >
                    重置
                  </button>
                  <button 
                    type="submit"
                    :disabled="!selectedFiles.length || !uploadForm.upload_name || isUploading"
                    class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-all duration-300 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="isDarkMode ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-white'"
                  >
                    <span v-if="isUploading" class="flex items-center space-x-2">
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>上傳中...</span>
                    </span>
                    <span v-else>上傳資料</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- 上傳進度 -->
            <div v-if="isUploading" class="bg-white rounded-2xl border p-6 shadow-sm"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-lg font-semibold transition-colors duration-300"
                      :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                    上傳進度
                  </h4>
                  <span class="text-sm transition-colors duration-300"
                        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    {{ uploadProgress.current }} / {{ uploadProgress.total }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2"
                     :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-200'">
                  <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                       :style="{ width: uploadProgress.percentage + '%' }"></div>
                </div>
                <p class="text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  {{ uploadProgress.message }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import VueApexCharts from 'vue3-apexcharts'
import ProjectTitleBar from '@/components/project/ProjectTitleBar.vue'
import ProjectMap from '@/components/project/ProjectMap.vue'
import ProjectSidebar from '@/components/project/ProjectSidebar.vue'
import ProjectInfoModal from '@/components/project/ProjectInfoModal.vue'
import ChildProjectTimeline from '@/components/project/ChildProjectTimeline.vue'
import LayerUploadModal from '@/components/uploads/LayerUploadModal.vue'
import FeatureUploadModal from '@/components/uploads/FeatureUploadModal.vue'
import BaseMapUploadModal from '@/components/uploads/BaseMapUploadModal.vue'
import TemporalDataUploadModal from '@/components/temporal/TemporalDataUploadModal.vue'
import ImageRecordModal from '@/components/project/ImageRecordModal.vue'
import CreateChildProjectModal from '@/components/project/CreateChildProjectModal.vue'
import EditChildProjectModal from '@/components/project/EditChildProjectModal.vue'
import EditParentProjectModal from '@/components/project/EditParentProjectModal.vue'
import ChildProjectDetailModal from '@/components/project/ChildProjectDetailModal.vue'
import ParentProjectPhotoGalleryModal from '@/components/project/ParentProjectPhotoGalleryModal.vue'
import DisasterPointModal from '@/components/project/DisasterPointModal.vue'
import DisasterPointModeSelectModal from '@/components/project/DisasterPointModeSelectModal.vue'
import DisasterPointViewModal from '@/components/project/DisasterPointViewModal.vue'
import DisasterPointMapFocus from '@/components/project/DisasterPointMapFocus.vue'
import DisasterPointBrowse from '@/components/project/DisasterPointBrowse.vue'
import DisasterPointBrowseModal from '@/components/project/DisasterPointBrowseModal.vue'
import TemporalChart from '@/components/charts/TemporalChart.vue'
import Footer from '@/components/Footer.vue'
import CustomAlert from '@/components/CustomAlert.vue'
import { useAlert } from '@/composables/useAlert'

export default {
  name: 'ProjectDetail',
  components: {
    ProjectTitleBar,
    ProjectMap,
    ProjectSidebar,
    ProjectInfoModal,
    ChildProjectTimeline,
    LayerUploadModal,
    FeatureUploadModal,
    BaseMapUploadModal,
    TemporalDataUploadModal,
    ImageRecordModal,
    CreateChildProjectModal,
    EditChildProjectModal,
    EditParentProjectModal,
    ChildProjectDetailModal,
    ParentProjectPhotoGalleryModal,
    DisasterPointModal,
    DisasterPointModeSelectModal,
    DisasterPointViewModal,
    DisasterPointMapFocus,
    DisasterPointBrowse,
    DisasterPointBrowseModal,
    TemporalChart,
    Footer,
    CustomAlert,
    apexchart: VueApexCharts
  },
  props: {
    project: {
      type: Object,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    layerVisibility: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'update-layer-visibility', 'edit-project', 'switch-project'],
  setup(props) {
    const { showAlert } = useAlert()
    
    // 調試：檢查 project 對象
    console.log('ProjectDetail project:', props.project)
    console.log('ProjectDetail project.projectId:', props.project?.projectId)
    
    return { showAlert }
  },
  computed: {
    // 當前動畫瀏覽的子專案
    currentAnimationChild() {
      if (!this.childProjects || this.childProjects.length === 0) {
        return null
      }
      if (this.currentAnimationChildIndex < 0 || this.currentAnimationChildIndex >= this.childProjects.length) {
        return null
      }
      return this.childProjects[this.currentAnimationChildIndex]
    },
    
    // 當前子專案的所有災點（用於顯示所有照片）
    currentAnimationDisasterPoints() {
      console.log('===== [currentAnimationDisasterPoints] 開始計算 =====')
      console.log('[currentAnimationDisasterPoints] showAnimationBrowseModal:', this.showAnimationBrowseModal)
      console.log('[currentAnimationDisasterPoints] currentAnimationChildIndex:', this.currentAnimationChildIndex)
      console.log('[currentAnimationDisasterPoints] childProjects 總數:', this.childProjects?.length)
      
      if (!this.currentAnimationChild) {
        console.log('[currentAnimationDisasterPoints] ❌ 沒有當前子專案')
        return []
      }
      
      const childId = this.currentAnimationChild.project_id
      const disasterPoints = this.allChildProjectsDisasterPoints[childId]
      
      console.log('[currentAnimationDisasterPoints] ✅ 子專案名稱:', this.currentAnimationChild.name)
      console.log('[currentAnimationDisasterPoints] ✅ 子專案ID:', childId)
      console.log('[currentAnimationDisasterPoints] 所有災點數據鍵:', Object.keys(this.allChildProjectsDisasterPoints))
      console.log('[currentAnimationDisasterPoints] 該子專案的災點數據:', disasterPoints)
      
      if (!disasterPoints || disasterPoints.length === 0) {
        console.log('[currentAnimationDisasterPoints] ❌ 沒有災點數據或數組為空')
        return []
      }
      
      console.log('[currentAnimationDisasterPoints] ✅ 災點數量:', disasterPoints.length)
      
      // 詳細記錄每個災點的媒體文件信息
      disasterPoints.forEach((dp, idx) => {
        console.log(`[currentAnimationDisasterPoints] 災點 ${idx + 1}:`, {
          disaster_point_id: dp.disaster_point_id,
          description: dp.description,
          has_media_files: !!dp.media_files,
          media_files_is_array: Array.isArray(dp.media_files),
          media_count: dp.media_files?.length || 0,
          media_files: dp.media_files
        })
        
        if (dp.media_files && Array.isArray(dp.media_files)) {
          dp.media_files.forEach((media, mediaIdx) => {
            console.log(`  媒體 ${mediaIdx + 1}:`, {
              media_id: media.media_id,
              original_name: media.original_name,
              media_type: media.media_type,
              storage_path: media.storage_path,
              has_storage_path: !!media.storage_path
            })
          })
        }
      })
      
      console.log('[currentAnimationDisasterPoints] ✅ 返回所有災點:', disasterPoints.length)
      console.log('===== [currentAnimationDisasterPoints] 計算完成 =====')
      
      // 返回所有災點數組
      return disasterPoints || []
    },
    
    // 災點功能模式顯示文字
    disasterPointModeText() {
      if (!this.disasterPointMode) return '災點功能'
      const modeMap = {
        'add': '選擇功能：新增',
        'edit': '選擇功能：編輯',
        'browse': '選擇功能：瀏覽',
        'delete': '選擇功能：刪除'
      }
      return modeMap[this.disasterPointMode] || '災點功能'
    },
    
    // 取消按鈕文字
    cancelButtonText() {
      if (!this.disasterPointMode) return '取消'
      const cancelMap = {
        'add': '取消新增',
        'edit': '取消編輯',
        'browse': '取消瀏覽',
        'delete': '取消刪除'
      }
      return cancelMap[this.disasterPointMode] || '取消'
    },
    
    // 計算圖片上傳數據 - 統一使用 featureUploads 作為數據源
    imageUploads() {
      if (!this.featureDisplayData?.featureId) return []
      
      // 優先使用 featureUploads 中的數據，確保與側邊欄同步
      const uploads = this.featureUploads[this.featureDisplayData.featureId] || this.featureDisplayData.uploads || []
      console.log('imageUploads 計算:', {
        featureId: this.featureDisplayData.featureId,
        featureUploadsLength: this.featureUploads[this.featureDisplayData.featureId]?.length || 0,
        displayDataLength: this.featureDisplayData.uploads?.length || 0,
        finalLength: uploads.length
      })
      
      return uploads.filter(upload => this.isImageFile(upload))
    },
    
    // 獲取底圖服務
    baseMapService() {
      const service = this.$refs.projectMap?.baseMapService || null
      console.log('baseMapService 計算屬性被調用:', !!service)
      console.log('this.$refs.projectMap:', !!this.$refs.projectMap)
      if (this.$refs.projectMap) {
        console.log('this.$refs.projectMap.baseMapService:', !!this.$refs.projectMap.baseMapService)
        console.log('baseMapService 類型:', typeof this.$refs.projectMap.baseMapService)
      }
      return service
    },
    
    // 專案時間範圍
    projectTimeRange() {
      if (!this.project) return { start: null, end: null }
      return {
        start: this.project.start_date || null,
        end: this.project.end_date || null
      }
    },
    
    // 判斷是否是母專案
    isParentProject() {
      // 明確判斷：is_parent 為 true 才是母專案
      // 或者 parent_project_id 為 null/undefined 且 is_parent 不是 false
      const isParent = this.project?.is_parent === true
      const hasParentId = this.project?.parent_project_id !== null && 
                          this.project?.parent_project_id !== undefined &&
                          this.project?.parent_project_id !== ''
      
      // 如果有 parent_project_id，一定是子專案（優先判斷）
      if (hasParentId) {
        console.log('isParentProject 計算: 有 parent_project_id，判斷為子專案', {
          is_parent: this.project?.is_parent,
          parent_project_id: this.project?.parent_project_id,
          result: false,
          projectId: this.project?.projectId
        })
        return false
      }
      
      // 如果 is_parent 明確為 false，也是子專案
      if (this.project?.is_parent === false) {
        console.log('isParentProject 計算: is_parent 為 false，判斷為子專案', {
          is_parent: this.project?.is_parent,
          parent_project_id: this.project?.parent_project_id,
          result: false,
          projectId: this.project?.projectId
        })
        return false
      }
      
      console.log('isParentProject 計算:', {
        is_parent: this.project?.is_parent,
        parent_project_id: this.project?.parent_project_id,
        hasParentId,
        result: isParent,
        projectId: this.project?.projectId
      })
      return isParent
    }
  },
  data() {
    return {
      // 地圖相關
      map: null,
      temporalLocationMarker: null, // 時序資料定位標記
      
      // 母子專案相關
      childProjects: [], // 子專案列表
      
      // 省道里程樁號圖層
      highwayMileageVisible: true, // 省道里程樁號圖層可見性（默認開啟以常駐顯示）
      mileageLabelVisible: false, // 里程樁號標籤可見性
      mileagePointsLayer: null, // 里程樁號圖層
      
      // 側邊欄狀態
      expandedAreas: {
        addData: true,
        externalData: false,
        overlayLayers: false
      },
      overlayLayersExpanded: {
        ownLayers: true,
        externalLayers: true
      },
      
      // 上傳模態框狀態
      showUploadModal: false,
      showBaseMapUploadModal: false,
      showLayerUploadModal: false,
      showTemporalUploadModal: false,
      showTemporalChartModal: false,
      showProjectInfoModal: false,
      showImageRecordModal: false,
      selectedChildProjectForImageRecord: null,
      showCreateChildModal: false,
      selectedParentProjectForChild: null,
      showEditChildModal: false,
      selectedChildProjectForEdit: null,
      showEditParentModal: false,
      showChildDetailModal: false,
      selectedChildProjectForDetail: null,
      showPhotoGalleryModal: false, // 顯示照片瀏覽模態框
      showAnimationBrowseModal: false, // 顯示動畫瀏覽模態框
      currentAnimationChildIndex: 0, // 當前動畫瀏覽的子專案索引
      allChildProjectsDisasterPoints: {}, // 所有子專案的災點數據 { childProjectId: [disasterPoints] }
      animationTimer: null, // 動畫自動播放定時器
      showDisasterPointModal: false,
      showDisasterPointModeSelect: false, // 顯示模式選擇模態框
      selectedMapLocation: null,
      disasterPointMarkers: [], // 災點紀錄標記陣列
      isDisasterPointMode: false, // 是否處於災點紀錄模式
      disasterPointInputMode: null, // 'map-click' 或 'manual-input'
      showDisasterPointViewModal: false, // 顯示災點詳情模態框
      selectedDisasterPointForView: null, // 選中查看的災點
      showDisasterPointBrowseModal: false, // 顯示瀏覽專用模態框
      selectedDisasterPointForBrowse: null, // 選中瀏覽的災點
      disasterPointMode: null, // 災點模式：'add' | 'edit' | 'browse' | 'delete' | null
      currentBrowseIndex: -1, // 當前瀏覽的災點索引
      shouldFocusDisasterPoints: false, // 是否應該聚焦到災點區域
      selectedDisasterPointForEdit: null, // 選中編輯的災點
      deleteDisasterPointPending: null, // 待刪除的災點
      showDisasterPointButtons: false, // 是否顯示災點按鈕組
      showAlert: false, // 顯示自定義提示框
      alertType: 'info', // 提示類型：success, warning, error, info
      alertTitle: '提示', // 提示標題
      alertMessage: '', // 提示內容
      temporalChartData: null,
      apexChartOptions: null,
      apexChartSeries: null,
      
      // 編輯模式相關
      editingData: null,
      isEditMode: false,
      editingTemporalData: null, // 編輯中的時序資料
      
      // 時序資料相關
      temporalDataList: [],
      temporalDataVisibility: {},
      activeTemporalDataId: null,
      temporalDataOrder: [],
      temporalDataMarkers: [], // 時序資料地圖標記
      temporalLocationMarker: null, // 臨時定位標記
      
      // 資料相關
      geojsonData: null,
      geojsonLayers: [], // 所有可用的 GeoJSON 圖層
      activeGeojsonLayer: null, // 當前激活的圖層
      loadedGeojsonLayers: {}, // 已載入的 GeoJSON 圖層數據
      uploadedData: [],
      
      // 關聯上傳相關
      associateTargetData: null,
      availableFeatures: [],
      featureUploadForms: {},
      featureUploads: {},
      featureExpanded: {},
      
      // 資料顯示模態框
      showFeatureDisplayModal: false,
      featureDisplayData: null,
      currentImageIndex: 0,
      activeTab: 'view', // 標籤頁狀態
      
      // 上傳相關
      selectedFiles: [],
      uploadForm: {
        upload_name: '',
        upload_description: ''
      },
      isUploading: false,
      uploadProgress: {
        current: 0,
        total: 0,
        percentage: 0,
        message: ''
      },
      
      // 底圖相關
      currentBaseMap: null,
      currentBaseMapId: '',
      
      // 潛勢評估相關
      potentialAnalysisData: null,
      showAnalysisModal: false,
      analysisConfig: {
        numericFields: [],
        valueField: '',
        intervals: [],
        colorScheme: 'blue-red'
      },
      potentialAnalysisLayer: null
    }
  },
  watch: {
    project: {
      async handler(newProject, oldProject) {
        // 當專案變化時，重新載入完整的專案信息
        // 檢查專案 ID 是否真的改變了
        const newProjectId = newProject?.projectId || newProject?.project_id
        const oldProjectId = oldProject?.projectId || oldProject?.project_id
        
        // 檢查專案類型是否改變（即使 ID 相同也可能改變）
        const newIsParent = newProject?.is_parent === true && !newProject?.parent_project_id
        const oldIsParent = oldProject?.is_parent === true && !oldProject?.parent_project_id
        
        // 如果專案 ID 改變，或者專案類型改變，都需要重新載入
        if (newProject && (newProjectId !== oldProjectId || newIsParent !== oldIsParent)) {
          console.log('=== project prop 變化 ===')
          console.log('專案變化詳情:', {
            oldProjectId,
            newProjectId,
            oldIsParent,
            newIsParent,
            'new is_parent': newProject?.is_parent,
            'new parent_project_id': newProject?.parent_project_id
          })
          
          // 先確保專案類型屬性存在（在載入之前）
          // 如果有 parent_project_id，一定是子專案
          if (newProject.parent_project_id) {
            newProject.is_parent = false
            console.log('檢測到 parent_project_id，強制設置為子專案')
          }
          
          // 檢查專案類型屬性是否已經完整
          const hasCompleteTypeInfo = (
            (newProject.is_parent === true && !newProject.parent_project_id) || // 母專案
            (newProject.is_parent === false && newProject.parent_project_id)   || // 子專案（有 parent_project_id）
            (newProject.is_parent === false && !newProject.parent_project_id)     // 子專案（無 parent_project_id）
          )
          
          console.log('專案類型信息完整性:', {
            hasCompleteTypeInfo,
            is_parent: newProject.is_parent,
            parent_project_id: newProject.parent_project_id
          })
          
          // 只有在專案類型信息不完整時才調用 API
          if (!hasCompleteTypeInfo) {
            console.log('專案類型信息不完整，調用 API 載入')
          await this.loadFullProjectInfo()
          } else {
            console.log('專案類型信息已完整，跳過 API 調用')
          }
          
          // 等待響應式更新完成後再檢查
          await this.$nextTick()
          
          // 強制觸發計算屬性
          const isParentResult = this.isParentProject
          console.log('=== 專案狀態檢查 ===')
          console.log('is_parent:', this.project?.is_parent)
          console.log('parent_project_id:', this.project?.parent_project_id)
          console.log('isParentProject (計算結果):', isParentResult)
          
          // 如果是母專案，載入子專案列表
          if (isParentResult) {
            console.log('是母專案，載入子專案列表')
            await this.loadChildProjects()
          } else {
            console.log('是子專案，不需要載入子專案列表')
          }
          
          // 再次等待響應式更新
          await this.$nextTick()
          
          // 強制更新視圖以確保側邊欄正確顯示
          this.$forceUpdate()
          console.log('視圖已強制更新')
          
          // 更新地圖
          await this.$nextTick()
        if (this.map && this.project) {
            console.log('準備更新地圖')
            // 通過 ref 調用 ProjectMap 組件的 updateMap 方法
            if (this.$refs.projectMap && typeof this.$refs.projectMap.updateMap === 'function') {
              this.$refs.projectMap.updateMap()
            } else {
              console.warn('ProjectMap 組件的 updateMap 方法不可用')
            }
          }
        }
      },
      immediate: false,
      deep: true
    }
  },
  async mounted() {
    console.log('=== ProjectDetail 組件已掛載 ===')
    console.log('接收到的 project:', JSON.parse(JSON.stringify(this.project)))
    console.log('初始 layerVisibility:', this.layerVisibility)
    
    // 先檢查初始狀態
    console.log('初始狀態檢查 - isParentProject:', this.isParentProject)
    console.log('初始狀態檢查 - project.is_parent:', this.project?.is_parent)
    console.log('初始狀態檢查 - project.parent_project_id:', this.project?.parent_project_id)
    
    // 重新從 API 獲取完整的專案信息（包含 is_parent 和 parent_project_id）
    await this.loadFullProjectInfo()
    
    // 等待響應式更新完成
    await this.$nextTick()
    
    // 強制觸發計算屬性
    const isParent = this.isParentProject
    console.log('=== 載入完成後的專案信息 ===')
    console.log('projectId:', this.project?.projectId)
    console.log('is_parent:', this.project?.is_parent)
    console.log('parent_project_id:', this.project?.parent_project_id)
    console.log('isParentProject (計算結果):', isParent)
    console.log('完整專案對象:', JSON.parse(JSON.stringify(this.project)))
    
    // 檢查 ProjectMap 組件是否被創建
    this.$nextTick(() => {
      console.log('檢查 ProjectMap 組件:', !!this.$refs.projectMap)
      if (this.$refs.projectMap) {
        console.log('ProjectMap 組件已創建')
      } else {
        console.log('ProjectMap 組件未創建')
      }
    })
    
    // 如果是母專案，載入子專案列表
    if (this.isParentProject) {
      await this.loadChildProjects()
    }
    
    await this.loadGeoJSONLayers()
    await this.loadUploadedData()
    await this.loadTemporalData()
    
    // 載入底圖數據並開始預載入 TIF 檔案
    await this.loadBaseMapsAndPreloadTif()
    
    // 如果是子專案且地圖已準備好，載入災點紀錄
    // 注意：如果地圖還沒準備好，會在 onMapReady 中載入
    if (!this.isParentProject && this.map) {
      console.log('地圖已準備，在 mounted 中載入災點紀錄')
      await this.loadDisasterPoints()
    }
    
    // 監聽 baseMapService 的變化
    this.$watch('baseMapService', (newService) => {
      console.log('baseMapService 變化:', !!newService)
      if (newService) {
        console.log('baseMapService 已準備好，通知子組件')
      }
    }, { immediate: true })
    
    // 等待父組件響應狀態更新
    await this.$nextTick()
    console.log('載入完成後的 layerVisibility:', this.layerVisibility)
  },
  
  beforeUnmount() {
    console.log('ProjectDetail 組件即將卸載，清理數據')
    // 清理災點標記
    this.clearDisasterPointMarkers()
    // 清理所有響應式數據
    this.geojsonLayers = []
    this.loadedGeojsonLayers = {}
    this.geojsonData = null
    this.activeGeojsonLayer = null
    this.featureUploads = {}
    
    // 通知子組件清理
    if (this.$refs.projectMap) {
      this.$refs.projectMap.clearAllLayers()
    }
  },
  methods: {
    // 從 API 載入完整的專案信息
    async loadFullProjectInfo() {
      try {
        const projectId = this.project?.projectId || this.project?.project_id
        if (!projectId) {
          console.warn('無法載入專案信息：缺少專案 ID')
          return
        }

        console.log('loadFullProjectInfo 開始，當前專案狀態:', {
          projectId,
          is_parent: this.project?.is_parent,
          parent_project_id: this.project?.parent_project_id
        })

        // 策略：根據初始的 is_parent 和 parent_project_id 決定調用哪個 API
        // 1. 如果 is_parent === false 或有 parent_project_id，這是子專案
        // 2. 如果 is_parent === true，這是母專案
        // 3. 否則，先嘗試母專案 API，再嘗試子專案 API

        // 如果專案已明確標記為子專案（is_parent === false 或有 parent_project_id）
        if (this.project?.is_parent === false || this.project?.parent_project_id) {
          console.log('專案已標記為子專案，直接載入子專案信息')
          try {
            const childResponse = await this.$api.get(`/child-projects/${projectId}`)
            if (childResponse && childResponse.success) {
              // 先保存原有的 parent_project_id（如果有的話）
              const existingParentId = this.project.parent_project_id
              
              // 合併專案信息
              Object.assign(this.project, childResponse.data)
              
              // 明確設置為子專案（必須在 Object.assign 之後設置，避免被覆蓋）
              this.project.is_parent = false
              
              // 恢復或設置 parent_project_id（優先使用原有的）
              if (existingParentId) {
                this.project.parent_project_id = existingParentId
              } else if (childResponse.data.parent_project_id) {
                this.project.parent_project_id = childResponse.data.parent_project_id
              }
              // 確保 projectId 映射正確
              if (!this.project.projectId && this.project.project_id) {
                this.project.projectId = this.project.project_id
              }
              // 確保 parent_project_id 存在（保持原有的或使用 API 返回的）
              if (!this.project.parent_project_id && childResponse.data.parent_project_id) {
                this.project.parent_project_id = childResponse.data.parent_project_id
              }
              console.log('從子專案 API 獲取專案信息成功', {
                is_parent: this.project.is_parent,
                parent_project_id: this.project.parent_project_id,
                projectId: this.project.projectId
              })
              
              // 強制觸發計算屬性以檢查狀態
              const currentIsParent = this.isParentProject
              console.log('設置後立即檢查 isParentProject:', currentIsParent)
              
              // 強制更新視圖
              await this.$nextTick()
              this.$forceUpdate()
              
              // 再次檢查
              const afterUpdateIsParent = this.isParentProject
              console.log('強制更新後 isParentProject:', afterUpdateIsParent)
              
              return
            }
          } catch (error) {
            console.log('子專案 API 調用失敗:', error.message)
            // 即使 API 失敗，也保持子專案狀態
            console.log('保持子專案狀態，不再嘗試母專案 API')
            return
          }
        }

        // 如果專案已明確標記為母專案（is_parent === true）
        if (this.project?.is_parent === true) {
          console.log('專案已標記為母專案，直接載入母專案信息')
        try {
          const parentResponse = await this.$api.get(`/parent-projects/${projectId}`)
          if (parentResponse && parentResponse.success) {
            // 合併專案信息
            Object.assign(this.project, parentResponse.data)
              // Vue 3 直接賦值即可，響應式系統會自動處理
              this.project.is_parent = true
              this.project.parent_project_id = null
              console.log('從母專案 API 獲取專案信息成功')
              return
            }
          } catch (error) {
            console.log('母專案 API 調用失敗:', error.message)
            return
          }
        }

        // 專案類型未明確，先嘗試母專案 API，再嘗試子專案 API
        console.log('專案類型未明確，先嘗試母專案 API')
        try {
          const parentResponse = await this.$api.get(`/parent-projects/${projectId}`)
          if (parentResponse && parentResponse.success) {
            // 合併專案信息
            Object.assign(this.project, parentResponse.data)
            // Vue 3 直接賦值即可，響應式系統會自動處理
            this.project.is_parent = true
            this.project.parent_project_id = null
            console.log('從母專案 API 獲取專案信息成功，設置 is_parent=true')
            return
          }
        } catch (error) {
          console.log('不是母專案，嘗試子專案 API:', error.message)
        }

        // 如果不是母專案，嘗試從子專案 API 獲取
        try {
          const childResponse = await this.$api.get(`/child-projects/${projectId}`)
          if (childResponse && childResponse.success) {
            console.log('子專案 API 返回數據:', childResponse.data)
            
            // 先保存原有的 parent_project_id（如果有的話）
            const existingParentId = this.project.parent_project_id
            
            // 合併專案信息
            Object.assign(this.project, childResponse.data)
            
            // 明確設置為子專案（必須在 Object.assign 之後設置，避免被 API 返回的數據覆蓋）
            this.project.is_parent = false
            
            // 恢復或設置 parent_project_id（優先使用原有的，然後是 API 返回的）
            if (existingParentId) {
              this.project.parent_project_id = existingParentId
            } else if (childResponse.data.parent_project_id) {
              this.project.parent_project_id = childResponse.data.parent_project_id
            }
            
            // 確保 projectId 映射正確
            if (!this.project.projectId && this.project.project_id) {
              this.project.projectId = this.project.project_id
            }
            
            // 確保 parent_project_id 存在（優先使用 API 返回的，否則保持原有的）
            if (childResponse.data.parent_project_id) {
              this.project.parent_project_id = childResponse.data.parent_project_id
            } else if (!this.project.parent_project_id) {
              // 如果 API 沒有返回且原本也沒有，嘗試從當前專案推斷
              console.warn('子專案 API 沒有返回 parent_project_id，嘗試從當前上下文推斷')
            }
            console.log('從子專案 API 獲取專案信息成功', {
              is_parent: this.project.is_parent,
              parent_project_id: this.project.parent_project_id,
              projectId: this.project.projectId
            })
            
            // 強制觸發計算屬性以檢查狀態
            const currentIsParent = this.isParentProject
            console.log('設置後立即檢查 isParentProject:', currentIsParent)
            
            // 強制更新視圖
            await this.$nextTick()
            this.$forceUpdate()
            
            // 再次檢查
            const afterUpdateIsParent = this.isParentProject
            console.log('強制更新後 isParentProject:', afterUpdateIsParent)
            
            return
          }
        } catch (error) {
          console.log('子專案 API 調用失敗:', error.message)
          // 如果子專案 API 也失敗，檢查是否已有 parent_project_id
          if (this.project?.parent_project_id) {
            // 有 parent_project_id 說明是子專案
            this.project.is_parent = false
            console.log('專案是子專案（已有 parent_project_id）:', {
              is_parent: this.project.is_parent,
              parent_project_id: this.project.parent_project_id
            })
            return
          }
          // 如果都沒有，默認設置為子專案（顯示側邊欄）
          console.log('API 調用失敗，默認設置為子專案（顯示側邊欄）')
          this.project.is_parent = false
        }
      } catch (error) {
        console.error('載入專案信息失敗:', error)
        // 即使出錯，也確保設置默認值
        if (!this.project.hasOwnProperty('is_parent') || this.project.is_parent === undefined) {
          // 如果有 parent_project_id，一定是子專案
          if (this.project?.parent_project_id) {
            this.project.is_parent = false
            console.log('根據 parent_project_id 設置為子專案')
          } else {
            // 默認設置為子專案（顯示側邊欄）
            this.project.is_parent = false
            console.log('錯誤處理：默認設置為子專案（顯示側邊欄）')
          }
        }
      }
    },

    // 載入子專案列表
    async loadChildProjects() {
      if (!this.isParentProject) {
        return
      }

      try {
        const projectId = this.project?.projectId || this.project?.project_id
        if (!projectId) {
          console.warn('無法載入子專案：缺少專案 ID')
          return
        }

        const response = await this.$api.get(`/parent-projects/${projectId}/children`)
        if (response && response.success) {
          this.childProjects = response.data.children || []
          console.log('子專案載入成功:', this.childProjects.length, '個')
          
          // 按 event_date 排序並分配順序號
          this.childProjects.sort((a, b) => {
            const dateA = a.event_date ? new Date(a.event_date) : new Date(a.created_at || 0)
            const dateB = b.event_date ? new Date(b.event_date) : new Date(b.created_at || 0)
            return dateA - dateB
          })
          
          this.childProjects.forEach((child, index) => {
            child.orderNumber = index + 1
          })
        }
      } catch (error) {
        console.error('載入子專案失敗:', error)
      }
    },

    // 處理返回母專案
    async handleBackToParent() {
      const parentProjectId = this.project?.parent_project_id
      if (!parentProjectId) {
        console.warn('無法返回母專案：缺少 parent_project_id')
        return
      }
      
      console.log('返回母專案:', parentProjectId)
      
      try {
        // 從 API 載入母專案的完整信息
        const parentResponse = await this.$api.get(`/parent-projects/${parentProjectId}`)
        if (parentResponse && parentResponse.success) {
          let project = { ...parentResponse.data }
          
          // 確保專案對象結構正確
          if (!project.projectId && project.project_id) {
            project.projectId = project.project_id
          }
          
          // 明確設置為母專案
          project.is_parent = true
          project.parent_project_id = null
          
          // 確保 location 數據正確
          if (!project.location && (project.latitude || project.longitude)) {
            project.location = {
              lat: project.latitude || null,
              lng: project.longitude || null
            }
          }
          
          console.log('成功載入母專案信息，準備切換:', {
            projectId: project.projectId,
            is_parent: project.is_parent,
            parent_project_id: project.parent_project_id,
            name: project.name
          })
          
          // 發送事件給父組件，讓它切換到母專案
          this.$emit('switch-project', project)
        } else {
          console.error('無法載入母專案信息')
        }
      } catch (error) {
        console.error('載入母專案失敗:', error)
      }
    },

    // 處理打開子專案詳情頁面
    async handleOpenChildProject(childProject) {
      const childProjectId = childProject.project_id || childProject.projectId
      if (!childProjectId) {
        console.warn('無法打開子專案：缺少專案 ID')
        return
      }
      
      console.log('打開子專案:', childProjectId)
      
      try {
        // 嘗試從 API 載入子專案的完整信息
        const childResponse = await this.$api.get(`/child-projects/${childProjectId}`)
        if (childResponse && childResponse.success) {
          let project = { ...childResponse.data }
          
          // 確保專案對象結構正確
          if (!project.projectId && project.project_id) {
            project.projectId = project.project_id
          }
          
          // 明確設置為子專案，確保所有必要屬性都設置
          project.is_parent = false
          
          // 確保 parent_project_id 存在（優先使用 API 返回的）
          if (!project.parent_project_id) {
            // 如果 API 沒有返回 parent_project_id，嘗試從當前專案推斷
            if (this.project?.projectId && this.isParentProject) {
              // 如果當前是母專案，設置當前專案為父專案
              project.parent_project_id = this.project.projectId
              console.log('設置 parent_project_id 為當前母專案 ID:', this.project.projectId)
            } else if (childResponse.data.parent_project_id) {
              // 使用 API 返回的
              project.parent_project_id = childResponse.data.parent_project_id
            } else {
              console.warn('無法確定 parent_project_id，專案可能無法正確識別為子專案')
            }
          }
          
          // 確保 location 數據正確（優先使用 API 返回的）
          if (!project.location) {
            if (project.latitude && project.longitude) {
              project.location = {
                lat: parseFloat(project.latitude),
                lng: parseFloat(project.longitude)
              }
            } else if (childProject.location?.lat && childProject.location?.lng) {
              // 使用傳入的 childProject 的 location
              project.location = childProject.location
            } else if (project.location_geometry?.coordinates) {
              // 從 location_geometry 提取
              const coords = project.location_geometry.coordinates
              project.location = {
                lat: parseFloat(coords[1]),
                lng: parseFloat(coords[0])
              }
            }
          }
          
          console.log('成功載入子專案信息，準備切換專案:', {
            projectId: project.projectId,
            is_parent: project.is_parent,
            parent_project_id: project.parent_project_id,
            name: project.name,
            location: project.location,
            latitude: project.latitude,
            longitude: project.longitude
          })
          
          // 發送事件給父組件，讓它切換專案
          this.$emit('switch-project', project)
          
          // 同時更新 URL 參數（如果需要）
          if (this.$router) {
            this.$router.push({
              name: 'DisasterCollection',
              query: {
                project: childProjectId
              }
            }).catch(() => {
              // 忽略導航錯誤，因為我們已經在同一個視圖中
            })
          }
        } else {
          console.error('無法載入子專案信息')
          // 回退到原來的導航方式
          this.fallbackNavigation(childProjectId)
        }
      } catch (error) {
        console.error('載入子專案失敗，使用備用方案:', error)
        // 如果 API 載入失敗，回退到原來的導航方式
        this.fallbackNavigation(childProjectId)
      }
    },
    
    // 備用導航方案（當 API 載入失敗時使用）
    fallbackNavigation(childProjectId) {
      // 使用 Vue Router 導航到災情資料搜集頁面，並帶上專案 ID 參數
      if (this.$router) {
        this.$router.push({
          name: 'DisasterCollection',
          query: {
            project: childProjectId
          }
        }).catch(err => {
          // 如果路由失敗，回退到直接更新 URL
          console.warn('路由導航失敗，使用 URL 更新:', err)
          const url = new URL(window.location.origin + '/disaster-collection')
          url.searchParams.set('project', childProjectId)
          window.location.href = url.toString()
        })
      } else {
        // 如果沒有 router，直接更新 URL
        const url = new URL(window.location.origin + '/disaster-collection')
        url.searchParams.set('project', childProjectId)
        window.location.href = url.toString()
      }
    },

    // 處理定位子專案（從時間軸點擊定位）
    handleDisasterRecord(childProject) {
      // 處理影像紀錄按鈕點擊
      console.log('開啟影像紀錄:', childProject)
      this.selectedChildProjectForImageRecord = childProject
      this.showImageRecordModal = true
    },
    
    handleAddRecord() {
      // 處理新增紀錄按鈕點擊
      console.log('開啟新增紀錄:', this.project)
      this.selectedParentProjectForChild = this.project
      this.showCreateChildModal = true
    },
    
    async handleChildCreated(childProject) {
      // 處理子專案創建成功
      console.log('子專案創建成功:', childProject)
      // 重新載入子專案列表（時間軸）
      await this.loadChildProjects()
      
      // 刷新地圖上的子專案標記
      if (this.$refs.projectMap && this.$refs.projectMap.loadChildProjects) {
        console.log('刷新地圖標記')
        await this.$refs.projectMap.loadChildProjects()
      }
      
      // 關閉模態框
      this.showCreateChildModal = false
      this.selectedParentProjectForChild = null
    },
    
    handleEditChildProject(childProject) {
      // 處理編輯子專案按鈕點擊
      console.log('開啟編輯子專案:', childProject)
      this.selectedChildProjectForEdit = childProject
      this.showEditChildModal = true
    },
    
    async handleChildUpdated(updatedChildProject) {
      // 處理子專案更新成功
      console.log('子專案更新成功:', updatedChildProject)
      // 重新載入子專案列表（時間軸）
      await this.loadChildProjects()
      
      // 刷新地圖上的子專案標記
      if (this.$refs.projectMap && this.$refs.projectMap.loadChildProjects) {
        console.log('刷新地圖標記')
        await this.$refs.projectMap.loadChildProjects()
      }
      
      // 關閉模態框
      this.showEditChildModal = false
      this.selectedChildProjectForEdit = null
    },
    
    async handleParentUpdated(updatedParentProject) {
      // 處理母專案更新成功
      console.log('母專案更新成功:', updatedParentProject)
      
      // 發送事件給父組件更新專案資料
      this.$emit('project-updated', updatedParentProject)
      
      // 更新地圖上的專案標記（如果座標變更）
      if (this.$refs.projectMap && this.$refs.projectMap.updateMap) {
        this.$refs.projectMap.updateMap()
      }
      
      // 關閉模態框
      this.showEditParentModal = false
    },
    
    async handleDeleteChildProject(childProject) {
      // 處理刪除子專案按鈕點擊（確認對話框已在 ChildProjectTimeline 組件中處理）
      console.log('ProjectDetail: handleDeleteChildProject 被調用', childProject)
      try {
        console.log('開始刪除子專案:', childProject.project_id)
        const response = await this.$api.delete(`/child-projects/${childProject.project_id}`)
        console.log('刪除API響應:', response)
        
        if (response && response.success) {
          console.log('子專案刪除成功')
          // 重新載入子專案列表（時間軸）
          await this.loadChildProjects()
          
          // 刷新地圖上的子專案標記
          if (this.$refs.projectMap && this.$refs.projectMap.loadChildProjects) {
            console.log('刷新地圖標記')
            await this.$refs.projectMap.loadChildProjects()
          }
          
          // 顯示成功提示
          const { showAlert } = useAlert()
          await showAlert({
            type: 'success',
            title: '刪除成功',
            message: '時期專案已刪除',
            isDarkMode: this.isDarkMode
          })
        } else {
          console.error('刪除失敗，響應:', response)
          // 顯示錯誤提示
          const { showAlert } = useAlert()
          await showAlert({
            type: 'error',
            title: '錯誤',
            message: response?.message || '刪除失敗',
            isDarkMode: this.isDarkMode
          })
        }
      } catch (error) {
        console.error('刪除子專案失敗:', error)
        console.error('錯誤詳情:', {
          message: error.message,
          response: error.response,
          data: error.response?.data
        })
        // 顯示後端返回的具體錯誤訊息
        const errorMessage = error.response?.data?.message || error.message || '刪除時期專案時發生錯誤，請稍後再試'
        const { showAlert } = useAlert()
        await showAlert({
          type: 'error',
          title: '錯誤',
          message: errorMessage,
          isDarkMode: this.isDarkMode
        })
      }
    },
    
    handleShowChildDetail(childProject) {
      // 處理顯示事件詳情
      console.log('顯示事件詳情:', childProject)
      this.selectedChildProjectForDetail = childProject
      this.showChildDetailModal = true
    },
    
    handleViewPhotos() {
      // 處理瀏覽所有子專案照片
      console.log('打開照片瀏覽模態框')
      this.showPhotoGalleryModal = true
    },
    
    async handleAnimationMode() {
      // 處理動畫模式 - 開啟照片瀏覽動畫
      console.log('開啟動畫瀏覽模式')
      
      // 載入所有子專案的災點數據
      await this.loadAllChildProjectsDisasterPoints()
      
      // 從第一個子專案開始
      this.currentAnimationChildIndex = 0
      
      // 顯示瀏覽模態框
      this.showAnimationBrowseModal = true
      
      // 地圖定位到第一個子專案
      this.$nextTick(() => {
        this.flyToChildProject()
      })
      
      // 不自動播放，由用戶手動控制
    },
    
    async loadAllChildProjectsDisasterPoints() {
      // 載入所有子專案的災點數據
      if (!this.childProjects || this.childProjects.length === 0) {
        console.log('沒有子專案，跳過載入災點數據')
        return
      }
      
      console.log('開始載入所有子專案的災點數據...', `共 ${this.childProjects.length} 個子專案`)
      
      try {
        const promises = this.childProjects.map(async (child) => {
          try {
            console.log(`載入子專案 ${child.name} (${child.project_id}) 的災點...`)
            const response = await this.$api.get(`/disaster-points/project/${child.project_id}`)
            console.log(`子專案 ${child.name} 災點回應:`, response)
            
            if (response && response.success && response.data) {
              console.log(`子專案 ${child.name} 有 ${response.data.length} 個災點`)
              response.data.forEach((dp, idx) => {
                console.log(`  災點 ${idx + 1}:`, {
                  id: dp.disaster_point_id,
                  description: dp.description,
                  mediaCount: dp.media_files?.length || 0,
                  mediaFiles: dp.media_files
                })
              })
              
              return {
                childProjectId: child.project_id,
                disasterPoints: response.data
              }
            }
            console.log(`子專案 ${child.name} 沒有災點數據`)
            return {
              childProjectId: child.project_id,
              disasterPoints: []
            }
          } catch (error) {
            console.error(`載入子專案 ${child.name} (${child.project_id}) 災點失敗:`, error)
            return {
              childProjectId: child.project_id,
              disasterPoints: []
            }
          }
        })
        
        const results = await Promise.all(promises)
        
        // 構建災點數據對象
        const disasterPointsMap = {}
        results.forEach(result => {
          disasterPointsMap[result.childProjectId] = result.disasterPoints
        })
        
        this.allChildProjectsDisasterPoints = disasterPointsMap
        console.log('所有子專案災點數據載入完成，總覽:', this.allChildProjectsDisasterPoints)
        
        // 顯示統計
        const totalDisasterPoints = Object.values(disasterPointsMap).reduce((sum, points) => sum + points.length, 0)
        console.log(`載入完成：共 ${totalDisasterPoints} 個災點`)
      } catch (error) {
        console.error('載入所有子專案災點失敗:', error)
      }
    },
    
    startAnimationPlayback() {
      // 開始自動播放動畫 - 每5秒切換到下一個子專案
      if (this.animationTimer) {
        clearInterval(this.animationTimer)
      }
      
      this.animationTimer = setInterval(() => {
        this.nextAnimationChild()
      }, 5000) // 5秒切換一次
    },
    
    stopAnimationPlayback() {
      // 停止自動播放
      if (this.animationTimer) {
        clearInterval(this.animationTimer)
        this.animationTimer = null
      }
    },
    
    nextAnimationChild() {
      // 切換到下一個子專案
      if (!this.childProjects || this.childProjects.length === 0) return
      
      this.currentAnimationChildIndex = (this.currentAnimationChildIndex + 1) % this.childProjects.length
      console.log('切換到子專案:', this.currentAnimationChildIndex, this.currentAnimationChild?.name)
      
      // 地圖定位到子專案座標
      this.flyToChildProject()
    },
    
    previousAnimationChild() {
      // 切換到上一個子專案
      if (!this.childProjects || this.childProjects.length === 0) return
      
      this.currentAnimationChildIndex = (this.currentAnimationChildIndex - 1 + this.childProjects.length) % this.childProjects.length
      console.log('切換到子專案:', this.currentAnimationChildIndex, this.currentAnimationChild?.name)
      
      // 地圖定位到子專案座標
      this.flyToChildProject()
    },
    
    flyToChildProject() {
      // 地圖定位到當前子專案的座標
      if (!this.currentAnimationChild) {
        console.log('[flyToChildProject] 沒有當前子專案')
        return
      }
      
      const lat = this.currentAnimationChild.latitude
      const lng = this.currentAnimationChild.longitude
      
      if (!lat || !lng) {
        console.log('[flyToChildProject] 子專案沒有座標:', this.currentAnimationChild.name)
        return
      }
      
      console.log('[flyToChildProject] 定位到:', lat, lng, '子專案:', this.currentAnimationChild.name)
      
      // 獲取地圖實例
      const projectMapComponent = this.$refs.projectMap
      if (!projectMapComponent) {
        console.log('[flyToChildProject] 找不到 ProjectMap 組件')
        return
      }
      
      // 訪問 Leaflet map 實例
      const map = projectMapComponent.map
      if (!map) {
        console.log('[flyToChildProject] 找不到 Leaflet map 實例')
        return
      }
      
      // 使用 flyTo 方法平滑飛行到目標位置，縮放層級設為 18
      map.flyTo([lat, lng], 18, {
        duration: 1.5, // 動畫持續 1.5 秒
        easeLinearity: 0.25
      })
      
      console.log('[flyToChildProject] 地圖已定位到子專案座標')
    },
    
    closeAnimationBrowse() {
      // 關閉動畫瀏覽模式
      this.stopAnimationPlayback()
      this.showAnimationBrowseModal = false
      this.currentAnimationChildIndex = 0
    },
    
    async handleDisasterPointCreated(disasterPoint) {
      // 處理災點紀錄創建成功
      console.log('災點紀錄創建成功:', disasterPoint)
      // 重新載入災點列表
      await this.loadDisasterPoints()
      // 關閉模態框，但保持災點紀錄模式（允許繼續創建）
      this.showDisasterPointModal = false
      this.selectedMapLocation = null
    },
    
    // 載入災點紀錄
    async loadDisasterPoints() {
      // 獲取專案 ID（支援 projectId 和 project_id）
      const projectId = this.project?.projectId || this.project?.project_id
      
      if (!projectId) {
        console.warn('無法載入災點紀錄：缺少專案ID', this.project)
        return
      }
      
      // 只為子專案載入災點
      if (this.isParentProject) {
        console.log('是母專案，跳過載入災點紀錄')
        return
      }
      
      // 確保地圖已準備好
      if (!this.map) {
        console.warn('無法載入災點紀錄：地圖未初始化')
        return
      }
      
      // 確保地圖容器已準備好
      if (!this.map.getContainer() || !this.map.getContainer().parentNode) {
        console.warn('無法載入災點紀錄：地圖容器未準備好，將在下一幀重試')
        this.$nextTick(() => {
          this.loadDisasterPoints()
        })
        return
      }
      
      console.log('開始載入災點紀錄，專案ID:', projectId)
      
      try {
        const response = await this.$api.get(`/disaster-points/project/${projectId}`)
        
        console.log('災點紀錄 API 響應:', response)
        
        if (response && response.success) {
          // 清除現有標記
          this.clearDisasterPointMarkers()
          
          // 確保地圖容器準備好後再添加標記
          await this.$nextTick()
          
          // 添加新的災點標記
          if (response.data && Array.isArray(response.data)) {
            console.log(`準備添加 ${response.data.length} 個災點標記`)
            
            // 根據 disaster_time 排序（有時間的在前，然後按時間升序）
            const sortedData = [...response.data].sort((a, b) => {
              // 如果都沒有 disaster_time，按 created_at 排序
              if (!a.disaster_time && !b.disaster_time) {
                return new Date(a.created_at) - new Date(b.created_at)
              }
              // 如果只有一個有 disaster_time，有時間的在前
              if (!a.disaster_time) return 1
              if (!b.disaster_time) return -1
              // 兩個都有時間，按時間升序
              return new Date(a.disaster_time) - new Date(b.disaster_time)
            })
            
            // 添加標記並分配序號
            sortedData.forEach((disasterPoint, index) => {
              const orderNumber = index + 1
              console.log('添加災點標記:', disasterPoint.name, disasterPoint.latitude, disasterPoint.longitude, `序號: ${orderNumber}`)
              this.addDisasterPointMarker(disasterPoint, orderNumber)
            })
            console.log(`成功載入 ${response.data.length} 個災點紀錄`)
          } else {
            console.warn('災點紀錄數據格式不正確:', response.data)
          }
        } else {
          console.warn('災點紀錄 API 返回失敗:', response)
        }
      } catch (error) {
        console.error('載入災點紀錄失敗:', error)
        console.error('錯誤詳情:', error.response || error.message)
      }
    },
    
    // 清除災點標記
    clearDisasterPointMarkers() {
      if (this.disasterPointMarkers && this.disasterPointMarkers.length > 0 && this.map) {
        this.disasterPointMarkers.forEach(marker => {
          if (this.map && marker) {
            this.map.removeLayer(marker)
          }
        })
        this.disasterPointMarkers = []
      }
    },
    
    addDisasterPointMarker(disasterPoint, orderNumber = null) {
      if (!this.map) {
        console.warn('無法添加災點標記：地圖未初始化', { map: !!this.map })
        return
      }
      
      // 檢查地圖容器是否已準備好
      if (!this.map.getContainer() || !this.map.getContainer().parentNode) {
        console.warn('無法添加災點標記：地圖容器未準備好')
        return
      }
      
      if (!disasterPoint.latitude || !disasterPoint.longitude) {
        console.warn('無法添加災點標記：缺少座標', disasterPoint)
        return
      }
      
      console.log('添加災點標記:', {
        name: disasterPoint.name,
        lat: disasterPoint.latitude,
        lng: disasterPoint.longitude,
        orderNumber: orderNumber,
        map: !!this.map,
        container: !!this.map.getContainer()
      })
      
      try {
        // 使用紅色圖標
        const color = '#ef4444' // 紅色
        
        // 根據是否有序號決定顯示內容和樣式
        const displayContent = orderNumber !== null ? orderNumber : '!'
        // 根據數字位數調整字體大小和圖標大小
        const isMultiDigit = orderNumber !== null && orderNumber > 9
        const fontSize = orderNumber !== null 
          ? (isMultiDigit ? '14px' : '18px')
          : '20px'
        const iconSize = isMultiDigit ? [40, 40] : [36, 36]
        const iconAnchor = isMultiDigit ? [20, 20] : [18, 18]
        
        // 創建自定義圖標 - 紅色數字或驚嘆號
        const customIcon = L.divIcon({
          className: 'disaster-point-marker',
          html: `
            <div style="
              width: ${iconSize[0]}px;
              height: ${iconSize[1]}px;
              border-radius: 50%;
              background-color: ${color};
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${fontSize};
              font-weight: bold;
              color: white;
              line-height: 1;
            ">${displayContent}</div>
          `,
          iconSize: iconSize,
          iconAnchor: iconAnchor,
          popupAnchor: [0, -iconAnchor[1]]
        })
        
        // 創建標記
        const marker = L.marker([parseFloat(disasterPoint.latitude), parseFloat(disasterPoint.longitude)], {
          icon: customIcon,
          zIndexOffset: 1000
        })
        
        // 點擊事件 - 根據模式打開編輯、刪除、瀏覽或查看模態框
        marker.on('click', () => {
          if (this.disasterPointMode === 'edit') {
            // 編輯模式：打開編輯模態框
            this.selectedDisasterPointForEdit = disasterPoint
            this.selectedMapLocation = null
            this.showDisasterPointModal = true
          } else if (this.disasterPointMode === 'delete') {
            // 刪除模式：確認刪除
            this.handleDeleteDisasterPoint(disasterPoint)
          } else if (this.disasterPointMode === 'browse') {
            // 瀏覽模式：找到該災點的索引並顯示
            const index = this.disasterPointMarkers.findIndex(m => m.disasterPointData?.disaster_point_id === disasterPoint.disaster_point_id)
            if (index >= 0 && this.$refs.disasterPointBrowse) {
              this.$refs.disasterPointBrowse.currentIndex = index
              this.$refs.disasterPointBrowse.showCurrentDisasterPoint()
            }
          } else {
            // 查看模式：打開查看模態框
            this.selectedDisasterPointForView = disasterPoint
            this.showDisasterPointViewModal = true
          }
        })
        
        // 確保地圖容器準備好後再添加標記
        this.$nextTick(() => {
          if (this.map && this.map.getContainer()) {
            marker.addTo(this.map)
            
            // 保存到陣列（包含災點數據）
            marker.disasterPointData = disasterPoint
            this.disasterPointMarkers.push(marker)
            
            console.log('災點標記已添加到地圖:', disasterPoint.name)
          } else {
            console.warn('地圖容器未準備好，延遲添加標記')
          }
        })
      } catch (error) {
        console.error('添加災點標記時發生錯誤:', error)
      }
    },
    
    
    handleLocateChildProject(childProject) {
      // 提取座標（優先使用子專案本身的座標，否則使用母專案的座標）
      let lat = null
      let lng = null
      
      // 優先使用子專案本身的座標
      if (childProject.latitude && childProject.longitude) {
        lat = parseFloat(childProject.latitude)
        lng = parseFloat(childProject.longitude)
      } else if (childProject.location_geometry && childProject.location_geometry.coordinates) {
        lng = parseFloat(childProject.location_geometry.coordinates[0])
        lat = parseFloat(childProject.location_geometry.coordinates[1])
      } else if (childProject.location && childProject.location.lat && childProject.location.lng) {
        lat = parseFloat(childProject.location.lat)
        lng = parseFloat(childProject.location.lng)
      } else {
        // 使用母專案的座標
        if (this.project?.location?.lat && this.project?.location?.lng) {
          lat = parseFloat(this.project.location.lat)
          lng = parseFloat(this.project.location.lng)
        } else if (this.project?.latitude && this.project?.longitude) {
          lat = parseFloat(this.project.latitude)
          lng = parseFloat(this.project.longitude)
        }
      }
      
      // 如果有有效座標，定位到地圖
      if (lat && lng && !isNaN(lat) && !isNaN(lng) && this.map) {
        // 定位到子專案位置，使用縮放層級 18
        this.map.setView([lat, lng], 18)
        
        // 高亮對應的標記（如果地圖上有標記）
        if (this.$refs.projectMap && this.$refs.projectMap.childMarkers) {
          const marker = this.$refs.projectMap.childMarkers.find(m => {
            const markerLatLng = m.getLatLng()
            return Math.abs(markerLatLng.lat - lat) < 0.0001 && 
                   Math.abs(markerLatLng.lng - lng) < 0.0001
          })
          
          if (marker) {
            // 短暫閃爍標記
            marker.openPopup()
            setTimeout(() => {
              marker.closePopup()
            }, 2000)
          }
        }
      } else {
        console.warn('子專案沒有有效的座標資訊:', childProject)
        this.showAlert({
          type: 'warning',
          title: '無法定位',
          message: '此時期專案沒有有效的座標資訊'
        })
      }
    },

    // 地圖相關方法
    async onMapReady(map) {
      console.log('=== 地圖已準備好 ===')
      console.log('地圖物件:', map)
      this.map = map
      
      // 等待地圖完全初始化和專案類型判斷完成
      await this.$nextTick()
      
      // 確保專案信息已經載入完成
      if (this.project && (!this.project.is_parent && !this.project.parent_project_id)) {
        // 如果專案類型還未確定，等待一下
        await this.$nextTick()
      }
      
      // 觸發地圖更新（確保專案類型已正確判斷）
      if (this.$refs.projectMap && typeof this.$refs.projectMap.updateMap === 'function') {
        await this.$nextTick()
        this.$refs.projectMap.updateMap()
      }
      
      // 如果是子專案，載入災點紀錄
      if (!this.isParentProject && this.project) {
        console.log('地圖準備完成，開始載入災點紀錄')
        await this.loadDisasterPoints()
      }
      
      // 地圖準備好後，重新創建時序資料標記
      this.$nextTick(() => {
        console.log('檢查時序資料列表:', this.temporalDataList)
        if (this.temporalDataList && this.temporalDataList.length > 0) {
          console.log('地圖準備好，創建時序資料標記:', this.temporalDataList.length, '筆')
          this.createTemporalDataMarkers()
        } else {
          console.log('沒有時序資料需要創建標記')
        }
      })
      
      // 自動載入里程樁號（常駐顯示）
      console.log('[ProjectDetail] 地圖準備完成，自動載入里程樁號')
      await this.loadMileagePoints()
      
      // 監聽地圖縮放事件以更新里程標籤顯示
      if (this.map) {
        console.log('[ProjectDetail] 添加 zoomend 監聽器')
        this.map.on('zoomend', () => {
          console.log('[ProjectDetail] 地圖縮放結束，更新里程標籤顯示')
          this.updateMileageLabel()
        })
      }
      
      console.log('✅ [ProjectDetail] onMapReady 執行完成')
    },
    
    // BaseMapService 準備好回調
    onBaseMapServiceReady(baseMapService) {
      console.log('收到 BaseMapService 準備好事件:', !!baseMapService)
      console.log('baseMapService 對象:', baseMapService)
      // 強制觸發計算屬性更新
      this.$forceUpdate()
      // 等待下一個 tick 後再次強制更新
      this.$nextTick(() => {
        this.$forceUpdate()
        console.log('強制更新完成，baseMapService 計算屬性應該已更新')
      })
    },
    
    // 定位到專案座標
    locateProject() {
      let lat, lng
      
      // 嘗試從不同來源獲取座標
      if (this.project?.location?.lat && this.project?.location?.lng) {
        lat = parseFloat(this.project.location.lat)
        lng = parseFloat(this.project.location.lng)
      } else if (this.project?.latitude && this.project?.longitude) {
        lat = parseFloat(this.project.latitude)
        lng = parseFloat(this.project.longitude)
      } else if (this.project?.locationGeometry?.coordinates && this.project.locationGeometry.coordinates.length >= 2) {
        lng = parseFloat(this.project.locationGeometry.coordinates[0]) // 經度
        lat = parseFloat(this.project.locationGeometry.coordinates[1]) // 緯度
      }
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        this.showAlert({
          type: 'warning',
          title: '無法定位',
          message: '專案座標資訊不完整'
        })
        return
      }
      
      if (this.$refs.projectMap && this.$refs.projectMap.map) {
        // 定位到專案座標
        this.$refs.projectMap.map.setView([lat, lng], 15)
        
        this.showAlert({
          type: 'success',
          title: '定位成功',
          message: `已定位到專案座標 (${lat.toFixed(6)}, ${lng.toFixed(6)})`
        })
      } else {
        this.showAlert({
          type: 'warning',
          title: '地圖未準備',
          message: '地圖組件尚未初始化完成，請稍後再試。'
        })
      }
    },
    
    // 編輯專案資訊
    editProject() {
      // 如果是子專案，打開編輯模態框
      if (!this.isParentProject && (this.project?.parent_project_id || this.project?.is_parent === false)) {
        this.selectedChildProjectForEdit = this.project
        this.showEditChildModal = true
      } else {
        // 母專案：打開母專案編輯模態框
        console.log('開啟編輯母專案:', this.project)
        this.showEditParentModal = true
      }
    },
    
    // 顯示專案資訊
    showProjectInfo() {
      this.showProjectInfoModal = true
    },
    
    // 關閉專案資訊模態框
    closeProjectInfoModal() {
      this.showProjectInfoModal = false
    },
    
    async onFeatureClick(event) {
      console.log('=== onFeatureClick 開始 ===')
      console.log('接收到的 event:', event)
      
      const { feature, featureId, hasUploads, latlng, fileId } = event
      
      console.log('解析的參數:', {
        featureId,
        fileId,
        hasUploads,
        latlng,
        feature: feature?.properties
      })
      
      // 檢查 fileId 是否有效
      if (!fileId) {
        console.warn('onFeatureClick: fileId 為空，跳過載入關聯上傳數據')
        return
      }
      
      // 總是重新載入關聯上傳數據，確保數據是最新的
      console.log(`開始載入 Feature ${featureId} 的關聯上傳數據...`)
      try {
        // 按需載入單個 feature 的上傳資料
        const response = await fetch(`http://localhost:3001/api/data/feature/${fileId}/${featureId}`)
          const result = await response.json()

        console.log('API 回應:', result)

          if (result.success) {
            this.featureUploads[featureId] = result.data
          console.log(`載入 Feature ${featureId} 上傳資料成功，載入了 ${result.data.length} 筆資料`)
        } else {
          this.featureUploads[featureId] = []
          console.log(`Feature ${featureId} 沒有關聯上傳資料`)
          }
        } catch (error) {
          console.error('載入關聯上傳數據失敗:', error)
        this.featureUploads[featureId] = []
        }
      
      // 確保 featureUploads 數據已正確設置
      if (!this.featureUploads[featureId]) {
        this.featureUploads[featureId] = []
        console.log(`確保 Feature ${featureId} 的 featureUploads 已初始化`)
      }
      
      // 檢查載入後是否有關聯上傳數據
      const currentHasUploads = this.featureUploads[featureId] && this.featureUploads[featureId].length > 0
      console.log('最終關聯上傳數據狀態:', currentHasUploads)
      console.log('featureUploads[featureId]:', this.featureUploads[featureId])
      
      // 總是顯示模態框，即使沒有關聯上傳數據
      console.log('準備顯示模態框...')
      const uploadsToShow = this.featureUploads[featureId] || []
      console.log('要顯示的上傳數據:', uploadsToShow.length, '筆')
      this.showFeatureUploadsPanel(featureId, uploadsToShow, fileId)
      console.log('=== onFeatureClick 結束 ===')
    },
    
    onMapClick(e) {
      // 地圖點擊事件處理 - 只有在災點紀錄模式且選擇了地圖點擊模式時才打開模態框
      if (this.isDisasterPointMode && this.disasterPointInputMode === 'map-click' && e && e.latlng) {
        this.selectedMapLocation = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        }
        this.showDisasterPointModal = true
      }
    },
    
    setDisasterPointMode(mode) {
      // 設置災點模式：'add' | 'edit' | 'delete'
      this.disasterPointMode = mode
      console.log('設置災點模式:', mode)
      
      // 根據模式顯示不同的提示
      if (mode === 'add') {
        // 新增模式：打開模式選擇模態框
        this.showDisasterPointModeSelect = true
        // 新增模式會通過 handleSelectMapClick 或 handleSelectManualInput 設置 isDisasterPointMode
      } else if (mode === 'edit') {
        // 編輯模式：設置為災點功能模式，顯示提示欄
        this.isDisasterPointMode = true
        this.disasterPointInputMode = null // 編輯模式不需要地圖點擊模式
        if (this.disasterPointMarkers.length === 0) {
          this.showCustomAlert('warning', '提示', '目前沒有災點紀錄可以編輯，請先新增災點紀錄')
          this.isDisasterPointMode = false
          this.disasterPointMode = null
          return
        }
        // 聚焦到災點區域
        this.shouldFocusDisasterPoints = true
        this.$nextTick(() => {
          this.shouldFocusDisasterPoints = false
        })
        // 不再顯示alert，因為地圖上已經有提示欄了
      } else if (mode === 'browse') {
        // 瀏覽模式：設置為災點功能模式，顯示提示欄
        this.isDisasterPointMode = true
        this.disasterPointInputMode = null // 瀏覽模式不需要地圖點擊模式
        if (this.disasterPointMarkers.length === 0) {
          this.showCustomAlert('warning', '提示', '目前沒有災點紀錄可以瀏覽，請先新增災點紀錄')
          this.isDisasterPointMode = false
          this.disasterPointMode = null
          return
        }
        // 初始化瀏覽索引和播放狀態
        this.currentBrowseIndex = -1
        // 瀏覽組件會在激活時自動顯示第一個災點
        // 不再顯示alert，因為地圖上已經有提示欄了
      } else if (mode === 'delete') {
        // 刪除模式：設置為災點功能模式，顯示提示欄
        this.isDisasterPointMode = true
        this.disasterPointInputMode = null // 刪除模式不需要地圖點擊模式
        if (this.disasterPointMarkers.length === 0) {
          this.showCustomAlert('warning', '提示', '目前沒有災點紀錄可以刪除')
          this.isDisasterPointMode = false
          this.disasterPointMode = null
          return
        }
        // 聚焦到災點區域
        this.shouldFocusDisasterPoints = true
        this.$nextTick(() => {
          this.shouldFocusDisasterPoints = false
        })
        // 不再顯示alert，因為地圖上已經有提示欄了
      }
    },
    
    handleSelectMapClick() {
      // 選擇地圖點擊模式（僅用於新增模式）
      this.showDisasterPointModeSelect = false
      this.isDisasterPointMode = true
      this.disasterPointInputMode = 'map-click'
      this.selectedMapLocation = null
    },
    
    handleSelectManualInput() {
      // 選擇手動輸入模式
      this.showDisasterPointModeSelect = false
      this.isDisasterPointMode = false
      this.disasterPointInputMode = 'manual-input'
      this.selectedMapLocation = null
      
      // 如果是編輯模式，提示用戶點擊地圖上的災點
      if (this.disasterPointMode === 'edit') {
        this.showCustomAlert('info', '提示', '請點擊地圖上的災點標記進行編輯')
      } else if (this.disasterPointMode === 'delete') {
        this.showCustomAlert('warning', '提示', '請點擊地圖上的災點標記進行刪除')
      } else {
        // 新增模式：直接打開模態框
        this.selectedDisasterPointForEdit = null
        this.showDisasterPointModal = true
      }
    },
    
    // 處理刪除災點紀錄
    async handleDeleteDisasterPoint(disasterPoint) {
      if (!disasterPoint || !disasterPoint.disaster_point_id) {
        this.showCustomAlert('error', '錯誤', '無法刪除：災點資料不完整')
        return
      }
      
      // 使用自定義確認框
      this.deleteDisasterPointPending = disasterPoint
      this.showCustomAlert('warning', '確認刪除', `確定要刪除災點「${disasterPoint.name}」嗎？此操作無法復原。`)
    },
    
    // 確認刪除災點紀錄
    async confirmDeleteDisasterPoint() {
      if (!this.deleteDisasterPointPending) return
      
      const disasterPoint = this.deleteDisasterPointPending
      const disasterPointId = disasterPoint.disaster_point_id
      this.deleteDisasterPointPending = null
      this.showAlert = false
      
      try {
        const response = await window.$api.delete(`/disaster-points/${disasterPointId}`)
        
        if (response.success) {
          // 立即從地圖上移除該災點的標記
          const markerToRemove = this.disasterPointMarkers.find(m => 
            m.disasterPointData && m.disasterPointData.disaster_point_id === disasterPointId
          )
          if (markerToRemove && this.map) {
            this.map.removeLayer(markerToRemove)
            // 從標記陣列中移除
            this.disasterPointMarkers = this.disasterPointMarkers.filter(m => m !== markerToRemove)
          }
          
          // 關閉相關的模態框
          if (this.showDisasterPointViewModal && 
              this.selectedDisasterPointForView?.disaster_point_id === disasterPointId) {
            this.showDisasterPointViewModal = false
            this.selectedDisasterPointForView = null
          }
          if (this.showDisasterPointBrowseModal && 
              this.selectedDisasterPointForBrowse?.disaster_point_id === disasterPointId) {
            this.showDisasterPointBrowseModal = false
            this.selectedDisasterPointForBrowse = null
          }
          
          this.showCustomAlert('success', '成功', '災點紀錄已刪除')
          // 重新載入災點列表（確保數據同步）
          await this.loadDisasterPoints()
        } else {
          throw new Error(response.message || '刪除失敗')
        }
      } catch (error) {
        console.error('刪除災點紀錄失敗:', error)
        this.showCustomAlert('error', '錯誤', `刪除失敗：${error.response?.data?.message || error.message || '未知錯誤'}`)
      }
    },
    
    // 顯示自定義提示框
    showCustomAlert(type, title, message) {
      this.alertType = type
      this.alertTitle = title
      this.alertMessage = message
      this.showAlert = true
    },
    
    // 處理提示框確認
    handleAlertConfirm() {
      if (this.alertType === 'warning' && this.deleteDisasterPointPending) {
        // 確認刪除
        this.confirmDeleteDisasterPoint()
      } else {
        // 其他情況：關閉提示框
        this.showAlert = false
      }
    },
    
    // 處理提示框取消
    handleAlertCancel() {
      this.deleteDisasterPointPending = null
      this.showAlert = false
    },
    
    // 處理提示框關閉
    handleAlertClose() {
      this.deleteDisasterPointPending = null
      this.showAlert = false
    },
    
    toggleDisasterPointButtons() {
      // 如果已經選擇了功能模式（新增/編輯/刪除），點擊主按鈕不執行任何操作
      if (this.isDisasterPointMode) {
        return
      }
      // 只有未選擇功能模式時，才切換按鈕組顯示狀態
      this.showDisasterPointButtons = !this.showDisasterPointButtons
    },
    
    disableDisasterPointMode() {
      // 關閉災點功能模式並收合按鈕組
      this.isDisasterPointMode = false
      this.disasterPointInputMode = null
      this.disasterPointMode = null // 重置模式
      this.showDisasterPointButtons = false // 收合按鈕組
      
      
      // 如果模態框打開，也關閉它
      if (this.showDisasterPointModal) {
        this.showDisasterPointModal = false
        this.selectedMapLocation = null
        this.selectedDisasterPointForEdit = null
      }
      // 關閉模式選擇模態框
      if (this.showDisasterPointModeSelect) {
        this.showDisasterPointModeSelect = false
      }
      // 關閉查看模態框
      if (this.showDisasterPointViewModal) {
        this.showDisasterPointViewModal = false
        this.selectedDisasterPointForView = null
      }
      // 關閉瀏覽專用模態框
      if (this.showDisasterPointBrowseModal) {
        this.showDisasterPointBrowseModal = false
        this.selectedDisasterPointForBrowse = null
      }
    },
    
    handleDisasterPointModalClose() {
      this.showDisasterPointModal = false
      this.selectedMapLocation = null
      this.selectedDisasterPointForEdit = null
      // 如果是編輯模式，保持編輯功能狀態，不退出
      // 只有在新增模式下才退出功能模式
      if (this.disasterPointMode === 'add') {
        this.isDisasterPointMode = false
        this.disasterPointInputMode = null
      }
      // 編輯模式保持 isDisasterPointMode = true，這樣主按鈕會繼續顯示"選擇功能：編輯"
    },
    
    // 瀏覽災點相關方法（委託給組件）
    handleBrowsePrevious() {
      if (this.$refs.disasterPointBrowse) {
        this.$refs.disasterPointBrowse.previous()
      }
    },
    
    handleBrowseNext() {
      if (this.$refs.disasterPointBrowse) {
        this.$refs.disasterPointBrowse.next()
      }
    },
    
    
    // 處理瀏覽組件顯示災點事件
    handleBrowseShowDisasterPoint(disasterPoint) {
      // 使用瀏覽專用模態框，而不是查看詳情模態框
      this.selectedDisasterPointForBrowse = disasterPoint
      this.showDisasterPointBrowseModal = true
    },
    
    // 處理照片刪除事件
    async handleMediaDeleted() {
      // 重新載入災點列表以更新數據
      await this.loadDisasterPoints()
      // 如果正在查看災點詳情，重新載入該災點的數據
      if (this.selectedDisasterPointForView) {
        try {
          const response = await this.$api.get(`/disaster-points/${this.selectedDisasterPointForView.disaster_point_id}`)
          if (response && response.success) {
            this.selectedDisasterPointForView = response.data
          }
        } catch (error) {
          console.error('重新載入災點數據失敗:', error)
        }
      }
      // 如果正在瀏覽災點，重新載入數據
      if (this.selectedDisasterPointForBrowse) {
        try {
          const response = await this.$api.get(`/disaster-points/${this.selectedDisasterPointForBrowse.disaster_point_id}`)
          if (response && response.success) {
            this.selectedDisasterPointForBrowse = response.data
          }
        } catch (error) {
          console.error('重新載入災點數據失敗:', error)
        }
      }
    },
    
    async handleDisasterPointUpdated(updatedDisasterPoint) {
      // 處理災點紀錄更新成功
      console.log('災點紀錄更新成功:', updatedDisasterPoint)
      // 重新載入災點列表
      await this.loadDisasterPoints()
      // 關閉模態框
      this.handleDisasterPointModalClose()
    },
    
    // 側邊欄相關方法
    toggleExpanded(area) {
      this.expandedAreas[area] = !this.expandedAreas[area]
    },
    
    toggleOverlayLayerExpanded(layer) {
      this.overlayLayersExpanded[layer] = !this.overlayLayersExpanded[layer]
    },
    
    // 上傳相關方法
    openLayerUpload() {
      this.associateTargetData = null
      this.showUploadModal = true
    },
    
    openBaseMapUpload() {
      this.showBaseMapUploadModal = true
    },
    
    openTemporalUpload() {
      console.log('開啟時序資料上傳')
      this.showTemporalUploadModal = true
    },
    
    closeUploadModal() {
      this.showUploadModal = false
      this.showLayerUploadModal = false
      this.associateTargetData = null
      this.editingData = null
      this.isEditMode = false
    },
    
    closeAssociateModal() {
      this.associateTargetData = null
    },
    
    closeBaseMapUploadModal() {
      this.showBaseMapUploadModal = false
    },
    
    closeTemporalUploadModal() {
      this.showTemporalUploadModal = false
      this.editingTemporalData = null
    },

    closeImageRecordModal() {
      this.showImageRecordModal = false
      this.selectedChildProjectForImageRecord = null
    },
    
    // 處理時序資料編輯
    onEditTemporalData(temporalData) {
      console.log('編輯時序資料:', temporalData)
      this.editingTemporalData = temporalData
      this.showTemporalUploadModal = true
    },
    
    async handleTemporalUploadSuccess(data) {
      console.log('時序資料上傳成功:', data)
      
      // 關閉模態框
      this.closeTemporalUploadModal()
      
      // 重新載入時序資料列表
      await this.loadTemporalData()
      
      this.showAlert({
        type: 'success',
        title: '上傳成功',
        message: `時序資料 "${data.name}" 已成功上傳`
      })
    },
    
    async handleTemporalUpdateSuccess(data) {
      console.log('時序資料更新成功:', data)
      
      // 關閉模態框
      this.closeTemporalUploadModal()
      
      // 重新載入時序資料列表
      await this.loadTemporalData()
      
      this.showAlert({
        type: 'success',
        title: '更新成功',
        message: `時序資料已成功更新`
      })
    },
    
    async loadTemporalData() {
      try {
        const response = await this.$api.get(`/temporal-data-enhanced/${this.project.projectId}/list`)
        console.log('時序資料 API 響應:', response)
        if (response.success) {
          this.temporalDataList = response.data
          console.log('時序資料載入成功:', this.temporalDataList.length, '筆')
          
          // 只有在有地圖的情況下才創建標記
          if (this.map) {
            console.log('地圖已準備好，創建時序資料標記')
            this.createTemporalDataMarkers()
          } else {
            console.log('地圖尚未準備好，等待地圖準備完成')
          }
        } else {
          console.error('時序資料 API 返回失敗:', response)
        }
      } catch (error) {
        console.error('載入時序資料失敗:', error)
      }
    },
    
    // 為所有時序資料創建地圖標記
    createTemporalDataMarkers() {
      console.log('=== 開始創建時序資料標記 ===')
      console.log('地圖物件:', !!this.map)
      console.log('時序資料列表:', this.temporalDataList)
      console.log('時序資料數量:', this.temporalDataList?.length || 0)
      
      if (!this.map || !this.temporalDataList) {
        console.log('地圖或時序資料列表不存在，跳過創建標記')
        return
      }
      
      // 清除現有的時序資料標記
      this.clearTemporalDataMarkers()
      
      // 為每個時序資料創建標記
      this.temporalDataList.forEach((temporalData, index) => {
        console.log(`處理時序資料 ${index + 1}:`, {
          name: temporalData.name,
          longitude: temporalData.longitude,
          latitude: temporalData.latitude
        })
        
        if (temporalData.longitude && temporalData.latitude) {
          this.createTemporalDataMarker(temporalData)
        } else {
          console.log('時序資料缺少座標資訊，跳過:', temporalData.name)
        }
      })
      
      console.log('=== 時序資料標記創建完成 ===')
    },
    
    // 清除所有時序資料標記
    clearTemporalDataMarkers() {
      if (this.temporalDataMarkers) {
        this.temporalDataMarkers.forEach(marker => {
          if (this.map) {
            this.map.removeLayer(marker)
          }
        })
        this.temporalDataMarkers = []
      }
    },
    
    // 為單個時序資料創建標記
    createTemporalDataMarker(temporalData) {
      console.log('創建時序資料標記:', temporalData.name)
      
      if (!this.map) {
        console.log('地圖不存在，無法創建標記')
        return
      }
      
      // 創建自定義圖標 - 白底紅框正方形
      const icon = L.divIcon({
        className: 'custom-temporal-marker',
        html: '<div style="width: 16px; height: 16px; border: 3px solid #ef4444; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      })
      
      const marker = L.marker([parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)], {
        icon,
        zIndexOffset: 1000
      })
      
      console.log('創建標記，座標:', [parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)])
      
      // 預設隱藏標記
      marker.setOpacity(0)
      
      // 添加到地圖（但不可見）
      marker.addTo(this.map)
      
      console.log('標記已添加到地圖（預設隱藏）')
      
      // 添加點擊事件，直接顯示圖表（不顯示 popup）
      marker.on('click', () => {
        console.log('標記被點擊:', temporalData.name)
        this.showTemporalChart(temporalData.temporal_id)
      })
      
      // 將標記添加到陣列中
      if (!this.temporalDataMarkers) {
        this.temporalDataMarkers = []
      }
      this.temporalDataMarkers.push(marker)
      
      console.log('時序資料標記創建成功:', temporalData.name, '座標:', [parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)])
      console.log('標記已創建（預設隱藏）')
    },
    
    // 獲取時序資料類型顏色
    getTemporalTypeColor(dataType) {
      const colors = {
        'csv': '#3b82f6',
        'insar': '#10b981',
        'gnss': '#f59e0b',
        'rainfall': '#06b6d4',
        'earthquake': '#ef4444',
        'shapefile': '#8b5cf6'
      }
      return colors[dataType] || '#6b7280'
    },
    
    // 獲取時序資料類型標籤
    getTemporalTypeLabel(dataType) {
      const labels = {
        'csv': 'CSV',
        'insar': 'InSAR',
        'gnss': 'GNSS',
        'rainfall': '雨量',
        'earthquake': '地震',
        'shapefile': 'Shapefile'
      }
      return labels[dataType] || '未知'
    },
    
    async handleUploadSuccess() {
      // 重新載入所有資料
      await this.loadUploadedData()
      
      // 如果是編輯模式，重新載入對應的 GeoJSON 圖層資料
      if (this.editingData && this.editingData.file_id) {
        try {
          const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson?fileId=${this.editingData.file_id}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            // 更新已載入的圖層資料
            this.loadedGeojsonLayers[this.editingData.file_id] = result.data
            
            // 如果這是當前激活的圖層，也要更新 geojsonData
            if (this.activeGeojsonLayer === this.editingData.file_id) {
              this.geojsonData = result.data
            }
            
            console.log('已更新圖層資料:', result.data.file_name)
          }
        } catch (error) {
          console.error('重新載入圖層資料失敗:', error)
        }
      }
      
      // 清理編輯狀態
      this.editingData = null
      this.isEditMode = false
      
      // 如果是底圖上傳成功，通知側邊欄刷新底圖列表
      if (this.showBaseMapUploadModal) {
        this.$refs.projectSidebar?.refreshBaseMaps?.()
      }
      
      this.showAlert({
        type: 'success',
        title: '更新成功',
        message: '資料已成功更新'
      })
    },

    // 處理顏色變更事件
    handleColorChanged({ fileId, newColor }) {
      console.log('ProjectDetail: 處理顏色變更', fileId, newColor)
      
      // 通知地圖組件更新圖層顏色
      this.$refs.projectMap.updateLayerColor(fileId, newColor)
    },
    
    // 資料管理方法
    async loadGeoJSONLayers() {
      try {
        if (!this.project?.projectId) {
          console.log('沒有專案 ID，跳過載入 GeoJSON 圖層')
          return
        }

        // 載入所有可用的 GeoJSON 圖層列表
        const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson-list`)
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          this.geojsonLayers = result.data
          console.log('找到 GeoJSON 圖層:', this.geojsonLayers.length, '個')
          
          // 載入所有圖層數據
          await this.loadAllGeojsonLayers()
          
          // 設置第一個圖層作為默認激活圖層
          if (this.geojsonLayers.length > 0) {
            this.activeGeojsonLayer = this.geojsonLayers[0].file_id
            this.geojsonData = this.loadedGeojsonLayers[this.activeGeojsonLayer]
            await this.initAvailableFeatures()
          }
        } else {
          console.log('沒有找到 GeoJSON 圖層:', result.message)
          this.geojsonLayers = []
          this.geojsonData = null
        }
      } catch (error) {
        console.error('載入 GeoJSON 圖層失敗:', error)
        this.geojsonLayers = []
        this.geojsonData = null
      }
    },

    async loadSpecificGeoJSONLayer(fileId) {
      try {
        // 檢查圖層類型
        const layerInfo = this.geojsonLayers.find(layer => layer.file_id === fileId)

        const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson?fileId=${fileId}`)
        const result = await response.json()

        if (result.success && result.data) {
          this.geojsonData = result.data
          this.loadedGeojsonLayers[fileId] = result.data
          this.activeGeojsonLayer = fileId
          console.log('載入 GeoJSON 圖層:', result.data.file_name)
          await this.initAvailableFeatures()
        } else {
          console.log('載入特定 GeoJSON 圖層失敗:', result.message)
        }
      } catch (error) {
        console.error('載入特定 GeoJSON 圖層失敗:', error)
      }
    },

    async loadAllGeojsonLayers() {
      const loadPromises = this.geojsonLayers.map(async (layer) => {
        try {
          const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson?fileId=${layer.file_id}`)
          const result = await response.json()

          if (result.success && result.data) {
            this.loadedGeojsonLayers[layer.file_id] = result.data
            console.log('載入圖層:', result.data.file_name, '成功')
          } else {
            console.log('載入圖層失敗:', layer.file_name, result.message)
          }
        } catch (error) {
          console.error('載入圖層錯誤:', layer.file_name, error)
        }
      })

      await Promise.all(loadPromises)
      console.log('所有圖層載入完成:', Object.keys(this.loadedGeojsonLayers))
      
      // 初始化圖層可見性（通知父組件設置為隱藏狀態）
      Object.keys(this.loadedGeojsonLayers).forEach(fileId => {
        if (this.layerVisibility[fileId] === undefined) {
          this.$emit('update-layer-visibility', this.project.projectId, fileId, false)
        }
      })
    },

    async switchGeoJSONLayer(fileId) {
      if (this.activeGeojsonLayer === fileId) {
        return // 已經是當前激活的圖層
      }
      
      if (this.loadedGeojsonLayers[fileId]) {
        // 圖層已經載入，直接切換
        this.activeGeojsonLayer = fileId
        this.geojsonData = this.loadedGeojsonLayers[fileId]
        await this.initAvailableFeatures()
      } else {
        // 圖層未載入，先載入再切換
        await this.loadSpecificGeoJSONLayer(fileId)
      }
    },

    async toggleGeojsonLayerVisibility(fileId) {
      console.log('切換圖層可見性:', fileId, '當前狀態:', this.layerVisibility[fileId])
      console.log('完整的 layerVisibility:', this.layerVisibility)
      
      // 切換圖層的可見性
      let newVisible
      if (this.layerVisibility[fileId] === undefined) {
        // 如果未定義，默認為隱藏狀態（false），點擊後切換為顯示（true）
        newVisible = true
      } else {
        newVisible = !this.layerVisibility[fileId]
      }
      
      console.log('新狀態:', newVisible)
      
      // 通知父組件更新狀態
      this.$emit('update-layer-visibility', this.project.projectId, fileId, newVisible)
      
      // 如果圖層數據不存在，先載入
      if (!this.loadedGeojsonLayers[fileId]) {
        try {
          const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson?fileId=${fileId}`)
          const result = await response.json()
          
          if (result.success && result.data) {
            this.loadedGeojsonLayers[fileId] = result.data
            console.log('載入圖層數據:', result.data.file_name)
            
            // 等待下一個 tick 確保數據已經設置
            await this.$nextTick()
          }
        } catch (error) {
          console.error('載入圖層數據失敗:', error)
        }
      }
      
      // 通知地圖組件更新圖層顯示
      if (this.$refs.projectMap) {
        // 等待下一個 tick 確保數據已經更新
        await this.$nextTick()
        this.$refs.projectMap.updateLayerVisibility(fileId, newVisible)
      }
    },
    
    async loadUploadedData() {
      try {
        if (!this.project?.projectId) {
          console.log('沒有專案 ID，跳過載入已上傳資料')
          return
        }

        const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}`)
        const result = await response.json()

        if (result.success) {
          this.uploadedData = result.data
          
          // 初始化圖層可見性（通知父組件設置為隱藏狀態）
          this.uploadedData.forEach(data => {
            if (this.layerVisibility[data.file_id] === undefined) {
              this.$emit('update-layer-visibility', this.project.projectId, data.file_id, false)
            }
          })
        } else {
          console.log('載入已上傳資料失敗:', result.message)
          this.uploadedData = []
        }
      } catch (error) {
        console.error('載入已上傳資料失敗:', error)
        this.uploadedData = []
      }
    },
    
    // 初始化 features 列表
    async initAvailableFeatures() {
      if (this.geojsonData && this.geojsonData.geojson && this.geojsonData.geojson.features) {
        this.availableFeatures = this.geojsonData.geojson.features.map(feature => {
          // 支持多種 feature ID 格式
          const featureId = feature.properties.Id || feature.properties.ProfileId || feature.properties.ID || feature.properties.fid
          return {
            id: featureId,
            name: featureId,
            description: feature.properties.Description || '無描述',
            properties: feature.properties
          }
        })
        
        console.log('初始化 features:', this.availableFeatures.map(f => ({ id: f.id, name: f.name })))
        
        // 初始化每個 feature 的上傳表單
        this.availableFeatures.forEach(feature => {
          if (feature.id) { // 確保 feature ID 存在
            this.featureUploadForms[feature.id] = {
              name: '',
              description: '',
              file: null
            }
            this.featureUploads[feature.id] = []
            this.featureExpanded[feature.id] = true
          } else {
            console.warn('Feature 沒有有效的 ID:', feature)
          }
        })
        
        // 載入所有 feature 的上傳資料（延遲載入，避免初始載入時資源耗盡）
        // 注意：這裡可以考慮延遲載入，只在用戶實際需要時才載入
        // await this.loadAllFeatureUploads()
        
        // 載入完成後，如果有資料的 feature 就收縮
        this.availableFeatures.forEach(feature => {
          if (this.featureUploads[feature.id] && this.featureUploads[feature.id].length > 0) {
            this.featureExpanded[feature.id] = false
          }
        })
      }
    },
    
    // 載入所有 feature 的上傳資料（分批處理，避免資源耗盡）
    async loadAllFeatureUploads() {
      if (!this.geojsonData || !this.geojsonData.file_id) {
        console.log('沒有 GeoJSON 資料或 file_id，跳過載入 feature 上傳資料')
        return
      }

      const features = this.availableFeatures.filter(feature => feature.id)
      const batchSize = 5 // 每批處理 5 個請求
      const totalBatches = Math.ceil(features.length / batchSize)
      
      console.log(`開始分批載入 ${features.length} 個 features 的上傳資料，分 ${totalBatches} 批處理`)

      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize
        const endIndex = Math.min(startIndex + batchSize, features.length)
        const batch = features.slice(startIndex, endIndex)
        
        console.log(`載入第 ${i + 1}/${totalBatches} 批，features ${startIndex + 1}-${endIndex}`)
        
        const batchPromises = batch.map(async (feature) => {
          try {
            const response = await fetch(`http://localhost:3001/api/data/feature/${this.geojsonData.file_id}/${feature.id}`)
            const result = await response.json()
            
            if (result.success && result.data) {
              this.featureUploads[feature.id] = result.data
            } else {
              this.featureUploads[feature.id] = []
            }
          } catch (error) {
            console.error(`載入 Feature ${feature.id} 上傳資料錯誤:`, error)
            this.featureUploads[feature.id] = []
          }
        })

        await Promise.all(batchPromises)
        
        // 批次間添加小延遲，避免過度負載
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log('所有 features 上傳資料載入完成')
    },
    
    // 資料操作方法
    async locateData(data) {
      // 檢查是否為 GeoJSON 或 KML 檔案
      if (data.file_extension === '.geojson' || data.file_extension === '.kml') {
        if (this.$refs.projectMap) {
          try {
            console.log('=== 定位開始 ===')
            console.log('定位的圖層:', data.file_name, data.file_id)
            console.log('當前 WMS 圖層狀態:', this.$refs.projectMap.wmsLayerActive)
            console.log('當前 WMS 圖層數量:', Object.keys(this.$refs.projectMap.geologicalLayers || {}).length)
            
            // 檢查是否為潛勢分析類型
            const isPotentialAnalysis = data.metadata?.data_type === 'potential_analysis'
            
            // 查找對應的圖層
            const layer = this.$refs.projectMap.geojsonLayers[data.file_id]
            if (layer) {
              // 確保圖層是可見的（如果它應該顯示）
              // 對於剖面類圖層，如果 layerVisibility 中沒有記錄，默認應該是隱藏的
              let isVisible = this.layerVisibility[data.file_id]
              if (isVisible === undefined) {
                // 如果沒有記錄，所有圖層默認隱藏
                isVisible = false
                console.log('圖層默認隱藏:', data.file_name)
              }
              
              if (isVisible && !this.$refs.projectMap.map.hasLayer(layer)) {
                console.log('定位時自動顯示圖層:', data.file_name, '可見性:', isVisible)
                layer.addTo(this.$refs.projectMap.map)
              }
              
              // 定位到圖層範圍
              try {
                // 優先使用資料庫中的邊界框（如果可用）
                const layerData = this.loadedGeojsonLayers[data.file_id]
                if (layerData && layerData.bbox) {
                  console.log('使用資料庫邊界框進行定位:', layerData.bbox)
                  
                  // 檢查邊界框是否有效
                  if (layerData.bbox.minX && layerData.bbox.minY && layerData.bbox.maxX && layerData.bbox.maxY) {
                    // 創建 Leaflet 邊界框
                    const bounds = L.latLngBounds(
                      [layerData.bbox.minY, layerData.bbox.minX], // 西南角 [lat, lng]
                      [layerData.bbox.maxY, layerData.bbox.maxX]  // 東北角 [lat, lng]
                    )
                    
                    console.log('資料庫邊界框:', bounds)
                    this.$refs.projectMap.fitBounds(bounds, {
                      padding: [20, 20]
                    })
                  } else {
                    throw new Error('資料庫邊界框無效')
                  }
                } else {
                  // 回退到使用 Leaflet 的 getBounds()
                  console.log('使用 Leaflet getBounds() 進行定位')
                const bounds = layer.getBounds()
                if (bounds && bounds.isValid && bounds.isValid()) {
                    console.log('Leaflet 邊界框:', bounds)
                  this.$refs.projectMap.fitBounds(bounds, {
                    padding: [20, 20]
                  })
                } else {
                    throw new Error('Leaflet 邊界框無效')
                  }
                }
              } catch (error) {
                console.log('使用定位方法失敗，嘗試其他定位方法:', error)
                // 對於 KML 圖層，可能需要特殊處理
                if (data.file_extension === '.kml') {
                  // 嘗試從圖層數據中獲取邊界
                  const layerData = this.loadedGeojsonLayers[data.file_id]
                  if (layerData && layerData.kml) {
                    // 解析 KML 內容獲取邊界
                    this.locateKMLBounds(layerData.kml, data.file_name)
                    return
                  }
                }
                throw error
              }
              
              // 潛勢分析圖層使用更簡潔的成功訊息
              const message = isPotentialAnalysis 
                ? `已定位到 ${data.file_name} 圖層範圍`
                : `已定位到 ${data.file_name} 的資料範圍`
                
              // 定位成功後強制恢復地質圖層
              if (this.$refs.projectMap && this.$refs.projectMap.forceRestoreWMSLayers) {
                console.log('定位成功，準備恢復 WMS 圖層')
                // 延遲一點時間確保地圖視圖已經穩定
                setTimeout(() => {
                  console.log('開始強制恢復 WMS 圖層')
                  this.$refs.projectMap.forceRestoreWMSLayers()
                  console.log('WMS 圖層恢復完成')
                }, 500)
              }
              
              this.showAlert({
                type: 'success',
                title: '定位成功',
                message: message
              })
            } else {
              // 如果圖層未載入，先載入再定位
              await this.loadSpecificGeoJSONLayer(data.file_id)
              
              // 等待圖層渲染完成
              await this.$nextTick()
              
              // 等待一小段時間讓 ProjectMap 完成圖層渲染
              await new Promise(resolve => setTimeout(resolve, 500))
              
              const newLayer = this.$refs.projectMap.geojsonLayers[data.file_id]
              if (newLayer) {
                // 確保新載入的圖層是可見的（如果它應該顯示）
                // 對於剖面類圖層，如果 layerVisibility 中沒有記錄，默認應該是隱藏的
                let isVisible = this.layerVisibility[data.file_id]
                if (isVisible === undefined) {
                  // 如果沒有記錄，所有圖層默認隱藏
                  isVisible = false
                  console.log('新載入的圖層默認隱藏:', data.file_name)
                }
                
                if (isVisible && !this.$refs.projectMap.map.hasLayer(newLayer)) {
                  console.log('定位時自動顯示新載入的圖層:', data.file_name, '可見性:', isVisible)
                  newLayer.addTo(this.$refs.projectMap.map)
                }
                
                // 優先使用後端轉換的 bbox，回退到 getBounds()
                try {
                  // 優先使用資料庫中的邊界框（如果可用）
                  const layerData = this.loadedGeojsonLayers[data.file_id]
                  if (layerData && layerData.bbox) {
                    console.log('使用後端轉換的邊界框進行定位:', layerData.bbox)
                    
                    // 檢查邊界框是否有效
                    if (layerData.bbox.minX && layerData.bbox.minY && layerData.bbox.maxX && layerData.bbox.maxY) {
                      // 創建 Leaflet 邊界框
                      const bounds = L.latLngBounds(
                        [layerData.bbox.minY, layerData.bbox.minX], // 西南角 [lat, lng]
                        [layerData.bbox.maxY, layerData.bbox.maxX]  // 東北角 [lat, lng]
                      )
                      
                      console.log('後端轉換的邊界框:', bounds)
                      this.$refs.projectMap.fitBounds(bounds, {
                        padding: [20, 20]
                      })
                    } else {
                      throw new Error('後端邊界框無效')
                    }
                  } else {
                    // 回退到使用 Leaflet 的 getBounds()
                    console.log('回退到使用 Leaflet getBounds() 進行定位')
                  const bounds = newLayer.getBounds()
                  if (bounds && bounds.isValid && bounds.isValid()) {
                      console.log('Leaflet 邊界框:', bounds)
                    this.$refs.projectMap.fitBounds(bounds, {
                      padding: [20, 20]
                    })
                  } else {
                      throw new Error('Leaflet 邊界框無效')
                    }
                  }
                } catch (error) {
                  console.log('定位失敗:', error)
                  throw error
                }
                
                const message = isPotentialAnalysis 
                  ? `已定位到 ${data.file_name} 圖層範圍`
                  : `已定位到 ${data.file_name} 的資料範圍`
                  
                // 定位成功後強制恢復地質圖層
                if (this.$refs.projectMap && this.$refs.projectMap.forceRestoreWMSLayers) {
                  console.log('定位成功（載入後），準備恢復 WMS 圖層')
                  // 延遲一點時間確保地圖視圖已經穩定
                  setTimeout(() => {
                    console.log('開始強制恢復 WMS 圖層（載入後）')
                    this.$refs.projectMap.forceRestoreWMSLayers()
                    console.log('WMS 圖層恢復完成（載入後）')
                  }, 500)
                }
                
                this.showAlert({
                  type: 'success',
                  title: '定位成功',
                  message: message
                })
              } else {
                throw new Error('圖層載入失敗')
              }
            }
          } catch (error) {
            console.error('定位失敗:', error)
            this.showAlert({
              type: 'error',
              title: '定位失敗',
              message: '無法定位到資料範圍'
            })
          }
        } else {
          this.showAlert({
            type: 'warning',
            title: '無法定位',
            message: '地圖尚未載入'
          })
        }
      } else {
        this.showAlert({
          type: 'warning',
          title: '無法定位',
          message: '此檔案類型不支援地圖定位功能'
        })
      }
    },
    
    // 定位 KML 圖層的邊界
    locateKMLBounds(kmlContent, fileName) {
      try {
        // 解析 KML 內容獲取座標
        const parser = new DOMParser()
        const kmlDoc = parser.parseFromString(kmlContent, 'text/xml')
        const coordinates = []
        
        // 查找所有座標
        const coordElements = kmlDoc.querySelectorAll('coordinates')
        coordElements.forEach(coord => {
          const coordText = coord.textContent.trim()
          const coordPairs = coordText.split(/\s+/)
          coordPairs.forEach(pair => {
            const [lng, lat] = pair.split(',').map(Number)
            if (!isNaN(lng) && !isNaN(lat)) {
              coordinates.push([lat, lng])
            }
          })
        })
        
        if (coordinates.length > 0) {
          // 計算邊界
          let minLat = coordinates[0][0]
          let maxLat = coordinates[0][0]
          let minLng = coordinates[0][1]
          let maxLng = coordinates[0][1]
          
          coordinates.forEach(([lat, lng]) => {
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
          })
          
          // 創建邊界並定位
          const bounds = [[minLat, minLng], [maxLat, maxLng]]
          this.$refs.projectMap.fitBounds(bounds, {
            padding: [20, 20]
          })
          
          // 定位成功後強制恢復地質圖層
          if (this.$refs.projectMap && this.$refs.projectMap.forceRestoreWMSLayers) {
            console.log('KML 定位成功，準備恢復 WMS 圖層')
            // 延遲一點時間確保地圖視圖已經穩定
            setTimeout(() => {
              console.log('開始強制恢復 WMS 圖層（KML）')
              this.$refs.projectMap.forceRestoreWMSLayers()
              console.log('WMS 圖層恢復完成（KML）')
            }, 500)
          }
          
          this.showAlert({
            type: 'success',
            title: '定位成功',
            message: `已定位到 ${fileName} 的資料範圍`
          })
        } else {
          throw new Error('無法從 KML 中提取座標')
        }
      } catch (error) {
        console.error('KML 定位失敗:', error)
        this.showAlert({
          type: 'error',
          title: '定位失敗',
          message: '無法解析 KML 檔案進行定位'
        })
      }
    },
    
    async associateData(data) {
      // 檢查是否為潛勢分析圖層
      const isOriginalPotentialAnalysis = data.metadata?.data_type === 'potential_analysis'
      const isSnapshotPotentialAnalysis = data.metadata?.data_type === 'potential_analysis_snapshot'
      
      this.associateTargetData = data
      
      // 如果是原始潛勢分析圖層，創建一個虛擬的 feature 來處理關聯上傳
      if (isOriginalPotentialAnalysis) {
        // 為原始潛勢分析圖層創建一個整體的 feature
        this.availableFeatures = [{
          id: 'potential_analysis_overall',
          properties: {
            Id: 'potential_analysis_overall',
            Description: '潛勢分析圖層整體'
          }
        }]
        
        // 初始化原始潛勢分析圖層的上傳表單
        this.featureUploadForms['potential_analysis_overall'] = {
          name: '',
          description: '',
          date: '',
          file: null
        }
        
        // 初始化原始潛勢分析圖層的上傳資料
        this.featureUploads['potential_analysis_overall'] = []
        
        // 載入原始潛勢分析圖層的上傳資料
        await this.loadFeatureUploads('potential_analysis_overall')
      } else if (isSnapshotPotentialAnalysis) {
        // 為快照圖層創建一個整體的 feature
        this.availableFeatures = [{
          id: 'snapshot_overall',
          properties: {
            Id: 'snapshot_overall',
            Description: '快照圖層整體'
          }
        }]
        
        // 初始化快照圖層的上傳表單
        this.featureUploadForms['snapshot_overall'] = {
          name: '',
          description: '',
          date: '',
          file: null
        }
        
        // 初始化快照圖層的上傳資料
        this.featureUploads['snapshot_overall'] = []
        
        // 載入快照圖層的上傳資料
        await this.loadFeatureUploads('snapshot_overall')
      } else {
        // 一般圖層的處理邏輯
        // 載入所有 features 的上傳資料（使用分批處理）
        if (this.availableFeatures.length > 0) {
          await this.loadAllFeatureUploads()
        }
      }
    },
    
    async loadFeatureUploads(featureId, fileId = null) {
      try {
        // 使用傳入的 fileId 或從 associateTargetData 獲取
        const targetFileId = fileId || this.associateTargetData?.file_id
        
        if (!targetFileId) {
          console.error(`載入 ${featureId} 上傳資料失敗: 沒有 fileId`)
          return
        }
        
        console.log(`載入 Feature ${featureId} 上傳資料，使用 fileId: ${targetFileId}`)
        
        const response = await fetch(`http://localhost:3001/api/data/feature/${targetFileId}/${featureId}`)
        const result = await response.json()

        console.log(`Feature ${featureId} 載入結果:`, result)

        if (result.success) {
          this.featureUploads[featureId] = result.data
          console.log(`Feature ${featureId} 上傳資料載入成功，共 ${result.data.length} 筆`)
        } else {
          console.log(`Feature ${featureId} 沒有上傳資料`)
          this.featureUploads[featureId] = []
        }
      } catch (error) {
        console.error(`載入 ${featureId} 上傳資料失敗:`, error)
        this.featureUploads[featureId] = []
      }
    },
    
    async editData(data) {
      try {
        // 設置編輯模式
        this.editingData = data
        this.isEditMode = true
        
        // 打開上傳模態框
        this.showLayerUploadModal = true
        
        console.log('編輯資料:', data)
      } catch (error) {
        this.showAlert({
          type: 'error',
          title: '編輯失敗',
          message: '無法開啟編輯模式，請稍後再試'
        })
      }
    },
    
    async deleteData(data) {
      try {
        const confirmed = await this.showAlert({
          type: 'warning',
          title: '確認刪除',
          message: '確定要刪除此資料嗎？此操作無法復原。',
          showCancelButton: true,
          confirmText: '刪除',
          cancelText: '取消'
        })

        if (!confirmed) {
          return
        }

        const response = await fetch(`http://localhost:3001/api/data/${data.file_id}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          // 從已載入的圖層中移除
          if (this.loadedGeojsonLayers[data.file_id]) {
            delete this.loadedGeojsonLayers[data.file_id]
          }
          
          // 從地圖上移除圖層
          if (this.$refs.projectMap?.geojsonLayers[data.file_id]) {
            this.$refs.projectMap.removeLayer(this.$refs.projectMap.geojsonLayers[data.file_id])
            delete this.$refs.projectMap.geojsonLayers[data.file_id]
          }
          
          // 重新載入資料
          await this.loadUploadedData()
          
          this.showAlert({
            type: 'success',
            title: '刪除成功',
            message: '資料已刪除'
          })
        } else {
          throw new Error(result.message || '刪除失敗')
        }
      } catch (error) {
        this.showAlert({
          type: 'error',
          title: '刪除失敗',
          message: error.message || '無法刪除資料，請稍後再試'
        })
      }
    },
    
    
    // 外部圖層控制
    toggleExternalLayer(layerType) {
      // 外部圖層切換邏輯
      console.log('切換外部圖層:', layerType)
    },
    
    // 時序圖層控制
    toggleTemporalLayer(layerType) {
      // 時序圖層切換邏輯
      console.log('切換時序圖層:', layerType)
      this.showAlert({
        type: 'info',
        title: '時序圖層',
        message: `切換時序圖層: ${layerType}`
      })
    },
    
    // 地質圖層控制
    toggleGeologicalMap(data) {
      console.log('地質圖層切換:', data)
      
      // 通知地圖組件切換地質圖層
      this.$refs.projectMap?.toggleGeologicalLayer(data)
    },
    
    // 潛勢評估相關方法
    async openAnalysis(data) {
      this.potentialAnalysisData = data
      this.showAnalysisModal = true
      
      // 載入 GeoJSON 數據並分析數值
      await this.analyzePotentialData(data)
    },
    
    async analyzePotentialData(data) {
      try {
        const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/geojson`)
        const result = await response.json()
        
        if (result.success && result.data) {
          const geojsonData = result.data.geojson
          
          // 分析數值欄位
          const analysis = this.analyzeNumericFields(geojsonData)
          
          // 設置分析配置
          this.analysisConfig.numericFields = analysis.numericFields
          this.analysisConfig.valueField = analysis.numericFields[0] || ''
          this.analysisConfig.intervals = this.generateDefaultIntervals(analysis)
        }
      } catch (error) {
        console.error('分析潛勢數據失敗:', error)
        this.showAlert({
          type: 'error',
          title: '分析失敗',
          message: '無法載入潛勢評估數據，請稍後再試。'
        })
      }
    },
    
    analyzeNumericFields(geojsonData) {
      if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        return { numericFields: [], statistics: {} }
      }
      
      const numericFields = []
      const statistics = {}
      
      const numericFieldPatterns = [
        /elev/i, /height/i, /altitude/i, /z/i,
        /value/i, /val/i, /num/i, /count/i,
        /measure/i, /measurement/i, /depth/i, /distance/i,
        /mean/i, /avg/i, /sum/i, /total/i,
        /risk/i, /hazard/i, /potential/i, /probability/i,
        /displacement/i, /deformation/i, /strain/i, /stress/i,
        /area/i, /length/i, /width/i, /volume/i, /weight/i, /density/i
      ]
      
      const firstFeature = geojsonData.features[0]
      if (firstFeature.properties) {
        for (const [key, value] of Object.entries(firstFeature.properties)) {
          if (typeof value === 'number' && !isNaN(value)) {
            const isNumericField = numericFieldPatterns.some(pattern => pattern.test(key)) ||
                                 (!/^id$/i.test(key) && !/^fid$/i.test(key) && !/^gid$/i.test(key))
            
            if (isNumericField) {
              numericFields.push(key)
              statistics[key] = {
                min: value,
                max: value,
                values: [value]
              }
            }
          }
        }
      }
      
      // 計算所有 features 的統計數據
      geojsonData.features.forEach(feature => {
        if (feature.properties) {
          numericFields.forEach(field => {
            const value = feature.properties[field]
            if (typeof value === 'number' && !isNaN(value)) {
              statistics[field].values.push(value)
              statistics[field].min = Math.min(statistics[field].min, value)
              statistics[field].max = Math.max(statistics[field].max, value)
            }
          })
        }
      })
      
      // 計算平均值和標準差
      numericFields.forEach(field => {
        const values = statistics[field].values
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        const stdDev = Math.sqrt(variance)
        
        statistics[field].mean = mean
        statistics[field].stdDev = stdDev
        statistics[field].count = values.length
      })
      
      return { numericFields, statistics }
    },
    
    generateDefaultIntervals(analysis) {
      if (!analysis.numericFields.length) return []
      
      const field = analysis.numericFields[0]
      const stats = analysis.statistics[field]
      const intervals = []
      
      const min = stats.min
      const max = stats.max
      const range = max - min
      const intervalSize = range / 5
      
      const colors = ['#ff6b6b', '#ffa726', '#ffeb3b', '#66bb6a', '#42a5f5']
      
      for (let i = 0; i < 5; i++) {
        const intervalMin = min + (i * intervalSize)
        const intervalMax = min + ((i + 1) * intervalSize)
        
        intervals.push({
          min: intervalMin,
          max: intervalMax,
          color: colors[i],
          label: `區間 ${i + 1}`
        })
      }
      
      return intervals
    },
    
    getNumericFields() {
      return this.analysisConfig.numericFields || []
    },
    
    closeAnalysisModal() {
      this.showAnalysisModal = false
      this.potentialAnalysisData = null
      this.analysisConfig = {
        numericFields: [],
        valueField: '',
        intervals: [],
        colorScheme: 'blue-red'
      }
    },
    
    async applyAnalysis() {
      try {
        console.log('應用潛勢評估分析:', this.analysisConfig)
        
        // 這裡可以添加實際的分析邏輯
        // 例如：渲染潛勢評估圖層
        
        this.showAlert({
          type: 'success',
          title: '分析完成',
          message: '潛勢評估分析已應用'
        })
        
        this.closeAnalysisModal()
      } catch (error) {
        console.error('應用分析失敗:', error)
        this.showAlert({
          type: 'error',
          title: '分析失敗',
          message: '無法應用潛勢評估分析'
        })
      }
    },
    
    // Feature 上傳相關方法
    handleFeatureFileSelect(featureId, event) {
      const file = event.target.files[0]
      if (file) {
        this.featureUploadForms[featureId].file = file
      }
    },
    
    async handleFeatureUpload(feature) {
      try {
        const form = this.featureUploadForms[feature.id]
        if (!form.name || !form.file) {
          this.showAlert({
            type: 'warning',
            title: '表單不完整',
            message: '請填寫上傳名稱並選擇檔案'
          })
          return
        }

        const formData = new FormData()
        formData.append('upload_name', form.name)
        formData.append('upload_description', form.description)
        formData.append('file', form.file)
        formData.append('data_files_id', this.associateTargetData.file_id)
        formData.append('feature_id', feature.id)

        const response = await fetch('http://localhost:3001/api/data/feature/upload', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          this.showAlert({
            type: 'success',
            title: '上傳成功',
            message: '檔案已成功上傳'
          })
          
          // 重置表單
          this.featureUploadForms[feature.id] = {
            name: '',
            description: '',
            file: null
          }
          
          // 重新載入該 feature 的上傳資料
          await this.loadFeatureUploads(feature.id)
        } else {
          throw new Error(result.message || '上傳失敗')
        }
      } catch (error) {
        this.showAlert({
          type: 'error',
          title: '上傳失敗',
          message: error.message || '無法上傳檔案，請稍後再試'
        })
      }
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

        if (!confirmed) {
          return
        }

        const response = await fetch(`http://localhost:3001/api/data/feature/${uploadId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          this.showAlert({
            type: 'success',
            title: '刪除成功',
            message: '上傳資料已刪除'
          })
          
          // 重新載入該 feature 的上傳資料
          await this.loadFeatureUploads(featureId, this.associateTargetData?.file_id)
        } else {
          throw new Error(result.message || '刪除失敗')
        }
      } catch (error) {
        this.showAlert({
          type: 'error',
          title: '刪除失敗',
          message: error.message || '無法刪除上傳資料，請稍後再試'
        })
      }
    },
    
    toggleFeatureExpanded(featureId) {
      this.featureExpanded[featureId] = !this.featureExpanded[featureId]
    },
    
    // 顯示相關方法
    async showFeatureUploads(featureId, uploads) {
      console.log('顯示 feature 上傳資料:', { featureId, uploads })
      
      // 找到對應的 feature 資料
      const feature = this.availableFeatures.find(f => f.id === featureId)
      if (!feature) {
        console.log('找不到對應的 feature:', featureId)
        return
      }
      
      // 設置關聯目標資料
      this.associateTargetData = {
        file_id: this.geojsonData?.file_id,
        file_name: this.geojsonData?.file_name,
        metadata: this.geojsonData?.metadata
      }
      
      // 確保該 feature 的上傳表單已初始化
      if (!this.featureUploadForms[featureId]) {
        this.featureUploadForms[featureId] = {
          name: '',
          description: '',
          date: '',
          file: null
        }
      }
      
      // 確保該 feature 的展開狀態已設置
      if (this.featureExpanded[featureId] === undefined) {
        this.featureExpanded[featureId] = false // 預設收起來
      }
      
      // 載入該 feature 的關聯上傳資料
      try {
          await this.loadFeatureUploads(featureId, this.associateTargetData.file_id)
        console.log('已載入關聯上傳資料，featureId:', featureId, 'uploads:', this.featureUploads[featureId])
      } catch (error) {
        console.error('載入關聯上傳資料失敗:', error)
        // 如果載入失敗，使用傳入的 uploads 資料
        this.featureUploads[featureId] = uploads || []
      }
    },
    
    showSimpleTooltip(featureId, latlng) {
      console.log('顯示簡單 tooltip:', { featureId, latlng })
      
      // 找到對應的 feature 資料
      const feature = this.availableFeatures.find(f => f.id === featureId)
      if (!feature) {
        console.log('找不到對應的 feature:', featureId)
        return
      }
      
      // 顯示簡單的提示訊息
      this.showAlert({
        type: 'info',
        title: 'Feature 資訊',
        message: `Feature ID: ${featureId}\n描述: ${feature.properties?.Description || '無描述'}\n位置: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
      })
    },

    // 顯示關聯上傳的資料面板（不是上傳視窗）
    showFeatureUploadsPanel(featureId, uploads, fileId) {
      console.log('=== showFeatureUploadsPanel 開始 ===')
      console.log('參數:', { featureId, uploads, fileId })
      console.log('uploads 長度:', uploads?.length || 0)
      console.log('availableFeatures:', this.availableFeatures)
      
      // 找到對應的 feature 資料，如果找不到則創建一個虛擬的 feature
      let feature = this.availableFeatures.find(f => f.id === featureId)
      console.log('找到的 feature:', feature)
      
      if (!feature) {
        // 為特殊圖層創建虛擬 feature
        if (featureId === 'potential_analysis_overall') {
          feature = {
            id: 'potential_analysis_overall',
            properties: {
              Id: 'potential_analysis_overall',
              Description: '潛勢分析圖層整體'
            }
          }
        } else if (featureId === 'snapshot_overall') {
          feature = {
            id: 'snapshot_overall',
            properties: {
              Id: 'snapshot_overall',
              Description: '快照圖層整體'
            }
          }
        } else {
          // 為其他圖層（如剖面觀測圖層 EE）創建虛擬 feature
          feature = {
            id: featureId,
            properties: {
              Id: featureId,
              Description: `Feature ${featureId}`
            }
          }
          console.log('為圖層創建虛擬 feature:', featureId)
        }
      }
      
      // 設置要顯示的資料 - 總是使用最新的 featureUploads 數據
      const latestUploads = this.featureUploads[featureId] || uploads || []
      this.featureDisplayData = {
        featureId: featureId,
        feature: feature,
        uploads: latestUploads,
        fileId: fileId
      }
      
      console.log('設置的 featureDisplayData:', this.featureDisplayData)
      console.log('featureDisplayData.uploads 長度:', this.featureDisplayData.uploads.length)
      console.log('featureUploads[featureId] 長度:', this.featureUploads[featureId]?.length || 0)
      
      // 重置標籤頁狀態
      this.activeTab = 'view'
      
      // 重置上傳表單
      this.resetUploadForm()
      
      // 顯示資料面板模態框
      this.showFeatureDisplayModal = true
      console.log('showFeatureDisplayModal 設置為:', this.showFeatureDisplayModal)
      console.log('=== showFeatureUploadsPanel 結束 ===')
    },

    // 輔助函數：判斷是否為圖片檔案
    isImageFile(upload) {
      if (!upload || !upload.file_extension || !upload.mime_type) {
        return false
      }
      
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp']
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp']
      
      return imageExtensions.includes(upload.file_extension.toLowerCase()) || 
             imageTypes.includes(upload.mime_type)
    },

    // 輔助函數：獲取檔案 URL
    getFileUrl(storagePath) {
      if (!storagePath) {
        return ''
      }
      
      if (storagePath.startsWith('http')) {
        return storagePath
      }
      
      const baseUrl = 'http://localhost:3001'
      return `${baseUrl}/${storagePath}`
    },

    // 輔助函數：獲取檔案類型顯示名稱
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

    // 輔助函數：格式化檔案大小
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    // 關閉資料顯示模態框
    closeFeatureDisplayModal() {
      this.showFeatureDisplayModal = false
      this.featureDisplayData = null
      this.currentImageIndex = 0
    },

    // 幻燈片控制方法
    previousImage() {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--
      } else {
        this.currentImageIndex = this.imageUploads.length - 1
      }
    },

    nextImage() {
      if (this.currentImageIndex < this.imageUploads.length - 1) {
        this.currentImageIndex++
      } else {
        this.currentImageIndex = 0
      }
    },

    // 處理圖片載入錯誤
    handleImageError(event) {
      console.error('圖片載入失敗:', event.target.src)
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
    },
    
    // 底圖選擇相關方法
    onBaseMapSelected(baseMap) {
      console.log('底圖被選擇:', baseMap)
      // 只設置 ID，不觸發 watcher
      this.currentBaseMapId = baseMap.id
    },
    
    onBaseMapChanged(baseMap) {
      console.log('底圖變更:', baseMap)
      // 統一處理底圖變更
      this.currentBaseMap = baseMap
      this.currentBaseMapId = baseMap ? baseMap.id : ''
    },
    
    onBaseMapLocated(baseMap) {
      console.log('定位正射影像:', baseMap)
      
      if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
        this.showAlert({
          type: 'warning',
          title: '無法定位',
          message: '地圖尚未載入，請稍後再試'
        })
        return
      }
      
      // 檢查是否為 COG 文件
      const isCOG = this.$refs.projectMap.baseMapService?.isCOGFile(baseMap.storagePath || baseMap.originalName)
      
      if (isCOG) {
        // 對於 COG 文件，使用 TiTiler 的邊界 API
        this.locateCOGBaseMap(baseMap)
      } else {
        // 對於傳統 TIF 文件，使用計算的邊界
        this.locateTraditionalBaseMap(baseMap)
      }
    },
    
    // 定位 COG 正射影像
    async locateCOGBaseMap(baseMap) {
      try {
        const imageUrl = `http://localhost:3001/${baseMap.storagePath.replace(/^\//, '')}`
        
        // 從 TiTiler 獲取邊界
        const response = await fetch(`http://localhost:8000/cog/bounds?url=${encodeURIComponent(imageUrl)}`)
        const result = await response.json()
        
        if (result.success && result.bounds) {
          const bounds = [
            [result.bounds.minLat, result.bounds.minLon], // 西南角
            [result.bounds.maxLat, result.bounds.maxLon]  // 東北角
          ]
          
          // 調整地圖視圖到邊界
          this.$refs.projectMap.map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 18
          })
          
          this.showAlert({
            type: 'success',
            title: '定位成功',
            message: `已定位到正射影像「${baseMap.name}」的範圍`
          })
        } else {
          throw new Error('無法獲取 COG 文件邊界')
        }
      } catch (error) {
        console.error('COG 定位失敗:', error)
        this.showAlert({
          type: 'error',
          title: '定位失敗',
          message: `無法定位 COG 正射影像: ${error.message}`
        })
      }
    },
    
    // 定位傳統 TIF 正射影像
    async locateTraditionalBaseMap(baseMap) {
      try {
        const imageUrl = `http://localhost:3001/${baseMap.storagePath.replace(/^\//, '')}`
        
        // 使用 BaseMapService 計算邊界
        const boundsArray = await this.$refs.projectMap.baseMapService.calculateTifBounds(
          baseMap.originalName || baseMap.name, 
          imageUrl
        )
        
        const bounds = L.latLngBounds(boundsArray)
        
        // 調整地圖視圖到邊界
        this.$refs.projectMap.map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 18
        })
        
        this.showAlert({
          type: 'success',
          title: '定位成功',
          message: `已定位到正射影像「${baseMap.name}」的範圍`
        })
      } catch (error) {
        console.error('傳統 TIF 定位失敗:', error)
        this.showAlert({
          type: 'error',
          title: '定位失敗',
          message: `無法定位正射影像: ${error.message}`
        })
      }
    },
    
    
    // 載入底圖數據並開始預載入 TIF 檔案
    async loadBaseMapsAndPreloadTif() {
      try {
        if (!this.project?.projectId) {
          console.log('沒有專案 ID，跳過載入底圖數據')
          return
        }

        console.log('開始載入底圖數據...')
        const response = await fetch(`http://localhost:3001/api/data/project/${this.project.projectId}/basemaps`)
        const result = await response.json()
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('底圖數據載入成功:', result.data.length, '個底圖')
          
          // COG 文件不需要預載入，直接使用 TiTiler 服務
        } else {
          console.log('沒有底圖數據或載入失敗')
        }
      } catch (error) {
        console.error('載入底圖數據失敗:', error)
      }
    },
    
    // 載入開始
    onShowLoading(message) {
      console.log('載入開始:', message)
      // 通知 BaseMapSelector 載入完成
      if (this.$refs.projectSidebar?.$refs?.baseMapSelector) {
        // 載入動畫由 BaseMapSelector 自己管理
      }
    },
    
    // 載入結束
    onHideLoading() {
      console.log('載入結束')
      // 通知 BaseMapSelector 載入完成
      if (this.$refs.projectSidebar?.$refs?.baseMapSelector) {
        this.$refs.projectSidebar.$refs.baseMapSelector.onLoadingComplete()
      }
    },
    
    // 地質圖層切換
    toggleGeologicalMap(data) {
      console.log('地質圖層切換:', data)
      this.$refs.projectMap?.toggleGeologicalLayer(data)
    },

    // 省道里程樁號圖層切換（僅顯示/隱藏圖層，不重新加載）
    toggleHighwayMileage() {
      console.log('[ProjectDetail] toggleHighwayMileage 被調用')
      if (!this.mileagePointsLayer) {
        console.log('[ProjectDetail] mileagePointsLayer 不存在，無法切換')
        return
      }
      
      if (this.map) {
        if (this.map.hasLayer(this.mileagePointsLayer)) {
          console.log('[ProjectDetail] 隱藏里程樁號圖層')
          this.map.removeLayer(this.mileagePointsLayer)
        } else {
          console.log('[ProjectDetail] 顯示里程樁號圖層')
          this.map.addLayer(this.mileagePointsLayer)
        }
      }
    },
    
    // 載入里程樁號數據
    async loadMileagePoints() {
      console.log('[ProjectDetail] loadMileagePoints 開始')
      if (!this.map) {
        console.error('[ProjectDetail] 地圖未初始化')
        return
      }
      
      try {
        console.log('[ProjectDetail] 請求 GeoJSON 數據...')
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const geojsonData = await response.json()
        console.log('[ProjectDetail] GeoJSON 數據載入成功，特徵數量:', geojsonData.features?.length)
        
        // 清理舊圖層
        if (this.mileagePointsLayer && this.map.hasLayer(this.mileagePointsLayer)) {
          console.log('[ProjectDetail] 清理舊里程樁號圖層')
          this.map.removeLayer(this.mileagePointsLayer)
        }
        
        // 創建新圖層
        this.mileagePointsLayer = L.geoJSON(geojsonData, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: '#3b82f6',
              color: '#1e40af',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.7
            })
          },
          onEachFeature: (feature, layer) => {
            // 保存 feature 數據到 layer，用於 toggleMileageLabel
            layer.feature = feature
            
            const props = feature.properties || {}
            const mileage = props['里程數'] || '未知'
            const roadNumber = props['公路編'] || '未知'
            const section = props['工務段'] || '未知'
            const county = props['縣市別'] || '未知'
            const township = props['鄉鎮區'] || '未知'
            const village = props['村里'] || '未知'
            
            // 綁定 popup
            const popupContent = `
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #1e40af;">${roadNumber} ${mileage}</div>
                <div style="color: #6b7280;">工務段：${section}</div>
                <div style="color: #6b7280;">縣市：${county}</div>
                <div style="color: #6b7280;">鄉鎮：${township}</div>
                <div style="color: #6b7280;">村里：${village}</div>
              </div>
            `
            layer.bindPopup(popupContent)
          }
        })
        
        // 默認添加到地圖（常駐顯示）
        if (this.highwayMileageVisible) {
          console.log('[ProjectDetail] 添加里程樁號圖層到地圖')
          this.mileagePointsLayer.addTo(this.map)
        }
        
        // 觸發初始的標籤顯示狀態
        this.updateMileageLabel()
        
        console.log('[ProjectDetail] 里程樁號載入完成')
      } catch (error) {
        console.error('[ProjectDetail] 載入里程樁號失敗:', error)
      }
    },
    
    // 切換里程標籤顯示狀態（響應按鈕點擊）
    toggleMileageLabel() {
      console.log('[ProjectDetail] toggleMileageLabel 被調用（按鈕點擊）')
      // ✅ 切換狀態
      this.mileageLabelVisible = !this.mileageLabelVisible
      console.log('[ProjectDetail] 切換里程數字標籤顯示:', this.mileageLabelVisible)
      
      // 更新顯示
      this.updateMileageLabel()
    },
    
    // 更新里程標籤顯示（根據當前狀態和縮放層級）
    updateMileageLabel() {
      console.log('[ProjectDetail] updateMileageLabel 被調用')
      if (!this.mileagePointsLayer || !this.map) {
        console.log('[ProjectDetail] 里程樁號圖層或地圖不存在')
        return
      }
      
      const currentZoom = this.map.getZoom()
      console.log('[ProjectDetail] 當前縮放層級:', currentZoom)
      
      // 根據縮放層級和用戶設置決定是否顯示標籤
      const shouldShowLabel = this.mileageLabelVisible && currentZoom >= 14
      console.log('[ProjectDetail] 是否顯示標籤:', shouldShowLabel, '(mileageLabelVisible:', this.mileageLabelVisible, ', zoom:', currentZoom, ')')
      
      this.mileagePointsLayer.eachLayer((layer) => {
        if (shouldShowLabel && layer.feature && layer.feature.properties) {
          const mileage = layer.feature.properties['里程數'] || '未知'
          const roadNumber = layer.feature.properties['公路編'] || '未知'
          
          if (!layer.getTooltip()) {
            layer.bindTooltip(`${roadNumber} ${mileage}`, {
              permanent: true,
              direction: 'top',
              className: 'mileage-tooltip',
              offset: [0, -5]
            })
            layer.openTooltip()
          }
        } else {
          if (layer.getTooltip()) {
            layer.unbindTooltip()
          }
        }
      })
    },
    
    // 圖層順序變更處理
    onLayerOrderChanged(layerOrder) {
      console.log('圖層順序已更新:', layerOrder)
      // 可以在這裡保存圖層順序到後端或本地存儲
      // 目前只在客戶端維護順序
    },
    
    // 更新圖層 z-index 處理
    onUpdateLayerZIndex(layerOrder) {
      console.log('更新圖層 z-index:', layerOrder)
      // 通知地圖組件更新圖層的 z-index
      if (this.$refs.projectMap) {
        this.$refs.projectMap.updateLayerZIndex(layerOrder)
      }
    },
    
    // 地圖準備好後的回調（已合併到上面的 onMapReady 方法）
    
    // 時序資料相關方法
    onLocateTemporalData(temporalData) {
      console.log('定位時序資料:', temporalData)
      // 如果時序資料有座標信息，定位到該位置
      if (temporalData.longitude && temporalData.latitude) {
        if (this.map) {
          // 只移動地圖到該位置，不影響標記可見性（統一使用縮放層級 18）
          this.map.setView([parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)], 18)
          console.log('地圖已移動到位置:', [parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)])
        }
      } else {
        // 如果沒有座標信息，顯示提示
        this.showAlert('此時序資料沒有座標信息', 'warning')
      }
    },
    
    createTemporalLocationMarker(temporalData) {
      if (!this.map) return
      
      // 創建自定義圖標 - 更大的圓點
      const icon = L.divIcon({
        className: 'temporal-location-icon',
        html: `
          <div class="temporal-location-marker">
            <div class="marker-pulse"></div>
            <div class="marker-dot"></div>
          </div>
        `,
        iconSize: [64, 64],
        iconAnchor: [32, 32],
        popupAnchor: [0, -32]
      })
      
      // 創建標記
      this.temporalLocationMarker = L.marker([parseFloat(temporalData.latitude), parseFloat(temporalData.longitude)], { icon })
        .addTo(this.map)
      
      // 創建彈出視窗
      const popup = L.popup({
        maxWidth: 300,
        className: 'temporal-location-popup'
      })
      
      // 設置彈出視窗內容
      popup.setContent(`
        <div class="temporal-location-popup-content">
          <div class="popup-header">
            <h4 class="popup-title">${temporalData.name}</h4>
            <span class="popup-type" style="background-color: ${this.getTemporalTypeColor(temporalData.data_type)}">
              ${this.getTemporalTypeLabel(temporalData.data_type)}
            </span>
          </div>
          <div class="popup-body">
            <p class="popup-description">${temporalData.description || '無描述'}</p>
            <div class="popup-info">
              <div class="info-item">
                <span class="info-label">座標:</span>
                <span class="info-value">${parseFloat(temporalData.latitude).toFixed(6)}, ${parseFloat(temporalData.longitude).toFixed(6)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">資料格式:</span>
                <span class="info-value">${temporalData.data_format ? temporalData.data_format.toUpperCase() : '未知'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">記錄數:</span>
                <span class="info-value">${temporalData.total_records || 0}</span>
              </div>
            </div>
            <div class="popup-actions">
              <button class="view-chart-btn" onclick="window.viewTemporalChart('${temporalData.temporal_id}')">
                查看時序圖表
              </button>
            </div>
          </div>
        </div>
      `)
      
      this.temporalLocationMarker.bindPopup(popup)
      
      // 自動打開彈出視窗
      this.temporalLocationMarker.openPopup()
      
      // 設置全局函數來處理圖表查看
      window.viewTemporalChart = (temporalId) => {
        this.showTemporalChart(temporalId)
      }
    },
    
    getTemporalTypeColor(type) {
      const colors = {
        'insar': '#a855f7',        // 紫色
        'gnss': '#3b82f6',         // 藍色
        'weather': '#3b82f6',      // 藍色
        'earthquake': '#ef4444',   // 紅色
        'rainfall': '#10b981',     // 綠色
        'temperature': '#f59e0b',  // 黃色
        'humidity': '#8b5cf6',     // 紫色
        'wind': '#06b6d4',         // 青色
        'pressure': '#84cc16',     // 青綠色
        'other': '#6b7280'         // 灰色
      }
      return colors[type] || colors.other
    },
    
    getTemporalTypeLabel(type) {
      const labels = {
        'insar': 'InSAR',
        'gnss': 'GNSS',
        'weather': '氣象',
        'earthquake': '地震',
        'rainfall': '降雨',
        'temperature': '溫度',
        'humidity': '濕度',
        'wind': '風速',
        'pressure': '氣壓',
        'other': '其他'
      }
      return labels[type] || '其他'
    },
    
    async onDeleteTemporalData(temporalData) {
      console.log('刪除時序資料:', temporalData)
      if (confirm(`確定要刪除時序資料「${temporalData.name}」嗎？`)) {
        try {
          const response = await this.$api.delete(`/temporal-data/${temporalData.temporal_id}`)
          console.log('刪除響應:', response)
          
          if (response.success) {
            // 從列表中移除已刪除的時序資料
            this.temporalDataList = this.temporalDataList.filter(
              item => item.temporal_id !== temporalData.temporal_id
            )
            
            this.showAlert({
              type: 'success',
              title: '刪除成功',
              message: `時序資料「${temporalData.name}」已成功刪除`
            })
          } else {
            throw new Error(response.message || '刪除失敗')
          }
        } catch (error) {
          console.error('刪除時序資料失敗:', error)
          this.showAlert({
            type: 'error',
            title: '刪除失敗',
            message: error.message || '刪除時序資料時發生錯誤'
          })
        }
      }
    },
    
    onToggleTemporalDataVisibility(temporalData) {
      console.log('=== 接收可見性切換事件 ===')
      console.log('時序資料:', temporalData)
      console.log('temporalData 的鍵:', Object.keys(temporalData))
      console.log('isVisible:', temporalData.isVisible)
      console.log('temporalId:', temporalData.temporalId)
      console.log('temporal_id:', temporalData.temporal_id)
      
      // 如果 isVisible 是 undefined，從 temporalDataVisibility 中計算
      let isVisible = temporalData.isVisible
      if (isVisible === undefined) {
        const currentVisibility = this.temporalDataVisibility[temporalData.temporal_id] === true
        isVisible = !currentVisibility
        console.log('isVisible 是 undefined，計算新值:', isVisible)
      }
      
      // 更新可見性狀態
      this.temporalDataVisibility[temporalData.temporal_id] = isVisible
      
      console.log('更新後的可見性狀態:', this.temporalDataVisibility[temporalData.temporal_id])
      
      // 找到對應的標記並更新可見性
      console.log('標記陣列長度:', this.temporalDataMarkers?.length || 0)
      console.log('時序資料座標:', temporalData.latitude, temporalData.longitude)
      
      // 如果座標是 undefined，從 temporalDataList 中查找
      let latitude = temporalData.latitude
      let longitude = temporalData.longitude
      
      if (!latitude || !longitude) {
        const originalData = this.temporalDataList.find(data => data.temporal_id === temporalData.temporal_id)
        if (originalData) {
          latitude = originalData.latitude
          longitude = originalData.longitude
          console.log('從 temporalDataList 中獲取座標:', latitude, longitude)
        }
      }
      
      if (this.temporalDataMarkers && latitude && longitude) {
        const dataLat = parseFloat(latitude)
        const dataLng = parseFloat(longitude)
        
        console.log('尋找匹配的標記，目標座標:', [dataLat, dataLng])
        
        this.temporalDataMarkers.forEach((marker, index) => {
          const markerLat = marker.getLatLng().lat
          const markerLng = marker.getLatLng().lng
          
          console.log(`標記 ${index} 座標:`, [markerLat, markerLng])
          
          // 如果座標匹配，更新可見性
          if (Math.abs(markerLat - dataLat) < 0.0001 && Math.abs(markerLng - dataLng) < 0.0001) {
            console.log('找到匹配的標記!')
            if (isVisible) {
              marker.setOpacity(1)
              console.log('標記已顯示:', temporalData.name)
            } else {
              marker.setOpacity(0)
              console.log('標記已隱藏:', temporalData.name)
            }
          }
        })
      }
    },
    
    onTemporalDataOrderChanged(newOrder) {
      console.log('時序資料順序已更新:', newOrder)
      this.temporalDataOrder = newOrder
      // 可以在這裡保存時序資料順序到後端或本地存儲
    },
    
    onShowError(errorInfo) {
      console.log('顯示錯誤訊息:', errorInfo)
      this.showAlert(errorInfo)
    },
    
    // 顯示時序圖表
    async showTemporalChart(temporalId) {
      console.log('顯示時序圖表:', temporalId)
      
      // 先清空舊的圖表數據
      this.temporalChartData = null
      this.apexChartOptions = null
      this.apexChartSeries = null
      this.showTemporalChartModal = false
      
      try {
        // 找到對應的時序資料
        const temporalData = this.temporalDataList.find(item => item.temporal_id === temporalId)
        if (!temporalData) {
          this.showAlert('找不到對應的時序資料', 'error')
          return
        }
        
        console.log('點擊的時序資料 ID:', temporalId)
        console.log('找到的時序資料:', temporalData)
        console.log('時序資料名稱:', temporalData.name)
        console.log('X軸:', temporalData.x_axis_columns)
        console.log('Y軸:', temporalData.y_axis_columns)
        
        // 獲取時序資料的圖表數據
        console.log('請求圖表數據 API:', `/temporal-data-enhanced/${temporalId}/chart`)
        const response = await this.$api.get(`/temporal-data-enhanced/${temporalId}/chart`)
        console.log('圖表數據 API 響應:', response)
        
        if (response.success && response.data) {
          // 設置圖表數據並顯示圖表模態框
          this.temporalChartData = {
            temporalData: temporalData,
            chartData: response.data.chartData,
            apexConfig: response.data.apexConfig
          }
          
          console.log('===== 設置新的圖表數據 =====')
          console.log('temporalData.temporal_id:', temporalData.temporal_id)
          console.log('temporalData.name:', temporalData.name)
          console.log('temporalData.chart_config:', temporalData.chart_config)
          console.log('完整圖表數據:', this.temporalChartData)
          
          // 生成 ApexCharts 配置
          this.generateApexChartConfig(response.data.chartData, temporalData)
          
          console.log('準備顯示模態框')
          // 使用 nextTick 確保 DOM 更新後再顯示
          await this.$nextTick()
          this.showTemporalChartModal = true
          console.log('模態框已顯示')
        } else {
          this.showAlert('無法載入圖表數據', 'error')
        }
      } catch (error) {
        console.error('載入時序圖表失敗:', error)
        console.error('錯誤詳情:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          temporalId: temporalId
        })
        
        // 根據不同的錯誤類型顯示不同的消息
        let errorMessage = '載入圖表失敗'
        if (error.response?.status === 400) {
          // 軸線未配置
          errorMessage = error.response?.data?.message || '此時序資料尚未配置圖表軸線，請先在上傳時選擇 X 軸和 Y 軸欄位'
        } else if (error.response?.status === 404) {
          // 找不到資源
          errorMessage = error.response?.data?.message || '找不到對應的時序資料文件'
        } else {
          errorMessage = error.response?.data?.message || error.message || '載入圖表失敗'
        }
        
        this.showAlert(errorMessage, 'error')
      }
    },
    
    // 生成 ApexCharts 配置
    generateApexChartConfig(chartData, temporalData) {
      console.log('生成 ApexCharts 配置:', chartData)
      console.log('temporalData:', temporalData)
      console.log('temporalData.chart_config:', temporalData.chart_config)
      console.log('temporalData.chart_config 類型:', typeof temporalData.chart_config)
      
      // 解析 chart_config（可能是字符串）
      let chartConfig = temporalData.chart_config
      if (typeof chartConfig === 'string') {
        try {
          chartConfig = JSON.parse(chartConfig)
          console.log('解析後的 chart_config:', chartConfig)
        } catch (e) {
          console.error('解析 chart_config 失敗:', e)
          chartConfig = {}
        }
      }
      
      // 從 chart_config 獲取圖表類型，默認為 'line'
      const chartType = chartConfig?.chartType || temporalData.chartType || 'line'
      console.log('最終圖表類型:', chartType)
      
      // 生成 series 數據
      this.apexChartSeries = chartData.datasets.map(dataset => ({
        name: dataset.name,
        data: dataset.data
      }))
      
      // 生成 options 配置
      this.apexChartOptions = {
        chart: {
          type: chartType,
          height: 350,
          zoom: {
            enabled: true
          },
          toolbar: {
            show: true
          }
        },
        title: {
          text: temporalData.name,
          align: 'left'
        },
        xaxis: {
          type: 'datetime',
          title: {
            text: '時間'
          }
        },
        yaxis: {
          title: {
            text: chartData.yAxis.join(', ')
          }
        },
        stroke: {
          curve: 'smooth',
          width: 2
        },
        markers: {
          size: 4
        },
        tooltip: {
          x: {
            format: 'yyyy-MM-dd HH:mm:ss'
          }
        },
        theme: {
          mode: this.isDarkMode ? 'dark' : 'light'
        }
      }
      
      console.log('ApexCharts 配置:', this.apexChartOptions)
      console.log('ApexCharts Series:', this.apexChartSeries)
    },
    
    // 關閉時序圖表模態框
    closeTemporalChartModal() {
      this.showTemporalChartModal = false
      this.temporalChartData = null
      this.apexChartOptions = null
      this.apexChartSeries = null
    },
    
    // 格式化日期時間
    formatDateTime(dateTimeString) {
      if (!dateTimeString) return '-'
      const date = new Date(dateTimeString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}/${month}/${day} ${hours}:${minutes}`
    },
    
    // 處理時間範圍變化
    onTimeRangeChanged(newTimeRange) {
      console.log('時間範圍已變更:', newTimeRange)
      // 可以在這裡添加額外的邏輯，比如更新其他相關數據
    },
    
    // 處理檔案選擇
    handleFileSelect(event) {
      const files = Array.from(event.target.files)
      this.selectedFiles = files
      console.log('選擇的檔案:', files.map(f => f.name))
    },
    
    // 重置上傳表單
    resetUploadForm() {
      this.selectedFiles = []
      this.uploadForm = {
        upload_name: '',
        upload_description: ''
      }
      this.isUploading = false
      this.uploadProgress = {
        current: 0,
        total: 0,
        percentage: 0,
        message: ''
      }
      // 重置檔案輸入
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },
    
    // 處理 Feature 上傳
    async handleFeatureUpload() {
      console.log('=== handleFeatureUpload 開始 ===')
      console.log('selectedFiles:', this.selectedFiles.length)
      console.log('uploadForm:', this.uploadForm)
      console.log('featureDisplayData:', this.featureDisplayData)
      
      if (!this.selectedFiles.length || !this.uploadForm.upload_name) {
        this.showAlert({
          type: 'error',
          title: '上傳失敗',
          message: '請選擇檔案並填寫上傳名稱'
        })
        return
      }
      
      const featureId = this.featureDisplayData?.feature?.properties?.Id || this.featureDisplayData?.featureId
      const fileId = this.featureDisplayData?.fileId
      
      console.log('提取的信息:', { featureId, fileId })
      console.log('featureDisplayData 詳細:', {
        featureId: this.featureDisplayData?.featureId,
        feature: this.featureDisplayData?.feature,
        fileId: this.featureDisplayData?.fileId,
        uploads: this.featureDisplayData?.uploads
      })
      
      if (!featureId || !fileId) {
        console.error('缺少必要信息:', { featureId, fileId })
        this.showAlert({
          type: 'error',
          title: '上傳失敗',
          message: `無法獲取 Feature 信息。Feature ID: ${featureId || '未找到'}, File ID: ${fileId || '未找到'}`
        })
        return
      }
      
      this.isUploading = true
      this.uploadProgress = {
        current: 0,
        total: this.selectedFiles.length,
        percentage: 0,
        message: '開始上傳...'
      }
      
      try {
        const uploadPromises = this.selectedFiles.map(async (file, index) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('upload_name', this.uploadForm.upload_name)
          formData.append('upload_description', this.uploadForm.upload_description)
          formData.append('feature_id', featureId)
          formData.append('data_files_id', fileId)
          
          this.uploadProgress.message = `正在上傳 ${file.name}...`
          
          const response = await fetch(`http://localhost:3001/api/data/feature/upload`, {
            method: 'POST',
            body: formData
          })
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.message || '上傳失敗')
          }
          
          this.uploadProgress.current = index + 1
          this.uploadProgress.percentage = Math.round((index + 1) / this.selectedFiles.length * 100)
          
          return result.data
        })
        
        const uploadResults = await Promise.all(uploadPromises)
        
        this.uploadProgress.message = '上傳完成！'
        
        // 使用統一的數據同步方法
        await this.syncAllFeatureData(featureId, fileId)
        
        // 切換到檢視標籤頁
        this.activeTab = 'view'
        
        // 重置表單
        this.resetUploadForm()
        
        this.showAlert({
          type: 'success',
          title: '上傳成功',
          message: `成功上傳 ${uploadResults.length} 個檔案。新上傳的內容已同步到檢視標籤頁和側邊欄關聯上傳功能。`
        })
        
      } catch (error) {
        console.error('上傳失敗:', error)
        this.showAlert({
          type: 'error',
          title: '上傳失敗',
          message: error.message || '上傳過程中發生錯誤'
        })
      } finally {
        this.isUploading = false
      }
    },
    
    // 重新載入 Feature 上傳數據
    async reloadFeatureUploads(featureId, fileId) {
      try {
        const response = await fetch(`http://localhost:3001/api/data/feature/${fileId}/${featureId}`)
        const result = await response.json()
        
        if (result.success) {
          this.featureUploads[featureId] = result.data
          console.log(`重新載入 Feature ${featureId} 上傳資料成功，載入了 ${result.data.length} 筆資料`)
          
          // 同步更新模態框數據
          this.syncModalData(featureId)
        }
      } catch (error) {
        console.error('重新載入關聯上傳數據失敗:', error)
      }
    },
    
    // 同步模態框數據
    syncModalData(featureId) {
      if (this.featureDisplayData && this.featureDisplayData.featureId === featureId) {
        const latestUploads = this.featureUploads[featureId] || []
        // Vue 3 直接賦值即可
        this.featureDisplayData.uploads = latestUploads
        console.log('同步模態框數據:', {
          featureId,
          uploadsLength: latestUploads.length,
          featureUploadsLength: this.featureUploads[featureId]?.length || 0
        })
        
        // 強制更新組件
        this.$forceUpdate()
      }
    },
    
    // 統一的數據同步方法
    async syncAllFeatureData(featureId, fileId) {
      console.log('=== 開始統一數據同步 ===')
      console.log('同步參數:', { featureId, fileId })
      
      try {
        // 1. 重新載入 featureUploads 數據
        await this.loadFeatureUploads(featureId, fileId)
        
        // 2. 同步模態框數據
        this.syncModalData(featureId)
        
        // 3. 確保側邊欄數據同步
        if (this.associateTargetData && this.associateTargetData.file_id === fileId) {
          console.log('側邊欄數據已同步')
        }
        
        console.log('=== 統一數據同步完成 ===')
        console.log('最終數據狀態:', {
          featureId,
          featureUploadsLength: this.featureUploads[featureId]?.length || 0,
          modalDataLength: this.featureDisplayData?.uploads?.length || 0
        })
        
      } catch (error) {
        console.error('統一數據同步失敗:', error)
      }
    }
  },
  beforeUnmount() {
    // 清理定時器
    if (this.animationTimer) {
      clearInterval(this.animationTimer)
      this.animationTimer = null
    }
    
    // 清理里程樁號圖層
    if (this.mileagePointsLayer && this.map) {
      console.log('[ProjectDetail] 清理里程樁號圖層')
      this.map.removeLayer(this.mileagePointsLayer)
      this.mileagePointsLayer = null
    }
  }
}
</script>

<style>
/* 時序資料標記樣式（地圖上的紅色正方形）*/
:global(.custom-temporal-marker) {
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
}

:global(.custom-temporal-marker:hover div) {
  transform: scale(1.2);
  border-color: #dc2626 !important;
}

/* 時序資料定位標記樣式（定位時的大點）*/
:global(.temporal-location-icon) {
  background: transparent !important;
  border: none !important;
}

:global(.temporal-location-marker) {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.marker-pulse) {
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: rgba(59, 130, 246, 0.4);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

:global(.marker-dot) {
  position: relative;
  width: 48px;
  height: 48px;
  background-color: #3b82f6;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
  z-index: 1;
}

:global(.marker-dot:hover) {
  transform: scale(1.1);
}

/* 時序資料定位彈出視窗樣式 */
:global(.temporal-location-popup .leaflet-popup-content-wrapper) {
  border-radius: 8px;
  padding: 0;
}

:global(.temporal-location-popup-content) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-width: 250px;
}

:global(.temporal-location-popup-content .popup-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

:global(.temporal-location-popup-content .popup-title) {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

:global(.temporal-location-popup-content .popup-type) {
  font-size: 10px;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
  margin-left: 8px;
}

:global(.temporal-location-popup-content .popup-body) {
  padding: 12px;
}

:global(.temporal-location-popup-content .popup-description) {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

:global(.temporal-location-popup-content .popup-info) {
  margin-bottom: 0;
}

:global(.temporal-location-popup-content .info-item) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

:global(.temporal-location-popup-content .info-item:last-child) {
  margin-bottom: 0;
}

:global(.temporal-location-popup-content .info-label) {
  color: #6b7280;
  font-weight: 500;
}

:global(.temporal-location-popup-content .info-value) {
  color: #1f2937;
  font-weight: 600;
}

:global(.temporal-location-popup-content .popup-actions) {
  text-align: center;
  margin-top: 12px;
}

:global(.temporal-location-popup-content .view-chart-btn) {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

:global(.temporal-location-popup-content .view-chart-btn:hover) {
  background-color: #2563eb;
}

/* 里程樁號標籤樣式 */
:global(.mileage-tooltip) {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #3b82f6 !important;
  border-radius: 4px !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #1e40af !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  white-space: nowrap !important;
}

:global(.mileage-tooltip::before) {
  border-top-color: #3b82f6 !important;
}
</style>
