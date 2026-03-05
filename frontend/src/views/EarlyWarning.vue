<template>
  <div class="px-4 py-4 sm:px-0 h-full flex flex-col overflow-hidden">
    <div class="grid grid-cols-1 flex-1 overflow-hidden min-h-0">
      <!-- 地圖和數據 -->
      <div class="flex flex-col h-full">
        <!-- 監測地區選擇器 -->
        <RegionSelector 
          ref="regionSelector"
          v-model="selectedRegionId"
          :show-create-button="true"
          @region-changed="handleRegionChanged"
          @regions-loaded="handleRegionsLoaded"
          @create="handleCreateRegionProject"
          @edit="handleEditRegionProject"
          @delete="handleRegionDeleted"
        />
              
        <!-- 災情預警情資 -->
        <div class="card mb-3 flex-shrink-0 early-warning-card pt-3">
          <!-- 圖表數據面板 -->
          <div v-if="!selectedRegionCode" class="text-center py-12">
            <div class="inline-flex flex-col items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div>
                <p class="text-gray-600 dark:text-gray-400 font-medium mb-1">請先選擇監測地區</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">選擇上方地區後，將顯示該地區的預警情資數據</p>
                </div>
              </div>
            </div>
          <ChartDataPanel 
            v-else
            :region-code="selectedRegionCode"
            :region-id="selectedRegionId"
            :region-name="currentRegionName"
            ref="chartDataPanel"
            @panel-collapsed-changed="handleChartPanelCollapsedChanged"
          />
            </div>
            
        <!-- 預警地圖 -->
        <div class="card flex-1 flex flex-col p-0 overflow-hidden relative early-warning-card">
          <!-- 告警燈號狀態面板 -->
          <AlertLightStatusPanel
            v-if="selectedRegionCode"
            :is-visible="showAlertLightStatusPanel"
            :alert-lights="currentAlertLights"
            :chart-panel-collapsed="chartPanelCollapsed"
            @close="handleAlertLightPanelClose"
            @expand="showAlertLightStatusPanel = true"
            @light-click="handleAlertLightClick"
          />
          
          <div class="flex-1 w-full h-full min-h-0">
            <ProjectMap 
              ref="projectMap"
              :project="mockParentProject"
              :is-dark-mode="isDarkMode"
              :loaded-geojson-layers="loadedGeojsonLayers"
              :layer-visibility="layerVisibility"
              :current-base-map="currentBaseMap"
              :highway-mileage-visible="highwayMileageVisible"
              :mileage-label-visible="showMileageLabels"
              @map-ready="onMapReady"
              @toggle-highway-mileage="toggleHighwayMileage"
              @toggle-mileage-label="toggleMileageLabels"
            />
            
            <!-- InSAR 地表形變圖層 -->
            <InSARLayer
              v-if="$refs.projectMap && $refs.projectMap.map"
              :map="$refs.projectMap.map"
              :is-active="showRadar"
              :show-legend="true"
              :sidebar-expanded="showAlertLightStatusPanel"
            />
              </div>
            </div>
          </div>
        </div>
        
    <!-- 建立地區專案模態框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCreateRegionProject"
          class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          @click.self="showCreateRegionProject = false"
        >
          <!-- 霧面背景 -->
          <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
          
          <!-- 模態框內容 -->
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full h-[900px] z-10 flex flex-col">
            <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-20">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">建立地區專案</h2>
                      <button 
                @click="showCreateRegionProject = false"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
                      </button>
                    </div>
            <div class="p-6 flex-1 overflow-hidden">
              <CreateRegionProject
                @success="handleRegionProjectCreated"
                @cancel="showCreateRegionProject = false"
                @road-section-selected="handleRoadSectionSelected"
                @work-section-selected="handleWorkSectionSelected"
              />
                  </div>
                    </div>
                    </div>
      </Transition>
    </Teleport>
    
    <!-- 編輯地區專案模態框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEditRegionProject"
          class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          @click.self="showEditRegionProject = false"
        >
          <!-- 霧面背景 -->
          <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
          
          <!-- 模態框內容 -->
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full h-[900px] z-10 flex flex-col">
            <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-20">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">編輯地區專案</h2>
                      <button 
                @click="showEditRegionProject = false"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
                      </button>
                    </div>
            <div class="p-6 flex-1 overflow-hidden">
              <CreateRegionProject
                :edit-mode="true"
                :edit-data="editingRegion"
                @success="handleRegionProjectUpdated"
                @cancel="showEditRegionProject = false"
                @road-section-selected="handleRoadSectionSelected"
                @work-section-selected="handleWorkSectionSelected"
            />
          </div>
        </div>
      </div>
      </Transition>
    </Teleport>
    
    <!-- 顏色選擇器模態框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showColorPicker"
          class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          @click.self="handleColorPickerClose"
        >
          <!-- 霧面背景 -->
          <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
          
          <!-- 顏色選擇器內容 -->
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full z-10 p-6">
        <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">設定風險燈號</h3>
            <button 
              @click="handleColorPickerClose"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
            <div v-if="selectedPoint" class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <p>路線: {{ selectedPoint.roadSection || '-' }}</p>
              <p>里程數: {{ selectedPoint.mileage || '-' }}</p>
          </div>
          
            <div class="grid grid-cols-3 gap-4">
                    <button 
                @click="setPointColor('red')"
                class="flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:scale-105"
                :class="selectedPoint && getPointColor(selectedPoint.longitude, selectedPoint.latitude) === 'red' 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-300'"
              >
                <div class="w-12 h-12 rounded-full bg-red-500 mb-2 shadow-lg"></div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">紅燈</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">高風險</span>
                    </button>
              
            <button 
                @click="setPointColor('yellow')"
                class="flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:scale-105"
                :class="selectedPoint && getPointColor(selectedPoint.longitude, selectedPoint.latitude) === 'yellow' 
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300'"
              >
                <div class="w-12 h-12 rounded-full bg-yellow-500 mb-2 shadow-lg"></div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">黃燈</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">中風險</span>
            </button>
              
            <button 
                @click="setPointColor('green')"
                class="flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:scale-105"
                :class="selectedPoint && getPointColor(selectedPoint.longitude, selectedPoint.latitude) === 'green' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300'"
              >
                <div class="w-12 h-12 rounded-full bg-green-500 mb-2 shadow-lg"></div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">綠燈</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">低風險</span>
            </button>
          </div>
      </div>
    </div>
      </Transition>
    </Teleport>
    
    <!-- 經常巡查模態框 -->
    <RoutineInspectionModal
      :is-visible="showRoutineInspectionModal"
      :point-info="currentInspectionPoint"
      :region-code="selectedRegionCode"
      @close="handleRoutineInspectionModalClose"
      @success="handleInspectionSuccess"
    />
    
    <!-- 特別巡查模態框 -->
    <SpecialInspectionModal
      :is-visible="showSpecialInspectionModal"
      :point-info="currentInspectionPoint"
      :region-code="selectedRegionCode"
      @close="handleSpecialInspectionModalClose"
      @success="handleInspectionSuccess"
    />
    
    <!-- 巡查記錄瀏覽頁面 -->
    <InspectionRecordsView
      :key="inspectionViewKey"
      :is-visible="showInspectionRecordsView"
      :point-info="currentInspectionPoint"
      :region-code="selectedRegionCode"
      :inspection-type="currentInspectionViewType"
      :mileage-points="currentMileagePoints"
      @close="handleInspectionRecordsViewClose"
      @navigate-to-point="handleNavigateToPoint"
      @record-updated="handleRecordUpdated"
    />
    
    <!-- 告警燈號位置確認模態框 -->
    <AlertLightConfirmModal
      :is-visible="showAlertLightConfirmModal"
      :point-info="currentAlertLightPoint"
      :is-deleting="isDeletingAlertLight"
      @confirm="handleAlertLightConfirm"
      @cancel="handleAlertLightCancel"
      @close="handleAlertLightCancel"
    />
  </div>
</template>

<script>
import L from 'leaflet'
import axios from 'axios'
import proj4 from 'proj4'
import ProjectMap from '@/components/project/ProjectMap.vue'
import RegionSelector from '@/components/warning/RegionSelector.vue'
import ChartDataPanel from '@/components/warning/ChartDataPanel.vue'
import CreateRegionProject from '@/components/warning/CreateRegionProject.vue'
import RoutineInspectionModal from '@/components/warning/RoutineInspectionModal.vue'
import SpecialInspectionModal from '@/components/warning/SpecialInspectionModal.vue'
import InspectionRecordsView from '@/components/warning/InspectionRecordsView.vue'
import AlertLightConfirmModal from '@/components/warning/AlertLightConfirmModal.vue'
import AlertLightStatusPanel from '@/components/warning/AlertLightStatusPanel.vue'
import InSARLayer from '@/components/warning/InSARLayer.vue'
import { generateWarningLightHTML } from '@/utils/warningLightMarkerHelper.js'
import { success, error } from '@/utils/simpleAlertService.js'

// 確保 proj4 在全局可用
if (typeof window !== 'undefined') {
  window.proj4 = proj4
}

// 定義台灣常用坐標系統
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs') // TWD97 TM2 zone 121
proj4.defs('EPSG:3825', '+proj=tmerc +lat_0=0 +lon_0=119 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs') // TWD97 TM2 zone 119
proj4.defs('EPSG:3827', '+proj=tmerc +lat_0=0 +lon_0=123 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs') // TWD97 TM2 zone 123
proj4.defs('EPSG:3828', '+proj=tmerc +lat_0=0 +lon_0=125 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs') // TWD97 TM2 zone 125
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs') // WGS84

console.log('EarlyWarning - proj4 坐標系統已定義')
console.log('EPSG:3826 (TWD97):', proj4.defs('EPSG:3826'))
console.log('EPSG:4326 (WGS84):', proj4.defs('EPSG:4326'))

export default {
  name: 'EarlyWarning',
  components: {
    ProjectMap,
    RegionSelector,
    ChartDataPanel,
    CreateRegionProject,
    RoutineInspectionModal,
    SpecialInspectionModal,
    InspectionRecordsView,
    AlertLightConfirmModal,
    AlertLightStatusPanel,
    InSARLayer
  },
  inject: ['isDarkMode'],
  data() {
    return {
      selectedRegionCode: null, // 用于 API 调用（region_code）
      selectedRegionId: null, // 用于标识选中的项目（region_id）
      currentRegionName: '預警分析',
      regions: [],
      showCreateRegionProject: false,
      showEditRegionProject: false,
      editingRegion: null,
      // 地圖相關數據
      loadedGeojsonLayers: {},
      layerVisibility: {},
      currentBaseMap: null,
      highwayMileageVisible: false,
      // 模擬母專案對象（用於顯示地圖）
      mockParentProject: {
        projectId: 'early-warning-parent',
        project_id: 'early-warning-parent',
        name: '預警分析系統',
        is_parent: true,
        parent_project_id: null,
        location: {
          lat: 24.5,
          lng: 121.0
        }
      },
      // 當前選中的路線 GeoJSON 圖層
      currentRoadLayer: null,
      // 點位顏色配置（以座標為 key）
      pointColorMap: {},
      // 是否顯示里程數字
      showMileageLabels: false,
      // 當前地圖縮放級別
      currentZoomLevel: 16,
         // 當前選中的點位（用於設置顏色）
         selectedPoint: null,
         // 顯示顏色選擇器
         showColorPicker: false,
         // 當前選擇的路線和工務段（用於建立專案時的預覽）
         currentPreviewRoadSection: null,
         currentPreviewWorkSection: null,
         // 巡查記錄相關
         showRoutineInspectionModal: false,
         showSpecialInspectionModal: false,
         showInspectionRecordsView: false,
         currentInspectionViewType: 'routine', // 'routine' 或 'special'
         currentInspectionPoint: null, // 當前要添加巡查記錄的點位信息
         // 當前地區的所有里程點列表（用於導航）
         currentMileagePoints: [], // 格式: [{ mileage, roadSection, location, ... }]
         // 用於強制重新渲染 InspectionRecordsView
         inspectionViewKey: 0,
         // 當前打開的里程點彈窗 layer（用於功能彈窗關閉後重新顯示）
         currentMileagePopupLayer: null,
         // 告警燈號位置設置相關
         showAlertLightConfirmModal: false,
         currentAlertLightPoint: null, // 當前要設置告警燈號的點位信息
         alertLightMarkers: [], // 告警燈號標記陣列 [{ marker, data }]
         alertLightMap: {}, // 告警燈號位置映射表 { "lng,lat": lightData }
         isDeletingAlertLight: false, // 是否正在刪除告警燈號
         showAlertLightStatusPanel: true, // 是否顯示告警燈號狀態面板（預設展開）
         currentAlertLights: [], // 當前地區的告警燈號列表
        chartPanelCollapsed: false, // 圖表面板是否收起
        disasterCountMap: {}, // 里程點災害數量映射表 { "里程數": 數量 }
        disasterHeatmapMarkers: [], // 災害熱力圖標記陣列
        showDisasterHeatmap: false, // 是否顯示 GeoTIFF 熱點圖層（可開關，控制 Hitmap.tif）
        heatmapControl: null, // 熱點圖層控制按鈕
        heatmapTiffLayer: null, // GeoTIFF 熱點圖層
        isLoadingHeatmap: false, // 是否正在載入熱點圖層
        radarControl: null, // 空中雷達控制按鈕
        showRadar: false // 是否顯示空中雷達
      }
    },
  watch: {
    // 監聽告警燈號面板狀態，更新熱點圖層和雷達按鈕位置
    showAlertLightStatusPanel(newValue) {
      console.log('[EarlyWarning] 告警燈號面板狀態變化:', newValue)
      if (this.heatmapControl && this.heatmapControl.updatePosition) {
        this.$nextTick(() => {
          this.heatmapControl.updatePosition()
          console.log('[EarlyWarning] 熱點圖層按鈕位置已更新，左偏移:', newValue ? '21rem' : '0')
        })
      }
      if (this.radarControl && this.radarControl.updatePosition) {
        this.$nextTick(() => {
          this.radarControl.updatePosition()
          console.log('[EarlyWarning] 雷達按鈕位置已更新，左偏移:', newValue ? '21rem' : '0')
        })
      }
    }
  },
  methods: {
    handleRegionChanged(regionInfo) {
      // regionInfo 可能是字符串（向后兼容）或对象 {region_id, region_code, region}
      let regionCode = null;
      let regionId = null;
      
      if (typeof regionInfo === 'string') {
        // 向后兼容：如果传入的是字符串，当作 region_code
        regionCode = regionInfo;
        // 从 regions 列表中找到对应的 region_id
        const region = this.regions.find(r => r.region_code === regionCode);
        regionId = region?.region_id || null;
      } else if (regionInfo && typeof regionInfo === 'object') {
        // 新格式：对象包含 region_id 和 region_code
        regionCode = regionInfo.region_code;
        regionId = regionInfo.region_id;
      }
      
      this.selectedRegionCode = regionCode;
      this.selectedRegionId = regionId;
      // 更新地區名稱
      const region = regionInfo?.region || this.regions.find(r => r.region_id === regionId || r.region_code === regionCode);
      if (region) {
        this.currentRegionName = region.region_name;
      }
      // 當地區改變時，可以更新地圖位置等
      if (this.$refs.chartDataPanel) {
        this.$refs.chartDataPanel.refresh();
      }
      // 可以根據地區代碼更新地圖位置
      if (regionCode) {
        this.updateMapForRegion(regionCode);
      }
      
      // 根據地區動態添加/移除控制按鈕
      const regionName = this.currentRegionName || region?.region_name || '';
      this.updateMapControls(regionName);
    },
    handleRegionsLoaded(regions) {
      this.regions = regions;
      // 如果有選中的地區，更新名稱並載入地圖數據
      if (this.selectedRegionId) {
        const region = regions.find(r => r.region_id === this.selectedRegionId);
        if (region) {
          this.selectedRegionCode = region.region_code;
          this.currentRegionName = region.region_name;
          // 載入對應的地圖數據
          this.$nextTick(() => {
            this.updateMapForRegion(this.selectedRegionCode);
          });
        }
      }
    },
    // 處理地區刪除事件
    handleRegionDeleted() {
      // 如果當前選中的地區被刪除，清除地圖數據
      if (!this.selectedRegionCode) {
        // 清除地圖上的路線圖層
        if (this.currentRoadLayer && this.$refs.projectMap?.map) {
          this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
          this.currentRoadLayer = null;
        }
        // 清除點位顏色配置
        this.pointColorMap = {};
      }
    },
    async updateMapForRegion(regionCode, preserveZoom = false) {
      // 根據地區代碼更新地圖位置並顯示對應的 GeoJSON 數據
      // 注意：地图数据仍使用 region_code，因为 GeoJSON 数据是按地区代码组织的
      if (!regionCode) {
        // 如果沒有選擇地區，清除地圖上的路線圖層
        if (this.currentRoadLayer && this.$refs.projectMap?.map) {
          this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
          this.currentRoadLayer = null;
        }
        // 清除告警燈號標記
        this.clearAlertLightMarkers();
        // 清除災害熱力圖標記
        this.clearDisasterHeatmapMarkers();
        return;
      }

      // 檢查地圖是否準備好，如果沒有則等待
      if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
        console.log('地圖尚未準備好，等待地圖初始化...');
        // 等待地圖準備好（最多等待 3 秒）
        let retries = 0;
        const maxRetries = 30;
        while (retries < maxRetries && (!this.$refs.projectMap || !this.$refs.projectMap.map)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
          console.warn('地圖初始化超時，無法載入路線數據');
          return;
        }
      }

      // 獲取地區資訊
      const region = this.regions.find(r => r.region_code === regionCode);
      if (!region) {
        console.warn('找不到地區資訊:', regionCode);
        return;
      }

      // 將地區代碼轉換為對應的公路編號名稱
      // 注意：有些region_code直接就是公路編號（如：'台7線'），有些是代碼（如：'taiwan7'）
      const roadSectionMap = {
        'taiwan7': '台7線',
        '台7線': '台7線', // 直接使用region_code作為公路編號的情況
        'taiwan8': '台8線',
        '台8線': '台8線',
        'taiwan8l37': '台8臨37線',
        '台8臨37線': '台8臨37線',
        'taiwan9': '台9線',
        'taiwan10': '台10線',
        'taiwan11': '台11線',
        'taiwan14': '台14線',
        'taiwan20': '台20線',
        'taiwan21': '台21線',
        'taiwan24': '台24線',
        'national1': '國道1號',
        'national3': '國道3號',
        'national5': '國道5號'
      };
      
      // 將地區代碼轉換為公路編號
      // 如果region_code已經是公路編號格式（如：'台7線'），直接使用
      // 如果是代碼格式（如：'taiwan7'），則轉換
      const roadSection = roadSectionMap[region.region_code] || region.region_code;
      
      // 從描述中提取工務段信息
      let workSection = null;
      if (region.description) {
        const workSectionMatch = region.description.match(/工務段[：:]\s*([^，,]+)/);
        if (workSectionMatch) {
          workSection = workSectionMatch[1].trim();
        }
      }
      
      console.log('載入路線數據，地區代碼:', regionCode, '轉換後路線名稱:', roadSection, '工務段:', workSection);
      
      try {
        // 載入 GeoJSON 文件
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson');
        if (!response.ok) {
          throw new Error(`載入 GeoJSON 失敗: ${response.statusText}`);
        }
        const geojsonData = await response.json();
        
        // 過濾出選中路線和工務段的數據
        const filteredFeatures = geojsonData.features.filter(feature => {
          const matchesRoad = feature.properties?.公路編 === roadSection;
          if (!matchesRoad) return false;
          
          // 如果有工務段信息，進一步過濾
          if (workSection) {
            return feature.properties?.工務段 === workSection;
          }
          
          return true;
        });
        
        if (filteredFeatures.length === 0) {
          console.warn(`未找到路線 ${roadSection} 的數據`);
          // 清除現有圖層
          if (this.currentRoadLayer && this.$refs.projectMap?.map) {
            this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
            this.currentRoadLayer = null;
          }
          return;
        }
        
        // 創建過濾後的 GeoJSON
        const filteredGeoJSON = {
          type: 'FeatureCollection',
          features: filteredFeatures
        };
        
        console.log(`已過濾出 ${filteredFeatures.length} 個點位 (路線: ${roadSection})`);
        
        // 保存當前地區的所有里程點列表（用於導航）
        this.currentMileagePoints = filteredFeatures.map(feature => ({
          mileage: feature.properties?.里程數 || '',
          roadSection: feature.properties?.公路編 || '',
          location: `${feature.properties?.縣市別 || ''}${feature.properties?.鄉鎮區 || ''}${feature.properties?.村里 || ''}`,
          coordinates: feature.geometry?.coordinates || [],
          properties: feature.properties || {}
        })).sort((a, b) => {
          // 按里程數排序（轉換為數值比較）
          const aMileage = this.parseMileageToNumber(a.mileage)
          const bMileage = this.parseMileageToNumber(b.mileage)
          return aMileage - bMileage
        });
        
        // 載入點位顏色配置（使用 region_id 如果有的話）
        if (this.selectedRegionId) {
          await this.loadPointColors(this.selectedRegionId);
        } else {
          await this.loadPointColors(regionCode);
        }
        
        // 載入告警燈號位置（使用 region_id 如果有的話）
        if (this.selectedRegionId) {
          await this.loadAlertLights(this.selectedRegionId);
        } else {
          await this.loadAlertLights(regionCode);
        }
        
        // 載入災害數量統計
        // 使用 region_id 載入災害統計（如果有的話）
        console.log('updateMapForRegion - 載入災害統計:', { 
          selectedRegionId: this.selectedRegionId, 
          selectedRegionCode: this.selectedRegionCode,
          regionCode 
        });
        if (this.selectedRegionId) {
          await this.loadDisasterCounts(this.selectedRegionId);
        } else if (this.selectedRegionCode) {
          await this.loadDisasterCounts(this.selectedRegionCode);
        } else {
          await this.loadDisasterCounts(regionCode);
        }
        
        // 在地圖上渲染數據
        await this.renderRoadGeoJSON(filteredGeoJSON);
        
        // 渲染災害熱力圖標記
        this.renderDisasterHeatmapMarkers(filteredGeoJSON);
        
        // 調整地圖視圖（如果不需要保持縮放層級）
        if (!preserveZoom) {
          // 檢查是否為台7地區，如果是，則設置特定的初始視圖
          const isTaiwan7 = roadSection === '台7線' || regionCode === 'taiwan7';
          
          if (isTaiwan7) {
            // 台7地區：以 49.4K (049K+400) 為中心，縮放層級 17
            console.log('台7地區：設置地圖中心為 49.4K，縮放層級 17');
            this.$refs.projectMap.map.setView([24.674396, 121.404444], 17);
          } else {
            // 其他地區：使用自動適應邊界
            this.fitMapToRoadData(filteredGeoJSON);
          }
        }
        
      } catch (error) {
        console.error('載入路線數據失敗:', error);
      }
    },
    // 地圖準備完成事件處理
    onMapReady(map) {
      console.log('預警分析地圖已準備完成')
      
      // 監聽地圖縮放事件
      map.on('zoomend', () => {
        this.currentZoomLevel = map.getZoom();
        this.updateMileageTooltips();
        this.updateMileagePointSizes();
        this.updateAlertLightMarkersVisibility();
        this.updateDisasterHeatmapMarkersVisibility();
      });
      
      // 初始化縮放級別
      this.currentZoomLevel = map.getZoom();
      
      // 根據專案類型添加控制按鈕
      // 不在這裡添加，改為在選擇地區後動態添加
      // this.addHeatmapControl(map);
      // this.addRadarControl(map);
      
      // 優化拖曳性能：在拖曳時降低標記的渲染負擔（可選，如果性能需要）
      // 注意：移除這些優化以確保標記始終可見
      
      // 如果已經選擇了地區，載入對應的地圖數據
      if (this.selectedRegionCode) {
        this.$nextTick(() => {
          this.updateMapForRegion(this.selectedRegionCode);
          // 根據當前選中的地區添加對應的控制按鈕
          if (this.currentRegionName) {
            this.updateMapControls(this.currentRegionName);
          }
        });
      }
    },
    // 更新里程點大小（根據縮放級別）
    updateMileagePointSizes() {
      if (!this.currentRoadLayer || !this.$refs.projectMap?.map) {
            return;
          }
          
      const map = this.$refs.projectMap.map;
      const currentZoom = map.getZoom();
      const baseRadius = 4; // 基礎半徑（在縮放級別 10 時）
      const newRadius = Math.max(3, Math.min(12, baseRadius + (currentZoom - 10) * 0.8));
      
      this.currentRoadLayer.eachLayer((layer) => {
        if (layer.setRadius) {
          layer.setRadius(newRadius);
        }
      });
    },
    // 更新里程 tooltip 的顯示狀態
    updateMileageTooltips() {
      if (!this.currentRoadLayer) {
            return;
          }
          
      const shouldShow = this.showMileageLabels && 
                        this.currentZoomLevel >= 16 && 
                        this.currentZoomLevel <= 20;
      
      this.currentRoadLayer.eachLayer((layer) => {
        if (shouldShow) {
          // 如果應該顯示，檢查是否已經綁定 tooltip
          if (!layer.getTooltip()) {
            const props = layer.feature?.properties || {};
            if (props.里程數) {
              layer.bindTooltip(props.里程數, {
                permanent: true,
                direction: 'top',
                offset: [0, -10],
                className: 'mileage-tooltip',
                opacity: 1
              });
            }
          } else {
            // 如果已經有 tooltip，確保它可見
            layer.openTooltip();
          }
          } else {
          // 如果應該隱藏，移除 tooltip
          if (layer.getTooltip()) {
            layer.unbindTooltip();
          }
        }
      });
    },
    // 切換省道里程樁號顯示
    toggleHighwayMileage(visible) {
      this.highwayMileageVisible = visible
    },
    // 處理建立地區專案
    handleCreateRegionProject() {
      this.showCreateRegionProject = true;
    },
    // 處理編輯地區專案
    handleEditRegionProject(region) {
      this.editingRegion = region;
      this.showEditRegionProject = true;
    },
    // 處理建立地區專案成功
    handleRegionProjectCreated(data) {
      this.showCreateRegionProject = false;
      // 重新載入地區列表
      if (this.$refs.regionSelector) {
        this.$refs.regionSelector.loadRegions();
      }
      // 成功提示已在 CreateRegionProject 組件中顯示，這裡不需要重複顯示
    },
    // 處理更新地區專案成功
    handleRegionProjectUpdated(data) {
      this.showEditRegionProject = false;
      this.editingRegion = null;
      // 重新載入地區列表
      if (this.$refs.regionSelector) {
        this.$refs.regionSelector.loadRegions();
      }
      // 成功提示已在 CreateRegionProject 組件中顯示，這裡不需要重複顯示
    },
    // 處理路線選擇（建立專案時使用）
    async handleRoadSectionSelected(roadSection) {
      try {
        console.log('選擇的路線:', roadSection);
        
        // 如果還沒有選擇工務段，不清除地圖也不顯示數據
        // 等待用戶選擇工務段後再顯示
        // 這裡只清除現有圖層，不載入新數據
        if (this.currentRoadLayer && this.$refs.projectMap?.map) {
          this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
          this.currentRoadLayer = null;
        }
        
        console.log('等待選擇工務段後再顯示地圖數據');
      } catch (error) {
        console.error('處理路線選擇失敗:', error);
      }
    },
    // 處理工務段選擇（建立專案時使用）
    async handleWorkSectionSelected({ roadSection, workSection }) {
      try {
        console.log('選擇的工務段:', workSection, '路線:', roadSection);
        
        // 保存當前預覽的路線和工務段
        this.currentPreviewRoadSection = roadSection;
        this.currentPreviewWorkSection = workSection;
        
        // 載入 GeoJSON 文件
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson');
        const geojsonData = await response.json();
        
        // 過濾出選中路線和工務段的數據（只顯示該工務段的數據）
        const filteredFeatures = geojsonData.features.filter(feature => {
          const matchesRoad = feature.properties?.公路編 === roadSection;
          if (!matchesRoad) return false;
          
          // 必須匹配工務段
          return feature.properties?.工務段 === workSection;
        });
        
        if (filteredFeatures.length === 0) {
          console.warn('未找到該工務段的數據');
          // 清除現有圖層
          if (this.currentRoadLayer && this.$refs.projectMap?.map) {
            this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
            this.currentRoadLayer = null;
          }
          // 清除災害熱力圖標記
          this.clearDisasterHeatmapMarkers();
          return;
        }
        
        // 創建過濾後的 GeoJSON（只包含該工務段的數據）
        const filteredGeoJSON = {
          type: 'FeatureCollection',
          features: filteredFeatures
        };
        
        console.log(`已過濾出 ${filteredFeatures.length} 個點位 (路線: ${roadSection}, 工務段: ${workSection})`);
        
        // 在地圖上渲染數據（只顯示該工務段的點位）
        await this.renderRoadGeoJSON(filteredGeoJSON);
        
        // 渲染災害熱力圖標記
        this.renderDisasterHeatmapMarkers(filteredGeoJSON);
        
        // 調整地圖視圖
        // 檢查是否為台7地區，如果是，則設置特定的初始視圖
        const isTaiwan7 = roadSection === '台7線';
        
        if (isTaiwan7) {
          // 台7地區：以 49.4K (049K+400) 為中心，縮放層級 17
          console.log('台7地區（預覽）：設置地圖中心為 49.4K，縮放層級 17');
          this.$refs.projectMap.map.setView([24.674396, 121.404444], 17);
        } else {
          // 其他地區：使用自動適應邊界
          this.fitMapToRoadData(filteredGeoJSON);
        }
        
      } catch (error) {
        console.error('載入工務段數據失敗:', error);
      }
    },
    // 載入點位顏色配置
    async loadPointColors(regionIdOrCode) {
      try {
        // 判断是否是 UUID 格式（包含连字符）或纯数字（旧的 integer ID）
        // UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const isUUID = typeof regionIdOrCode === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regionIdOrCode);
        const isNumericId = typeof regionIdOrCode === 'number' || 
                           (typeof regionIdOrCode === 'string' && /^\d+$/.test(regionIdOrCode));
        const isRegionId = isUUID || isNumericId;
        
        const apiPath = isRegionId
          ? `/api/warning-regions/id/${regionIdOrCode}/point-colors`
          : `/api/warning-regions/${regionIdOrCode}/point-colors`;
        
        console.log('載入點位顏色配置:', { regionIdOrCode, type: typeof regionIdOrCode, isUUID, isNumericId, isRegionId, apiPath });
        
        const response = await axios.get(apiPath);
        if (response.data.success) {
          // 建立顏色映射表（以座標為 key）
          this.pointColorMap = {};
          response.data.data.forEach(point => {
            // 確保經緯度是數字類型
            const lng = parseFloat(point.longitude);
            const lat = parseFloat(point.latitude);
            if (!isNaN(lng) && !isNaN(lat)) {
              const key = `${lng.toFixed(7)},${lat.toFixed(7)}`;
              this.pointColorMap[key] = point.point_color;
            }
          });
          console.log('已載入點位顏色配置:', Object.keys(this.pointColorMap).length, '個點位');
        }
            } catch (error) {
        console.error('載入點位顏色配置失敗:', error);
        this.pointColorMap = {};
      }
    },
    // 獲取點位顏色
    getPointColor(longitude, latitude) {
      const key = `${parseFloat(longitude).toFixed(7)},${parseFloat(latitude).toFixed(7)}`;
      return this.pointColorMap[key] || 'green'; // 預設為綠色
    },
    // 獲取顏色對應的十六進制值
    getColorHex(color) {
      const colorMap = {
        'red': '#ef4444',
        'yellow': '#facc15',
        'green': '#22c55e'
      };
      return colorMap[color] || '#ef4444';
    },
    // 在地圖上渲染路線 GeoJSON 數據
    async renderRoadGeoJSON(geojsonData) {
      if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
        console.warn('地圖尚未準備好');
            return;
          }
          
      const map = this.$refs.projectMap.map;
      
      // 移除現有的路線圖層
      if (this.currentRoadLayer) {
        // 清除所有 tooltip
        this.currentRoadLayer.eachLayer((layer) => {
          if (layer.unbindTooltip) {
            layer.unbindTooltip();
          }
        });
        map.removeLayer(this.currentRoadLayer);
        this.currentRoadLayer = null;
      }
      
      // 創建新的 GeoJSON 圖層
      this.currentRoadLayer = L.geoJSON(geojsonData, {
        pointToLayer: (feature, latlng) => {
          // 獲取點位顏色
          const [lng, lat] = feature.geometry.coordinates;
          const pointColor = this.getPointColor(lng, lat);
          const colorHex = this.getColorHex(pointColor);
          
          // 根據縮放級別計算半徑（縮放級別越大，點越大）
          const currentZoom = map.getZoom();
          const baseRadius = 4; // 基礎半徑（在縮放級別 10 時）
          const radius = Math.max(3, Math.min(12, baseRadius + (currentZoom - 10) * 0.8));
          
          // 創建圓形標記
          const marker = L.circleMarker(latlng, {
            radius: radius,
            fillColor: colorHex,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });
          
          // 保存原始 feature 以便後續更新
          marker._originalFeature = feature;
          
          return marker;
        },
        onEachFeature: (feature, layer) => {
          // 添加彈出窗口
          const props = feature.properties || {};
          const [lng, lat] = feature.geometry.coordinates;
          
          // 創建 popup 內容的 DOM 元素
          const popupDiv = document.createElement('div');
          popupDiv.style.minWidth = '280px';
          popupDiv.style.padding = '12px';
          
          // 生成唯一的按鈕 ID
          const baseId = `${lng.toString().replace(/\./g, '_')}-${lat.toString().replace(/\./g, '_')}`;
          const riskLightBtnId = `risk-light-btn-${baseId}`;
          const disasterBtnId = `disaster-btn-${baseId}`;
          const routineBtnId = `routine-btn-${baseId}`;
          const specialBtnId = `special-btn-${baseId}`;
          
          // 生成导航按钮 ID
          const prevBtnId = `prev-btn-${baseId}`;
          const nextBtnId = `next-btn-${baseId}`;
          
          // 检查是否有相邻里程点
          const currentMileage = props.里程數 || '';
          const currentIndex = this.currentMileagePoints.findIndex(point => {
            const pointMileage = String(point.mileage || '').trim();
            return pointMileage === currentMileage;
          });
          const hasPrevious = currentIndex > 0;
          const hasNext = currentIndex >= 0 && currentIndex < this.currentMileagePoints.length - 1;
          
          // 檢查該位置是否已設置告警燈號
          const locationKey = `${parseFloat(lng).toFixed(7)},${parseFloat(lat).toFixed(7)}`;
          const hasAlertLight = !!this.alertLightMap[locationKey];
          const alertLightBtnText = hasAlertLight ? '取消告警燈號設置' : '告警燈號設置';
          const alertLightBtnColor = hasAlertLight ? '#ef4444' : '#3b82f6'; // 刪除時用紅色
          const alertLightBtnHoverColor = hasAlertLight ? '#dc2626' : '#2563eb';
          
          popupDiv.innerHTML = `
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #1f2937; text-align: center;">
              里程數: ${props.里程數 || '-'}
            </div>
            ${hasPrevious || hasNext ? `
            <div style="display: flex; gap: 4px; margin-bottom: 12px;">
              <button 
                id="${prevBtnId}"
                style="flex: 1; padding: 8px; background-color: ${hasPrevious ? '#6b7280' : '#d1d5db'}; color: white; border: none; border-radius: 4px; cursor: ${hasPrevious ? 'pointer' : 'not-allowed'}; font-size: 13px; font-weight: 500; transition: background-color 0.2s; opacity: ${hasPrevious ? '1' : '0.5'};"
                onmouseover="${hasPrevious ? "this.style.backgroundColor='#4b5563'" : ""}"
                onmouseout="${hasPrevious ? "this.style.backgroundColor='#6b7280'" : ""}"
              >
                ← 上一點
              </button>
              <button 
                id="${nextBtnId}"
                style="flex: 1; padding: 8px; background-color: ${hasNext ? '#6b7280' : '#d1d5db'}; color: white; border: none; border-radius: 4px; cursor: ${hasNext ? 'pointer' : 'not-allowed'}; font-size: 13px; font-weight: 500; transition: background-color 0.2s; opacity: ${hasNext ? '1' : '0.5'};"
                onmouseover="${hasNext ? "this.style.backgroundColor='#4b5563'" : ""}"
                onmouseout="${hasNext ? "this.style.backgroundColor='#6b7280'" : ""}"
              >
                下一點 →
              </button>
            </div>
            ` : ''}
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; gap: 6px;">
                <button 
                  id="${riskLightBtnId}"
                  style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background-color 0.2s;"
                  onmouseover="this.style.backgroundColor='#2563eb'"
                  onmouseout="this.style.backgroundColor='#3b82f6'"
                >
                  設定風險燈號
                </button>
                <button 
                  id="${disasterBtnId}"
                  style="flex: 1; padding: 8px; background-color: ${alertLightBtnColor}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background-color 0.2s;"
                  onmouseover="this.style.backgroundColor='${alertLightBtnHoverColor}'"
                  onmouseout="this.style.backgroundColor='${alertLightBtnColor}'"
                  data-has-alert-light="${hasAlertLight}"
                  data-light-id="${hasAlertLight ? (this.alertLightMap[locationKey]?.light_id || '') : ''}"
                >
                  ${alertLightBtnText}
                </button>
              </div>
              <div style="display: flex; gap: 6px;">
                <button 
                  id="${routineBtnId}"
                  style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background-color 0.2s;"
                  onmouseover="this.style.backgroundColor='#2563eb'"
                  onmouseout="this.style.backgroundColor='#3b82f6'"
                >
                  經常巡查
                </button>
                <button 
                  id="${specialBtnId}"
                  style="flex: 1; padding: 8px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background-color 0.2s;"
                  onmouseover="this.style.backgroundColor='#2563eb'"
                  onmouseout="this.style.backgroundColor='#3b82f6'"
                >
                  特別巡查
                </button>
              </div>
            </div>
          `;
          
          // 綁定按鈕點擊事件
          const riskLightBtn = popupDiv.querySelector(`#${riskLightBtnId}`);
          if (riskLightBtn) {
            riskLightBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              // 保存當前彈窗 layer，以便功能彈窗關閉後重新顯示
              this.currentMileagePopupLayer = layer;
              this.handleRiskLightClick(lng, lat, props);
              layer.closePopup();
            });
          }
          
          const disasterBtn = popupDiv.querySelector(`#${disasterBtnId}`);
          if (disasterBtn) {
            disasterBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              // 保存當前彈窗 layer，以便功能彈窗關閉後重新顯示
              this.currentMileagePopupLayer = layer;
              // 檢查是否已設置告警燈號
              const hasAlertLight = disasterBtn.getAttribute('data-has-alert-light') === 'true';
              const lightId = disasterBtn.getAttribute('data-light-id') || '';
              this.handleDisasterRecordClick(lng, lat, props, hasAlertLight, lightId);
              layer.closePopup();
            });
          }
          
          const routineBtn = popupDiv.querySelector(`#${routineBtnId}`);
          if (routineBtn) {
            routineBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              // 保存當前彈窗 layer，以便功能彈窗關閉後重新顯示
              this.currentMileagePopupLayer = layer;
              this.handleRoutineInspectionClick(lng, lat, props);
              layer.closePopup();
            });
          }
          
          const specialBtn = popupDiv.querySelector(`#${specialBtnId}`);
          if (specialBtn) {
            specialBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              // 保存當前彈窗 layer，以便功能彈窗關閉後重新顯示
              this.currentMileagePopupLayer = layer;
              this.handleSpecialInspectionClick(lng, lat, props);
              layer.closePopup();
            });
          }
          
          // 綁定導航按鈕點擊事件
          const prevBtn = popupDiv.querySelector(`#${prevBtnId}`);
          if (prevBtn && hasPrevious) {
            prevBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.navigateToAdjacentPoint(layer, currentIndex, -1);
            });
          }
          
          const nextBtn = popupDiv.querySelector(`#${nextBtnId}`);
          if (nextBtn && hasNext) {
            nextBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.navigateToAdjacentPoint(layer, currentIndex, 1);
            });
          }
          
          layer.bindPopup(popupDiv);
          
          // 保存 feature 到 layer，以便後續更新 tooltip
          layer.feature = feature;
          
          // 如果開啟顯示里程數字且縮放級別在 16-20 之間，添加 tooltip
          if (this.showMileageLabels && 
              this.currentZoomLevel >= 16 && 
              this.currentZoomLevel <= 20 && 
              props.里程數) {
            layer.bindTooltip(props.里程數, {
              permanent: true,
              direction: 'top',
              offset: [0, -10],
              className: 'mileage-tooltip',
              opacity: 1
            });
          }
        }
      });
      
      // 添加到地圖
      this.currentRoadLayer.addTo(map);
      console.log('路線數據已渲染到地圖');
      
      // 更新 tooltip 顯示狀態（根據當前縮放級別）
      this.$nextTick(() => {
        this.updateMileageTooltips();
      });
    },
    // 切換里程數字顯示
    toggleMileageLabels() {
      this.showMileageLabels = !this.showMileageLabels;
      
      // 更新 tooltip 顯示狀態（不需要重新渲染整個地圖）
      this.updateMileageTooltips();
    },
    // 組件銷毀時清理
    beforeUnmount() {
      // 清理全局方法
      if (window.setPointColor) {
        delete window.setPointColor;
      }
      // 清理地圖圖層
      if (this.currentRoadLayer && this.$refs.projectMap?.map) {
        this.$refs.projectMap.map.removeLayer(this.currentRoadLayer);
        this.currentRoadLayer = null;
      }
      // 清理熱點圖 GeoTIFF 圖層
      this.removeHeatmapTiff();
      // 清理熱點圖層控制按鈕
      if (this.heatmapControl && this.$refs.projectMap?.map) {
        try {
          this.$refs.projectMap.map.removeControl(this.heatmapControl);
        } catch (error) {
          console.warn('清理熱點圖層控制按鈕時發生錯誤:', error);
        }
        this.heatmapControl = null;
      }
      
      if (this.radarControl && this.$refs.projectMap?.map) {
        try {
          this.$refs.projectMap.map.removeControl(this.radarControl);
        } catch (error) {
          console.warn('清理雷達控制按鈕時發生錯誤:', error);
        }
        this.radarControl = null;
      }
    },
    // 處理點位點擊
    handlePointClick(feature, layer) {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties || {};
      this.handlePointColorClick(lng, lat, props.公路編 || '', props.里程數 || '');
    },
    // 處理點位顏色設置點擊
    handlePointColorClick(longitude, latitude, roadSection, mileage) {
      this.selectedPoint = {
        longitude,
        latitude,
        roadSection,
        mileage
      };
      this.showColorPicker = true;
    },
    // 處理設置告警燈號點擊
    handleRiskLightClick(longitude, latitude, props) {
      // 使用現有的顏色選擇器功能來設置告警燈號
      this.handlePointColorClick(longitude, latitude, props.公路編 || '', props.里程數 || '');
    },
    // 處理增加災害紀錄點擊
    handleDisasterRecordClick(longitude, latitude, props, hasAlertLight = false, lightId = '') {
      console.log(hasAlertLight ? '取消告警燈號設置' : '設置告警燈號:', { longitude, latitude, props, hasAlertLight, lightId });
      // 保存當前彈窗 layer，以便功能彈窗關閉後重新顯示
      this.currentMileagePopupLayer = null; // 將在彈窗中設置
      
      // 構建點位信息
      this.currentAlertLightPoint = {
        longitude,
        latitude,
        mileage: props.里程數 || '',
        roadSection: props.公路編 || '',
        location: `${props.縣市別 || ''} ${props.鄉鎮區 || ''} ${props.村里 || ''}`.trim() || '-',
        lightId: lightId // 如果是刪除，需要 lightId
      };
      
      // 設置是否正在刪除
      this.isDeletingAlertLight = hasAlertLight;
      
      // 顯示確認模態框
      this.showAlertLightConfirmModal = true;
    },
    // 處理告警燈號位置確認
    async handleAlertLightConfirm() {
      if (!this.currentAlertLightPoint || !this.selectedRegionCode) {
        error(this.isDeletingAlertLight ? '缺少必要信息，無法取消告警燈號設置' : '缺少必要信息，無法設置告警燈號');
        this.showAlertLightConfirmModal = false;
        return;
      }
      
      try {
        if (this.isDeletingAlertLight) {
          // 刪除告警燈號位置
          if (!this.currentAlertLightPoint.lightId) {
            error('缺少告警燈號ID，無法刪除');
            this.showAlertLightConfirmModal = false;
            return;
          }
          
          // 优先使用 region_id
          const apiPath = this.selectedRegionId
            ? `/api/warning-regions/id/${this.selectedRegionId}/alert-lights/${this.currentAlertLightPoint.lightId}`
            : `/api/warning-regions/${this.selectedRegionCode}/alert-lights/${this.currentAlertLightPoint.lightId}`;
          const response = await axios.delete(apiPath);
          
          if (response.data.success) {
            success('告警燈號位置已成功取消');
            
            // 從地圖上移除標記
            const locationKey = `${parseFloat(this.currentAlertLightPoint.longitude).toFixed(7)},${parseFloat(this.currentAlertLightPoint.latitude).toFixed(7)}`;
            this.removeAlertLightMarker(locationKey);
            
            // 從映射表中移除
            delete this.alertLightMap[locationKey];
            
            // 從當前告警燈號列表中移除
            this.currentAlertLights = this.currentAlertLights.filter(
              light => light.light_id !== this.currentAlertLightPoint.lightId
            );
            
            // 關閉確認模態框
            this.showAlertLightConfirmModal = false;
            this.currentAlertLightPoint = null;
            this.isDeletingAlertLight = false;
            
            // 保存當前地圖縮放層級和中心點
            const map = this.$refs.projectMap?.map;
            let currentZoom = null;
            let currentCenter = null;
            if (map) {
              currentZoom = map.getZoom();
              currentCenter = map.getCenter();
            }
            
            // 重新渲染地圖圖層以更新按鈕文字（保持縮放層級）
            if (this.selectedRegionCode) {
              await this.updateMapForRegion(this.selectedRegionCode, true);
            }
            
            // 恢復地圖縮放層級和中心點
            if (map && currentZoom !== null && currentCenter !== null) {
              map.setView(currentCenter, currentZoom, {
                animate: false
              });
            }
          } else {
            error(response.data.message || '取消告警燈號設置失敗');
          }
        } else {
          // 創建告警燈號位置（仍使用 region_code，因为创建时需要 region_code）
          const response = await axios.post(
            `/api/warning-regions/${this.selectedRegionCode}/alert-lights`,
            {
              longitude: this.currentAlertLightPoint.longitude,
              latitude: this.currentAlertLightPoint.latitude,
              roadSection: this.currentAlertLightPoint.roadSection,
              mileage: this.currentAlertLightPoint.mileage
            }
          );
          
          if (response.data.success) {
            success('告警燈號位置已成功設置');
            
            // 在地圖上顯示紅綠燈標記
            await this.createAlertLightMarker(response.data.data);
            
            // 更新映射表
            const locationKey = `${parseFloat(this.currentAlertLightPoint.longitude).toFixed(7)},${parseFloat(this.currentAlertLightPoint.latitude).toFixed(7)}`;
            this.alertLightMap[locationKey] = response.data.data;
            
            // 更新當前告警燈號列表
            this.currentAlertLights.push(response.data.data);
            
            // 關閉確認模態框
            this.showAlertLightConfirmModal = false;
            this.currentAlertLightPoint = null;
            this.isDeletingAlertLight = false;
            
            // 保存當前地圖縮放層級和中心點
            const map = this.$refs.projectMap?.map;
            let currentZoom = null;
            let currentCenter = null;
            if (map) {
              currentZoom = map.getZoom();
              currentCenter = map.getCenter();
            }
            
            // 重新渲染地圖圖層以更新按鈕文字（保持縮放層級）
            if (this.selectedRegionCode) {
              await this.updateMapForRegion(this.selectedRegionCode, true);
            }
            
            // 恢復地圖縮放層級和中心點
            if (map && currentZoom !== null && currentCenter !== null) {
              map.setView(currentCenter, currentZoom, {
                animate: false
              });
            }
          } else {
            error(response.data.message || '設置告警燈號失敗');
          }
        }
      } catch (err) {
        console.error(this.isDeletingAlertLight ? '取消告警燈號設置失敗:' : '設置告警燈號失敗:', err);
        const errorMessage = err.response?.data?.message || err.message || (this.isDeletingAlertLight ? '取消告警燈號設置失敗' : '設置告警燈號失敗');
        error(errorMessage);
      }
    },
    // 處理告警燈號位置取消
    handleAlertLightCancel() {
      this.showAlertLightConfirmModal = false;
      this.currentAlertLightPoint = null;
      this.isDeletingAlertLight = false;
      // 重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 載入告警燈號位置
    async loadAlertLights(regionIdOrCode) {
      if (!regionIdOrCode) {
        return;
      }
      
      try {
        // 清除現有標記
        this.clearAlertLightMarkers();
        
        // 判断是否是 UUID 格式（包含连字符）或纯数字（旧的 integer ID）
        const isUUID = typeof regionIdOrCode === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regionIdOrCode);
        const isNumericId = typeof regionIdOrCode === 'number' || 
                           (typeof regionIdOrCode === 'string' && /^\d+$/.test(regionIdOrCode));
        const isRegionId = isUUID || isNumericId;
        
        const apiPath = isRegionId
          ? `/api/warning-regions/id/${regionIdOrCode}/alert-lights`
          : `/api/warning-regions/${regionIdOrCode}/alert-lights`;
        
        console.log('載入告警燈號:', { regionIdOrCode, isUUID, isNumericId, isRegionId, apiPath });
        
        const response = await axios.get(apiPath);
        
        if (response.data.success && response.data.data) {
          const lights = response.data.data;
          console.log('已載入告警燈號位置:', lights.length, '個');
          
          // 更新當前告警燈號列表
          this.currentAlertLights = lights;
          
          // 清空映射表
          this.alertLightMap = {};
          
          // 為每個告警燈號創建標記並更新映射表
          for (const lightData of lights) {
            await this.createAlertLightMarker(lightData);
            // 更新映射表
            const locationKey = `${parseFloat(lightData.longitude).toFixed(7)},${parseFloat(lightData.latitude).toFixed(7)}`;
            this.alertLightMap[locationKey] = lightData;
          }
        } else {
          this.currentAlertLights = [];
        }
      } catch (error) {
        console.error('載入告警燈號位置失敗:', error);
      }
    },
    // 創建告警燈號標記
    async createAlertLightMarker(lightData) {
      if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
        console.warn('地圖尚未準備好，無法創建告警燈號標記');
        return;
      }
      
      const map = this.$refs.projectMap.map;
      const lat = parseFloat(lightData.latitude);
      const lng = parseFloat(lightData.longitude);
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.warn('無效的座標:', lightData);
        return;
      }
      
      // 構建標記數據
      const markerData = {
        lat,
        lng,
        routeName: lightData.road_section || '',
        currentLevel: lightData.current_level || 'green',
        currentLevelName: this.getLevelName(lightData.current_level || 'green'),
        currentLevelColor: this.getLevelColor(lightData.current_level || 'green'),
        isRedLightOn: lightData.is_red_light_on || false,
        showSpecialAlert: lightData.show_special_alert || false,
        specialAlertCountdown: lightData.special_alert_countdown || 0
      };
      
      // 使用工具函數生成HTML
      const currentZoom = map.getZoom();
      const markerHTML = generateWarningLightHTML(markerData, currentZoom);
      
      // 整體縮小20%（乘以0.8）
      const scaleFactor = Math.pow(1.2, currentZoom - 16) * 0.8;
      const containerMaxWidth = Math.round(90 * scaleFactor);
      // 估算高度（路線名稱 + 紅綠燈）
      const estimatedHeight = Math.round((10 + 40) * scaleFactor);
      
      const customIcon = L.divIcon({
        className: 'warning-light-marker-icon',
        html: markerHTML,
        iconSize: [containerMaxWidth, estimatedHeight],
        iconAnchor: [containerMaxWidth / 2, estimatedHeight], // 錨點在底部中心，對齊到地圖座標
        popupAnchor: [0, -10]
      });
      
      // 告警燈號標記位置在里程點上方（稍微偏移）
      const offsetLat = lat + 0.0001; // 向上偏移約 11 米
      const marker = L.marker([offsetLat, lng], {
        icon: customIcon,
        zIndexOffset: 2000 // 確保告警燈號標記在里程點之上
      });
      
      // 添加點擊事件和說明彈窗
      marker.on('click', () => {
        const popupContent = this.generateAlertLightDescription(lightData);
        marker.bindPopup(popupContent).openPopup();
      });
      
      // 初始狀態：根據當前縮放層級決定是否顯示
      if (currentZoom >= 16 && currentZoom <= 20) {
        marker.addTo(map);
      }
      
      // 存儲標記和數據
      this.alertLightMarkers.push({
        marker: marker,
        data: lightData
      });
    },
    // 清除告警燈號標記
    clearAlertLightMarkers() {
      this.alertLightMarkers.forEach(({ marker }) => {
        if (this.$refs.projectMap?.map && this.$refs.projectMap.map.hasLayer(marker)) {
          this.$refs.projectMap.map.removeLayer(marker);
        }
      });
      this.alertLightMarkers = [];
      this.alertLightMap = {};
      this.currentAlertLights = [];
    },
    // 載入災害數量統計
    async loadDisasterCounts(regionIdOrCode) {
      if (!regionIdOrCode) {
        console.warn('loadDisasterCounts: regionIdOrCode 為空');
        return;
      }
      
      try {
        // 判断是否是 UUID 格式（包含连字符）或纯数字（旧的 integer ID）
        const isUUID = typeof regionIdOrCode === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regionIdOrCode);
        const isNumericId = typeof regionIdOrCode === 'number' || 
                           (typeof regionIdOrCode === 'string' && /^\d+$/.test(String(regionIdOrCode)));
        const isRegionId = isUUID || isNumericId;
        
        const apiPath = isRegionId
          ? `/api/warning-regions/id/${regionIdOrCode}/disaster-counts`
          : `/api/warning-regions/${regionIdOrCode}/disaster-counts`;
        
        console.log('載入災害數量統計:', { 
          regionIdOrCode, 
          type: typeof regionIdOrCode,
          isUUID,
          isNumericId,
          isRegionId, 
          apiPath,
          selectedRegionId: this.selectedRegionId,
          selectedRegionCode: this.selectedRegionCode
        });
        
        const response = await axios.get(apiPath);
        
        if (response.data.success && response.data.data) {
          this.disasterCountMap = response.data.data;
          console.log('已載入災害數量統計:', Object.keys(this.disasterCountMap).length, '個里程點', this.disasterCountMap);
        } else {
          console.warn('載入災害數量統計失敗: 響應不成功', response.data);
          this.disasterCountMap = {};
        }
      } catch (error) {
        console.error('載入災害數量統計失敗:', error);
        console.error('錯誤詳情:', error.response?.data || error.message);
        this.disasterCountMap = {};
      }
    },
    // 清除災害熱力圖標記
    clearDisasterHeatmapMarkers() {
      this.disasterHeatmapMarkers.forEach(({ marker }) => {
        if (this.$refs.projectMap?.map && this.$refs.projectMap.map.hasLayer(marker)) {
          this.$refs.projectMap.map.removeLayer(marker);
        }
      });
      this.disasterHeatmapMarkers = [];
    },
    // 計算兩點之間的距離（米）
    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371000; // 地球半徑（米）
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    // 聚合相鄰的點
    clusterDisasterPoints(points, zoomLevel) {
      if (zoomLevel >= 16) {
        // 縮放級別高時，不聚合，顯示所有點
        return points.map(p => ({ ...p, clusterId: p.mileage }));
      }
      
      // 根據縮放級別確定聚合距離閾值（米）
      // 縮放級別越低，聚合距離越大
      const clusterDistance = zoomLevel >= 15 ? 100 : // 15級：100米
                              zoomLevel >= 14 ? 200 : // 14級：200米
                              zoomLevel >= 13 ? 400 : // 13級：400米
                              800; // 12級及以下：800米
      
      const clusters = [];
      const processed = new Set();
      
      points.forEach((point, index) => {
        if (processed.has(index)) return;
        
        const cluster = {
          lat: point.lat,
          lng: point.lng,
          count: point.count,
          mileages: [point.mileage],
          indices: [index]
        };
        
        // 查找相鄰的點
        points.forEach((otherPoint, otherIndex) => {
          if (otherIndex === index || processed.has(otherIndex)) return;
          
          const distance = this.calculateDistance(
            point.lat, point.lng,
            otherPoint.lat, otherPoint.lng
          );
          
          if (distance <= clusterDistance) {
            // 合併到當前聚合
            cluster.count += otherPoint.count;
            cluster.mileages.push(otherPoint.mileage);
            cluster.indices.push(otherIndex);
            processed.add(otherIndex);
            
            // 更新聚合中心（使用加權平均）
            const totalCount = cluster.count;
            cluster.lat = (cluster.lat * (totalCount - otherPoint.count) + otherPoint.lat * otherPoint.count) / totalCount;
            cluster.lng = (cluster.lng * (totalCount - otherPoint.count) + otherPoint.lng * otherPoint.count) / totalCount;
          }
        });
        
        processed.add(index);
        clusters.push(cluster);
      });
      
      return clusters.map((cluster, idx) => ({
        ...cluster,
        clusterId: `cluster_${idx}`,
        mileage: cluster.mileages[0] // 使用第一個里程作為主里程
      }));
    },
    // 更新災害熱力圖標記可見性和聚合（根據縮放級別）
    updateDisasterHeatmapMarkersVisibility() {
      if (!this.$refs.projectMap?.map || !this.currentRoadLayer) {
        console.warn('updateDisasterHeatmapMarkersVisibility: 地图或图层未准备好');
        return;
      }
      
      const currentZoom = this.$refs.projectMap.map.getZoom();
      // 災害計數標記始終顯示（當縮放級別 >= 12 且有數據時）
      const shouldShow = currentZoom >= 12 && Object.keys(this.disasterCountMap).length > 0;
      
      console.log('updateDisasterHeatmapMarkersVisibility:', {
        currentZoom,
        shouldShow,
        showDisasterHeatmap: this.showDisasterHeatmap,
        disasterCountMapSize: Object.keys(this.disasterCountMap).length
      });
      
      if (!shouldShow) {
        // 隱藏所有標記（縮放級別太小或無數據）
        console.log('缩放级别 < 12 或無災害數據，隐藏热力图标记');
        this.clearDisasterHeatmapMarkers();
        return;
      }
      
      // 從 GeoJSON 圖層重新獲取所有原始點數據
      const originalPoints = [];
      this.currentRoadLayer.eachLayer((layer) => {
        if (layer.feature) {
          const props = layer.feature.properties || {};
          const mileage = props.里程數 || '';
          const count = this.disasterCountMap[mileage] || 0;
          if (count > 0) {
            const [lng, lat] = layer.feature.geometry.coordinates;
            originalPoints.push({ mileage, count, lat, lng });
          }
        }
      });
      
      // 根據當前縮放級別重新聚合
      const clusteredPoints = this.clusterDisasterPoints(originalPoints, currentZoom);
      
      // 清除現有標記
      this.clearDisasterHeatmapMarkers();
      
      // 重新創建標記（使用聚合後的數據）
      // 這樣可以確保隨著放大，聚合的標記會分散開來
      clusteredPoints.forEach(cluster => {
        const isCluster = cluster.mileages && cluster.mileages.length > 1;
        this.createDisasterHeatmapMarker(
          cluster.mileage,
          cluster.lat,
          cluster.lng,
          cluster.count,
          isCluster,
          cluster.mileages || [cluster.mileage]
        );
      });
    },
    // 創建災害熱力圖標記（使用熱力渲染圖樣式）
    createDisasterHeatmapMarker(mileage, lat, lng, count, isCluster = false, clusterMileages = []) {
      if (!this.$refs.projectMap?.map || count === 0) {
        return;
      }
      
      const map = this.$refs.projectMap.map;
      
      // 根據數量確定顏色
      let color;
      if (count === 0) {
        color = '#22c55e'; // 綠色
      } else if (count >= 1 && count <= 5) {
        color = '#facc15'; // 黃色
        } else {
        color = '#ef4444'; // 紅色
      }
      
      // 根據數量計算圓形大小（基礎大小 + 數量 * 增量）
      const baseSize = 20; // 基礎大小（像素）
      const sizeIncrement = 3; // 每個災害增加的大小
      const maxSize = 60; // 最大大小（像素）
      const size = Math.min(maxSize, baseSize + (count * sizeIncrement));
      const radius = size / 2; // 半徑
      
      // 創建自定義圖標（帶數字的半透明圓形）
      const iconHTML = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid ${color};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${Math.max(10, Math.min(16, size * 0.35))}px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          opacity: 0.8;
        " class="disaster-heatmap-circle">
          ${count}
        </div>
      `;
      
      const customIcon = L.divIcon({
        className: 'disaster-heatmap-icon',
        html: iconHTML,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
      });
      
      // 使用 marker 創建熱力渲染圖（帶數字的半透明圓形）
      // 設置 interactive: false 讓標記不接收鼠標事件，從而允許地圖正常拖動
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: 1500,
        // 設置為 false 讓點擊事件穿透到地圖，不阻止地圖拖動
        interactive: false
      });
      
      // 注意：由於 interactive: false，標記不會接收點擊事件
      // 如果需要查看災害信息，可以通過其他方式（如側邊欄或工具提示）顯示
      
      // 根據當前縮放級別決定是否顯示
      // 災害計數標記常駐顯示，不受 GeoTIFF 熱點圖層開關影響
      const currentZoom = map.getZoom();
      if (currentZoom >= 12) {
        marker.addTo(map);
      }
      
      // 優化性能：確保標記不接收鼠標事件，但不影響位置
      this.$nextTick(() => {
        if (marker._icon) {
          marker._icon.style.pointerEvents = 'none'; // 確保不接收鼠標事件
        }
      });
      
      // 存儲標記
      this.disasterHeatmapMarkers.push({
        marker: marker,
        mileage: mileage,
        count: count,
        lat: lat,
        lng: lng,
        isCluster: isCluster,
        clusterMileages: clusterMileages
      });
    },
    // 渲染災害熱力圖標記
    renderDisasterHeatmapMarkers(geojsonData) {
      // 先清除現有標記
      this.clearDisasterHeatmapMarkers();
      
      if (!geojsonData || !geojsonData.features) {
        console.warn('renderDisasterHeatmapMarkers: geojsonData 無效');
        return;
      }
      
      console.log('renderDisasterHeatmapMarkers - 當前災害統計:', {
        disasterCountMap: this.disasterCountMap,
        mapKeys: Object.keys(this.disasterCountMap),
        mapSize: Object.keys(this.disasterCountMap).length
      });
      
      // 檢查縮放級別
      const currentZoom = this.$refs.projectMap?.map?.getZoom() || 16;
      if (currentZoom < 12) {
        console.log('renderDisasterHeatmapMarkers: 縮放級別太小 (', currentZoom, '), 跳過渲染');
        return;
      }
      
      // 收集所有有災害記錄的點
      const points = [];
      geojsonData.features.forEach(feature => {
        const props = feature.properties || {};
        const mileage = props.里程數 || '';
        const [lng, lat] = feature.geometry.coordinates;
        
        // 查找該里程點的災害數量
        const count = this.disasterCountMap[mileage] || 0;
        
        // 如果有災害記錄，添加到點列表
        if (count > 0) {
          points.push({ mileage, count, lat, lng });
          console.log('找到災害點:', { mileage, count });
        }
      });
      
      console.log('renderDisasterHeatmapMarkers - 找到的災害點:', points.length, '個');
      
      // 如果沒有災害點，直接返回
      if (points.length === 0) {
        console.log('renderDisasterHeatmapMarkers: 沒有災害點需要渲染');
        return;
      }
      
      // 根據當前縮放級別決定是否聚合
      const clusteredPoints = this.clusterDisasterPoints(points, currentZoom);
      
      // 創建標記
      clusteredPoints.forEach(cluster => {
        const isCluster = cluster.mileages && cluster.mileages.length > 1;
        this.createDisasterHeatmapMarker(
          cluster.mileage,
          cluster.lat,
          cluster.lng,
          cluster.count,
          isCluster,
          cluster.mileages || [cluster.mileage]
        );
      });
      
      console.log('已渲染災害熱力圖標記:', this.disasterHeatmapMarkers.length, '個（原始點:', points.length, '個）');
    },
    // 添加熱點圖層控制按鈕（地圖左上角）
    addHeatmapControl(map) {
      const L = window.L
      if (!L || !map) return
      
      const self = this
      const HeatmapControl = L.Control.extend({
        onAdd: function() {
          const container = L.DomUtil.create('div', 'heatmap-control leaflet-bar leaflet-control')
          
          // 初始樣式（基礎樣式 + 位置）
          const updatePosition = () => {
            // 根據告警燈號面板狀態調整位置
            const leftOffset = self.showAlertLightStatusPanel ? '21rem' : '0'
            container.style.cssText = `
              background: white;
              border: 2px solid rgba(0,0,0,0.2);
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              cursor: pointer;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              margin-left: ${leftOffset};
            `
            // 保持當前的背景色和邊框色
            const isActive = self.showDisasterHeatmap
            container.style.backgroundColor = isActive ? '#ef4444' : 'white'
            container.style.borderColor = isActive ? '#dc2626' : 'rgba(0,0,0,0.2)'
          }
          
          // 創建按鈕內容
          const updateButton = () => {
            const isActive = self.showDisasterHeatmap
            container.style.backgroundColor = isActive ? '#ef4444' : 'white'
            container.style.borderColor = isActive ? '#dc2626' : 'rgba(0,0,0,0.2)'
            container.title = isActive ? '隱藏 GeoTIFF 熱點圖層' : '顯示 GeoTIFF 熱點圖層'
            
            container.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'white' : '#ef4444'}" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <circle cx="12" cy="12" r="6" opacity="0.6"/>
                <circle cx="12" cy="12" r="2" fill="${isActive ? 'white' : '#ef4444'}"/>
              </svg>
            `
          }
          
          // 初始化按鈕樣式和位置
          updatePosition()
          updateButton()
          
          // 點擊事件
          L.DomEvent.on(container, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            self.toggleDisasterHeatmap()
            updateButton()
          })
          
          // Hover 效果
          container.addEventListener('mouseenter', () => {
            container.style.transform = 'scale(1.05)'
            container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
          })
          
          container.addEventListener('mouseleave', () => {
            container.style.transform = 'scale(1)'
            container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
          })
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          
          // 保存更新函數，以便外部調用
          this.updateButton = updateButton
          this.updatePosition = updatePosition
          
          return container
        }
      })
      
      this.heatmapControl = new HeatmapControl({
        position: 'topleft'
      }).addTo(map)
    },
    
    // 添加空中雷達控制按鈕（在熱點圖層按鈕下方）
    addRadarControl(map) {
      const L = window.L
      if (!L || !map) return
      
      const self = this
      const RadarControl = L.Control.extend({
        onAdd: function() {
          const container = L.DomUtil.create('div', 'radar-control leaflet-bar leaflet-control')
          
          // 初始樣式（基礎樣式 + 位置）
          const updatePosition = () => {
            // 根據告警燈號面板狀態調整位置
            const leftOffset = self.showAlertLightStatusPanel ? '21rem' : '0'
            container.style.cssText = `
              background: white;
              border: 2px solid rgba(0,0,0,0.2);
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              cursor: pointer;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              margin-left: ${leftOffset};
              margin-top: 10px;
            `
            // 保持當前的背景色和邊框色
            const isActive = self.showRadar
            container.style.backgroundColor = isActive ? '#3b82f6' : 'white'
            container.style.borderColor = isActive ? '#2563eb' : 'rgba(0,0,0,0.2)'
          }
          
          // 創建按鈕內容
          const updateButton = () => {
            const isActive = self.showRadar
            container.style.backgroundColor = isActive ? '#3b82f6' : 'white'
            container.style.borderColor = isActive ? '#2563eb' : 'rgba(0,0,0,0.2)'
            container.title = isActive ? '關閉空中雷達' : '開啟空中雷達'
            
            // 雷達圖標（類似掃描雷達的圖標）
            container.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'white' : '#3b82f6'}" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <circle cx="12" cy="12" r="6" opacity="0.5"/>
                <circle cx="12" cy="12" r="2" opacity="0.8"/>
                <line x1="12" y1="12" x2="12" y2="4" opacity="0.9"/>
                <path d="M 12 12 L 18 8" opacity="0.7" stroke-linecap="round"/>
              </svg>
            `
          }
          
          // 初始化按鈕樣式和位置
          updatePosition()
          updateButton()
          
          // 點擊事件
          L.DomEvent.on(container, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            self.toggleRadar()
            updateButton()
          })
          
          // Hover 效果
          container.addEventListener('mouseenter', () => {
            container.style.transform = 'scale(1.05)'
            container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
          })
          
          container.addEventListener('mouseleave', () => {
            container.style.transform = 'scale(1)'
            container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
          })
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          
          // 保存更新函數，以便外部調用
          this.updateButton = updateButton
          this.updatePosition = updatePosition
          
          return container
        }
      })
      
      this.radarControl = new RadarControl({
        position: 'topleft'
      }).addTo(map)
    },
    
    // 切換空中雷達顯示（InSAR地表形變數據）
    toggleRadar() {
      console.log('[EarlyWarning] 切換空中雷達 (InSAR):', !this.showRadar)
      this.showRadar = !this.showRadar
      
      if (this.radarControl && this.radarControl.updateButton) {
        this.radarControl.updateButton()
      }
      
      // InSAR 圖層的顯示/隱藏由 InSARLayer 組件通過 :is-active prop 自動處理
      if (this.showRadar) {
        console.log('[EarlyWarning] 開啟 InSAR 地表形變圖層')
      } else {
        console.log('[EarlyWarning] 關閉 InSAR 地表形變圖層')
      }
    },
    
    // 根據地區更新地圖控制按鈕
    updateMapControls(regionName) {
      console.log('[EarlyWarning] 更新地圖控制按鈕，地區:', regionName)
      
      if (!this.$refs.projectMap?.map) {
        console.warn('[EarlyWarning] 地圖尚未初始化，稍後重試')
        return
      }
      
      const map = this.$refs.projectMap.map
      
      // 判斷應該顯示哪些按鈕
      const shouldShowHeatmap = regionName.includes('臺8線') || regionName.includes('台8線') || 
                                regionName.includes('臨37') || regionName.includes('临37')
      const shouldShowRadar = regionName.includes('臺7線') || regionName.includes('台7線') || 
                              regionName.includes('台7') || regionName.includes('臺7')
      
      console.log('[EarlyWarning] 按鈕顯示配置:', { 
        regionName, 
        shouldShowHeatmap, 
        shouldShowRadar 
      })
      
      // 移除現有的按鈕
      if (this.heatmapControl) {
        try {
          map.removeControl(this.heatmapControl)
          this.heatmapControl = null
          console.log('[EarlyWarning] 已移除熱點圖層按鈕')
        } catch (e) {
          console.warn('[EarlyWarning] 移除熱點圖層按鈕失敗:', e)
        }
      }
      
      if (this.radarControl) {
        try {
          map.removeControl(this.radarControl)
          this.radarControl = null
          console.log('[EarlyWarning] 已移除雷達按鈕')
        } catch (e) {
          console.warn('[EarlyWarning] 移除雷達按鈕失敗:', e)
        }
      }
      
      // 根據條件添加按鈕
      if (shouldShowHeatmap) {
        console.log('[EarlyWarning] 添加熱點圖層按鈕（台8臨37專案）')
        this.addHeatmapControl(map)
      }
      
      if (shouldShowRadar) {
        console.log('[EarlyWarning] 添加雷達按鈕（台7專案）')
        this.addRadarControl(map)
      }
    },
    
    // 切換 GeoTIFF 熱點圖層顯示（Hitmap.tif）
    // 注意：災害計數標記常駐顯示，不受此開關影響
    async toggleDisasterHeatmap() {
      console.log('[EarlyWarning] 切換 GeoTIFF 熱點圖層:', !this.showDisasterHeatmap)
      this.showDisasterHeatmap = !this.showDisasterHeatmap
      
      if (!this.$refs.projectMap?.map) return
      
      const map = this.$refs.projectMap.map
      
      if (this.showDisasterHeatmap) {
        // 顯示：加載 GeoTIFF 圖層（Hitmap.tif）
        await this.loadHeatmapTiff()
      } else {
        // 隱藏：移除 GeoTIFF 圖層
        this.removeHeatmapTiff()
      }
      
      console.log('[EarlyWarning] GeoTIFF 熱點圖層切換完成，當前狀態:', this.showDisasterHeatmap)
    },
    
    // 加載熱點圖 GeoTIFF
    async loadHeatmapTiff() {
      if (this.isLoadingHeatmap || this.heatmapTiffLayer) {
        console.log('[EarlyWarning] 熱點圖層已存在或正在加載')
        return
      }
      
      try {
        this.isLoadingHeatmap = true
        console.log('[EarlyWarning] 開始載入 Hitmap.tif')
        
        const map = this.$refs.projectMap.map
        
        // 確保 proj4 在全局可用
        if (!window.proj4) {
          console.error('[EarlyWarning] window.proj4 不存在')
          window.proj4 = proj4
        }
        console.log('[EarlyWarning] window.proj4 已確認:', !!window.proj4)
        console.log('[EarlyWarning] 可用的投影定義:', Object.keys(window.proj4.defs))
        
        // 動態導入所需庫
        const georasterModule = await import('georaster')
        const parseGeoraster = georasterModule.default || georasterModule.parseGeoraster
        const GeoRasterLayer = (await import('georaster-layer-for-leaflet')).default
        
        // 載入 TIF 檔案
        const response = await fetch('/data/uploads/tiff/Hitmap.tif')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        console.log('[EarlyWarning] Hitmap.tif 載入完成，檔案大小:', arrayBuffer.byteLength, 'bytes')
        
        // 解析 GeoTIFF
        const georaster = await parseGeoraster(arrayBuffer)
        console.log('[EarlyWarning] GeoTIFF 解析完成')
        console.log('[EarlyWarning] 投影信息:', georaster.projection)
        console.log('[EarlyWarning] 數值範圍:', georaster.mins, '-', georaster.maxs)
        console.log('[EarlyWarning] 寬度x高度:', georaster.width, 'x', georaster.height)
        console.log('[EarlyWarning] 邊界:', georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax)
        
        // 自定義顏色映射函數：根據實際數據範圍設置最大值
        let sampleCount = 0
        const valueSamples = []
        
        // 根據之前觀察，實際最大值約 1116，設置合理上限為 1500
        // 這樣可以讓顏色分布更合理，並能看到紅色
        const maxValue = 1500
        
        console.log('[EarlyWarning] 使用自定義最大值:', maxValue, '(理論最大值:', georaster.maxs[0], ')')
        
        const customColorMap = (values) => {
          const value = values[0] // 假設單波段
          
          if (value === null || value === undefined || value <= 0) {
            return 'rgba(0, 0, 0, 0)' // 無資料或0：透明
          }
          
          // 收集樣本數據用於調試（只收集前10000個以獲得更準確的統計）
          if (sampleCount < 10000) {
            valueSamples.push(value)
            sampleCount++
          }
          
          // 將數據值映射到 0-100% 百分比
          // 使用 maxValue = 1500 作為 100%
          const percentage = (value / maxValue) * 100
          
          // 超過 100% 的值仍然顯示紅色
          if (percentage > 100) {
            return 'rgb(255, 0, 0)'
          }
          
          let r, g, b
          
          if (percentage <= 0) {
            // 0%: 透明
            return 'rgba(0, 0, 0, 0)'
          } else if (percentage <= 1) {
            // 0-1%: 從透明漸變到綠色
            const t = percentage / 1
            r = 0
            g = Math.round(255 * t)
            b = 0
            const alpha = t
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
          } else if (percentage <= 50) {
            // 1-50%: 從綠色漸變到黃色
            const t = (percentage - 1) / 49
            r = Math.round(255 * t)
            g = 255
            b = 0
            return `rgb(${r}, ${g}, ${b})`
          } else {
            // 50-100%: 純紅色
            r = 255
            g = 0
            b = 0
            return `rgb(${r}, ${g}, ${b})`
          }
        }
        
        // 添加一個回調來輸出樣本數據
        setTimeout(() => {
          if (valueSamples.length > 0) {
            const actualMax = Math.max(...valueSamples)
            const actualMin = Math.min(...valueSamples)
            const actualAvg = valueSamples.reduce((a, b) => a + b, 0) / valueSamples.length
            
            console.log('[EarlyWarning] 數值樣本分析 (使用自定義最大值):')
            console.log('  樣本數量:', valueSamples.length)
            console.log('  實際最小值:', actualMin)
            console.log('  實際最大值:', actualMax, '→', ((actualMax / maxValue) * 100).toFixed(1) + '%')
            console.log('  實際平均值:', actualAvg.toFixed(2), '→', ((actualAvg / maxValue) * 100).toFixed(1) + '%')
            console.log('  理論範圍 (georaster):', georaster.mins[0], '-', georaster.maxs[0])
            console.log('  ⭐ 使用最大值:', maxValue, '= 100%')
            console.log('')
            console.log('顏色映射規則:')
            console.log('  0% (0): 透明')
            console.log('  0-1% (0-' + (maxValue * 0.01).toFixed(0) + '): 透明漸變到綠色')
            console.log('  1-50% (' + (maxValue * 0.01).toFixed(0) + '-' + (maxValue * 0.5).toFixed(0) + '): 綠色漸變到黃色')
            console.log('  50-100% (' + (maxValue * 0.5).toFixed(0) + '-' + maxValue + '): 純紅色 🔴')
            console.log('')
            
            // 計算百分比分布
            const percentages = valueSamples.map(v => (v / maxValue) * 100)
            const redCount = percentages.filter(p => p > 50).length
            const yellowCount = percentages.filter(p => p > 1 && p <= 50).length
            const greenCount = percentages.filter(p => p > 0 && p <= 1).length
            const transparentCount = percentages.filter(p => p === 0).length
            
            console.log('樣本顏色分布:')
            console.log('  🔴 紅色 (>50%):', redCount, '個',
                       '(' + ((redCount / valueSamples.length) * 100).toFixed(1) + '%)')
            console.log('  🟡 黃色 (1-50%):', yellowCount, '個',
                       '(' + ((yellowCount / valueSamples.length) * 100).toFixed(1) + '%)')
            console.log('  🟢 綠色 (0-1%):', greenCount, '個',
                       '(' + ((greenCount / valueSamples.length) * 100).toFixed(1) + '%)')
            console.log('  ⚪ 透明 (0%):', transparentCount, '個',
                       '(' + ((transparentCount / valueSamples.length) * 100).toFixed(1) + '%)')
          }
        }, 2000)
        
        // 創建 GeoRasterLayer（顯式傳遞 proj4）
        console.log('[EarlyWarning] 創建 GeoRasterLayer')
        console.log('[EarlyWarning] proj4 可用:', !!window.proj4)
        console.log('[EarlyWarning] georaster.projection:', georaster.projection)
        
        // 準備 GeoRasterLayer 選項
        const layerOptions = {
          georaster: georaster,
          opacity: 0.7,
          pixelValuesToColorFn: customColorMap,
          resolution: 256,
          proj4: window.proj4, // 顯式傳遞 proj4
          debugLevel: 0 // 禁用除錯訊息
        }
        
        // 處理投影信息
        if (!georaster.projection || georaster.projection === 0) {
          console.log('[EarlyWarning] GeoTIFF 無投影信息，強制設置為 EPSG:3826 (TWD97)')
          georaster.projection = 3826
        } else if (georaster.projection === 32767) {
          // EPSG:32767 是非標準代碼，映射到 TWD97 (EPSG:3826)
          console.log('[EarlyWarning] GeoTIFF 使用 EPSG:32767，轉換為 EPSG:3826 (TWD97)')
          georaster.projection = 3826
        } else if (georaster.projection === 4326) {
          console.log('[EarlyWarning] GeoTIFF 使用 EPSG:4326 (WGS84)')
        } else if (typeof georaster.projection === 'number') {
          console.log('[EarlyWarning] GeoTIFF 使用 EPSG:' + georaster.projection)
          // 檢查該投影是否已定義
          const epsgCode = `EPSG:${georaster.projection}`
          if (!window.proj4.defs(epsgCode)) {
            console.warn('[EarlyWarning] 投影', epsgCode, '未定義，強制設置為 EPSG:3826 (TWD97)')
            georaster.projection = 3826
          }
        } else {
          // 其他情況，強制使用 TWD97
          console.log('[EarlyWarning] 未知投影格式，強制設置為 EPSG:3826 (TWD97)')
          georaster.projection = 3826
        }
        
        console.log('[EarlyWarning] 最終使用的投影: EPSG:' + georaster.projection)
        
        this.heatmapTiffLayer = new GeoRasterLayer(layerOptions)
        
        console.log('[EarlyWarning] GeoRasterLayer 已創建，準備添加到地圖')
        this.heatmapTiffLayer.addTo(map)
        console.log('[EarlyWarning] 熱點圖層已添加到地圖')
        
      } catch (error) {
        console.error('[EarlyWarning] 載入 Hitmap.tif 失敗:', error)
        this.showDisasterHeatmap = false
        // 更新按鈕狀態
        if (this.heatmapControl && this.heatmapControl.updateButton) {
          this.heatmapControl.updateButton()
        }
      } finally {
        this.isLoadingHeatmap = false
      }
    },
    
    // 移除熱點圖 GeoTIFF
    removeHeatmapTiff() {
      if (this.heatmapTiffLayer && this.$refs.projectMap?.map) {
        console.log('[EarlyWarning] 移除熱點圖層')
        const map = this.$refs.projectMap.map
        if (map.hasLayer(this.heatmapTiffLayer)) {
          map.removeLayer(this.heatmapTiffLayer)
        }
        this.heatmapTiffLayer = null
      }
    },
    // 移除單個告警燈號標記
    removeAlertLightMarker(locationKey) {
      const index = this.alertLightMarkers.findIndex(({ data }) => {
        const key = `${parseFloat(data.longitude).toFixed(7)},${parseFloat(data.latitude).toFixed(7)}`;
        return key === locationKey;
      });
      
      if (index !== -1) {
        const { marker } = this.alertLightMarkers[index];
        if (this.$refs.projectMap?.map && this.$refs.projectMap.map.hasLayer(marker)) {
          this.$refs.projectMap.map.removeLayer(marker);
        }
        this.alertLightMarkers.splice(index, 1);
      }
    },
    // 更新告警燈號標記的可見性和大小
    updateAlertLightMarkersVisibility() {
      if (!this.$refs.projectMap?.map) return;
      
      const map = this.$refs.projectMap.map;
      const currentZoom = map.getZoom();
      const shouldShow = currentZoom >= 16 && currentZoom <= 20;
      
      this.alertLightMarkers.forEach(({ marker, data }) => {
        if (shouldShow) {
          // 更新標記圖標以反映當前縮放層級
          const scaleFactor = Math.pow(1.2, currentZoom - 16) * 0.8;
          const containerMaxWidth = Math.round(90 * scaleFactor);
          const estimatedHeight = Math.round((10 + 40) * scaleFactor);
          
          const markerData = {
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
            routeName: data.road_section || '',
            currentLevel: data.current_level || 'green',
            currentLevelName: this.getLevelName(data.current_level || 'green'),
            currentLevelColor: this.getLevelColor(data.current_level || 'green'),
            isRedLightOn: data.is_red_light_on || false,
            showSpecialAlert: data.show_special_alert || false,
            specialAlertCountdown: data.special_alert_countdown || 0
          };
          
          const markerHTML = generateWarningLightHTML(markerData, currentZoom);
          const newIcon = L.divIcon({
            className: 'warning-light-marker-icon',
            html: markerHTML,
            iconSize: [containerMaxWidth, estimatedHeight],
            iconAnchor: [containerMaxWidth / 2, estimatedHeight],
            popupAnchor: [0, -10]
          });
          marker.setIcon(newIcon);
          
          if (!map.hasLayer(marker)) {
            marker.addTo(map);
          }
        } else {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        }
      });
    },
    // 獲取燈號等級名稱
    getLevelName(level) {
      const nameMap = {
        'green': '預警綠燈',
        'yellow': '預警黃燈',
        'red': '預警紅燈'
      };
      return nameMap[level] || '預警綠燈';
    },
    // 獲取燈號等級顏色類
    getLevelColor(level) {
      const colorMap = {
        'green': 'text-green-400',
        'yellow': 'text-yellow-400',
        'red': 'text-red-400'
      };
      return colorMap[level] || 'text-green-400';
    },
    // 生成告警燈號說明文字
    generateAlertLightDescription(lightData) {
      return `
        <div style="font-size: 14px; line-height: 1.6;">
          <div style="font-weight: 600; margin-bottom: 8px;">告警燈號位置</div>
          <div style="margin-bottom: 4px;"><strong>路線：</strong>${lightData.road_section || '-'}</div>
          <div style="margin-bottom: 4px;"><strong>里程數：</strong>${lightData.mileage || '-'}</div>
          <div style="margin-bottom: 4px;"><strong>燈號等級：</strong>${this.getLevelName(lightData.current_level || 'green')}</div>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">設置時間：${lightData.created_at ? new Date(lightData.created_at).toLocaleString('zh-TW') : '-'}</div>
        </div>
      `;
    },
    // 處理例行巡查點擊
    handleRoutineInspectionClick(longitude, latitude, props) {
      this.currentInspectionPoint = {
        longitude,
        latitude,
        roadSection: props.公路編 || '',
        mileage: props.里程數 || '',
        location: `${props.縣市別 || ''} ${props.鄉鎮區 || ''} ${props.村里 || ''}`
      };
      this.currentInspectionViewType = 'routine';
      this.showInspectionRecordsView = true;
    },
    // 處理特別巡查點擊
    handleSpecialInspectionClick(longitude, latitude, props) {
      this.currentInspectionPoint = {
        longitude,
        latitude,
        roadSection: props.公路編 || '',
        mileage: props.里程數 || '',
        location: `${props.縣市別 || ''} ${props.鄉鎮區 || ''} ${props.村里 || ''}`
      };
      this.currentInspectionViewType = 'special';
      this.showInspectionRecordsView = true;
    },
    // 處理巡查記錄保存成功
    async handleInspectionSuccess(data) {
      console.log('巡查記錄已保存:', data);
      
      // 刷新熱力圖
      await this.refreshDisasterHeatmap();
      
      // 關閉功能彈窗後，重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 處理巡查記錄更新（從 InspectionRecordsView）
    async handleRecordUpdated() {
      console.log('巡查記錄已更新，刷新熱力圖');
      await this.refreshDisasterHeatmap();
    },
    // 刷新災害熱力圖
    async refreshDisasterHeatmap() {
      if (!this.selectedRegionId && !this.selectedRegionCode) {
        return;
      }
      
      // 重新載入災害數量統計（优先使用 region_id）
      if (this.selectedRegionId) {
        await this.loadDisasterCounts(this.selectedRegionId);
      } else {
        await this.loadDisasterCounts(this.selectedRegionCode);
      }
      
      // 重新渲染熱力圖標記
      if (this.currentRoadLayer) {
        // 從 currentRoadLayer 獲取 GeoJSON 數據
        const geojsonData = {
          type: 'FeatureCollection',
          features: []
        };
        
        this.currentRoadLayer.eachLayer((layer) => {
          if (layer.feature) {
            geojsonData.features.push(layer.feature);
          }
        });
        
        if (geojsonData.features.length > 0) {
          this.renderDisasterHeatmapMarkers(geojsonData);
        }
      }
    },
    // 設置點位顏色
    async setPointColor(color) {
      // 检查是否选中了点位和地区（region_id 或 region_code 至少有一个）
      if (!this.selectedPoint || (!this.selectedRegionId && !this.selectedRegionCode)) {
        console.warn('setPointColor: 缺少必要的参数', {
          selectedPoint: this.selectedPoint,
          selectedRegionId: this.selectedRegionId,
          selectedRegionCode: this.selectedRegionCode
        });
        return;
      }
      
      // 保存當前地圖縮放層級和中心點
      const map = this.$refs.projectMap?.map;
      let currentZoom = null;
      let currentCenter = null;
      if (map) {
        currentZoom = map.getZoom();
        currentCenter = map.getCenter();
      }
      
      try {
        // 优先使用 region_id
        const apiPath = this.selectedRegionId
          ? `/api/warning-regions/id/${this.selectedRegionId}/point-colors`
          : `/api/warning-regions/${this.selectedRegionCode}/point-colors`;
        
        console.log('setPointColor API 调用:', {
          color,
          apiPath,
          selectedRegionId: this.selectedRegionId,
          selectedRegionCode: this.selectedRegionCode,
          selectedPoint: this.selectedPoint
        });
        
        const response = await axios.post(apiPath,
          {
            longitude: this.selectedPoint.longitude,
            latitude: this.selectedPoint.latitude,
            roadSection: this.selectedPoint.roadSection,
            mileage: this.selectedPoint.mileage,
            pointColor: color
          }
        );
        
        if (response.data.success) {
          // 更新本地顏色映射
          const key = `${parseFloat(this.selectedPoint.longitude).toFixed(7)},${parseFloat(this.selectedPoint.latitude).toFixed(7)}`;
          this.pointColorMap[key] = color;
          
          // 重新渲染地圖以更新顏色（保持縮放層級）
          if (this.selectedRegionCode) {
            await this.updateMapForRegion(this.selectedRegionCode, true);
          }
          
          // 恢復地圖縮放層級和中心點
          if (map && currentZoom !== null && currentCenter !== null) {
            map.setView(currentCenter, currentZoom, {
              animate: false
            });
          }
          
          this.showColorPicker = false;
          this.selectedPoint = null;
          console.log('點位顏色已更新:', color);
          // 重新打開里程點彈窗
          this.reopenMileagePopup();
        }
      } catch (error) {
        console.error('設置點位顏色失敗:', error);
        alert('設置顏色失敗：' + (error.response?.data?.message || error.message));
      }
    },
    // 調整地圖視圖以顯示路線數據
    fitMapToRoadData(geojsonData) {
      if (!this.$refs.projectMap || !this.$refs.projectMap.map) {
        console.warn('地圖尚未準備好');
        return;
      }
      
      const map = this.$refs.projectMap.map;
      
      // 計算所有點的邊界
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      
      geojsonData.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          const [lng, lat] = feature.geometry.coordinates;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        }
      });
      
      // 如果找到有效的邊界，調整地圖視圖
      if (minLat !== Infinity && maxLat !== -Infinity && 
          minLng !== Infinity && maxLng !== -Infinity) {
        const bounds = [[minLat, minLng], [maxLat, maxLng]];
        map.fitBounds(bounds, {
          padding: [50, 50], // 邊距
          maxZoom: 16 // 最大縮放級別
        });
        
        console.log('地圖視圖已調整到路線範圍:', bounds);
      }
    },
    // 將里程數轉換為數值（用於排序）
    parseMileageToNumber(mileage) {
      if (!mileage) return 0;
      const str = String(mileage).trim();
      // 處理 "022K+500" 格式
      const match1 = str.match(/^0*(\d+)K\+(\d+)$/);
      if (match1) {
        const km = parseInt(match1[1]);
        const meter = parseInt(match1[2]);
        return km + meter / 1000;
      }
      // 處理 "22.5K" 格式
      const match2 = str.match(/(\d+\.?\d*)K/);
      if (match2) {
        return parseFloat(match2[1]);
      }
      // 處理純數字
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    },
    // 處理導航到指定里程點
    handleNavigateToPoint(newPointInfo) {
      this.currentInspectionPoint = newPointInfo;
      // 觸發 InspectionRecordsView 重新載入記錄
        this.$nextTick(() => {
        // 通過 key 強制重新渲染 InspectionRecordsView
        this.inspectionViewKey = Date.now();
      });
    },
    // 導航到相鄰里程點（在 popup 中使用）
    navigateToAdjacentPoint(currentLayer, currentIndex, direction) {
      if (!this.currentMileagePoints || this.currentMileagePoints.length === 0) {
        return;
      }
      
      const newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= this.currentMileagePoints.length) {
        return;
      }
      
      const targetPoint = this.currentMileagePoints[newIndex];
      if (!targetPoint) {
        return;
      }
      
      // 清除保存的彈窗 layer（因為要切換到新的里程點）
      this.currentMileagePopupLayer = null;
      
      // 關閉當前 popup
      currentLayer.closePopup();
      
      // 找到目標里程點的 layer
      const map = this.$refs.projectMap?.map;
      if (!map || !this.currentRoadLayer) {
        return;
      }
      
      // 在地圖圖層中查找目標里程點的 layer
      let targetLayer = null;
      this.currentRoadLayer.eachLayer((layer) => {
        if (layer.feature && layer.feature.properties) {
          const layerMileage = String(layer.feature.properties.里程數 || '').trim();
          const targetMileage = String(targetPoint.mileage || '').trim();
          if (layerMileage === targetMileage) {
            targetLayer = layer;
          }
        }
      });
      
      if (targetLayer && targetPoint.coordinates && targetPoint.coordinates.length === 2) {
        const [lng, lat] = targetPoint.coordinates;
        
        // 保存新的彈窗 layer
        this.currentMileagePopupLayer = targetLayer;
        
        // 先打開 popup（不移動地圖，避免畫面跳動）
        targetLayer.openPopup();
        
        // 檢查 popup 是否在地圖可見區域內
        const popup = targetLayer.getPopup();
        if (popup) {
          // 使用 Leaflet 的 autoPan 功能，但只在必要時移動地圖
          // 這樣可以減少不必要的畫面跳動
          const popupElement = popup.getElement();
          if (popupElement) {
            // 等待 popup 渲染完成
            requestAnimationFrame(() => {
              const popupRect = popupElement.getBoundingClientRect();
              const mapContainer = map.getContainer();
              const mapRect = mapContainer.getBoundingClientRect();
              
              // 檢查 popup 是否超出地圖邊界
              const padding = 20; // 邊距
              const isOutOfBounds = 
                popupRect.left < mapRect.left + padding ||
                popupRect.right > mapRect.right - padding ||
                popupRect.top < mapRect.top + padding ||
                popupRect.bottom > mapRect.bottom - padding;
              
              // 只有在 popup 超出邊界時才移動地圖
              if (isOutOfBounds) {
                // 計算目標點在地圖容器中的位置
                const targetPointPixel = map.latLngToContainerPoint([lat, lng]);
                const mapCenterPixel = map.latLngToContainerPoint(map.getCenter());
                
                // 計算需要移動的距離，使 popup 完全可見
                let offsetX = 0;
                let offsetY = 0;
                
                if (popupRect.left < mapRect.left + padding) {
                  offsetX = (mapRect.left + padding) - popupRect.left;
                } else if (popupRect.right > mapRect.right - padding) {
                  offsetX = (mapRect.right - padding) - popupRect.right;
                }
                
                if (popupRect.top < mapRect.top + padding) {
                  offsetY = (mapRect.top + padding) - popupRect.top;
                } else if (popupRect.bottom > mapRect.bottom - padding) {
                  offsetY = (mapRect.bottom - padding) - popupRect.bottom;
                }
                
                // 如果有偏移，調整地圖中心
                if (offsetX !== 0 || offsetY !== 0) {
                  const currentCenter = map.getCenter();
                  const pixelOffset = map.latLngToContainerPoint(currentCenter);
                  const newPixelPoint = L.point(
                    pixelOffset.x - offsetX,
                    pixelOffset.y - offsetY
                  );
                  const newCenter = map.containerPointToLatLng(newPixelPoint);
                  map.setView(newCenter, map.getZoom(), {
                    animate: true,
                    duration: 0.2
                  });
                }
              }
            });
          }
        }
      } else if (targetLayer) {
        // 如果沒有座標，直接打開 popup
        targetLayer.openPopup();
      }
    },
    // 處理顏色選擇器關閉
    handleColorPickerClose() {
      this.showColorPicker = false;
      // 重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 處理例行巡查模態框關閉
    handleRoutineInspectionModalClose() {
      this.showRoutineInspectionModal = false;
      // 重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 處理特別巡查模態框關閉
    handleSpecialInspectionModalClose() {
      this.showSpecialInspectionModal = false;
      // 重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 處理巡查記錄瀏覽頁面關閉
    handleInspectionRecordsViewClose() {
      this.showInspectionRecordsView = false;
      // 重新打開里程點彈窗
      this.reopenMileagePopup();
    },
    // 重新打開里程點彈窗
    reopenMileagePopup() {
      if (this.currentMileagePopupLayer) {
        // 使用 setTimeout 確保在下一幀執行，避免與其他動畫衝突
        setTimeout(() => {
          if (this.currentMileagePopupLayer) {
            // 重新生成彈窗內容（以更新按鈕文字）
            const feature = this.currentMileagePopupLayer.feature;
            if (feature) {
              const props = feature.properties || {};
              const [lng, lat] = feature.geometry.coordinates;
              
              // 檢查該位置是否已設置告警燈號
              const locationKey = `${parseFloat(lng).toFixed(7)},${parseFloat(lat).toFixed(7)}`;
              const hasAlertLight = !!this.alertLightMap[locationKey];
              const alertLightBtnText = hasAlertLight ? '取消告警燈號設置' : '告警燈號設置';
              const alertLightBtnColor = hasAlertLight ? '#ef4444' : '#3b82f6';
              const alertLightBtnHoverColor = hasAlertLight ? '#dc2626' : '#2563eb';
              
              // 重新生成彈窗內容（這裡只更新按鈕部分，其他部分保持不變）
              // 由於彈窗內容較複雜，我們直接重新打開，Leaflet 會使用之前設置的內容
              // 但為了更新按鈕，我們需要重新設置 popup 內容
              this.currentMileagePopupLayer.openPopup();
            } else {
              this.currentMileagePopupLayer.openPopup();
            }
          }
        }, 100);
      }
    },
    // 處理告警燈號面板關閉
    handleAlertLightPanelClose() {
      console.log('EarlyWarning: 收到收合事件，當前狀態:', this.showAlertLightStatusPanel);
      this.showAlertLightStatusPanel = false;
      console.log('EarlyWarning: 設置後狀態:', this.showAlertLightStatusPanel);
    },
    // 處理圖表面板收起狀態變化
    handleChartPanelCollapsedChanged(collapsed) {
      this.chartPanelCollapsed = collapsed;
      // 當面板收合狀態改變時，重新計算地圖尺寸以確保瓦片正確加載
      this.$nextTick(() => {
        // 等待動畫完成後再刷新地圖（動畫時長為 300ms）
        setTimeout(() => {
          if (this.$refs.projectMap?.map) {
            this.$refs.projectMap.map.invalidateSize();
            console.log('地圖尺寸已重新計算（面板收合狀態改變）');
          }
        }, 350); // 稍微延遲以確保動畫完成
      });
    },
    // 處理告警燈號點擊（從狀態面板）
    handleAlertLightClick(light) {
      // 定位到該告警燈號的位置
      if (this.$refs.projectMap?.map && light.latitude && light.longitude) {
        const lat = parseFloat(light.latitude);
        const lng = parseFloat(light.longitude);
        this.$refs.projectMap.map.setView([lat, lng], 17, {
          animate: true,
          duration: 0.5
        });
      }
    }
  }
}
</script>

<style scoped>
.card {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.dark .card {
  background-color: #1e293b;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.15);
}

/* 只针对 EarlyWarning 页面中的卡片移除右边框，不影响告警灯号状态面板 */
.early-warning-card {
  border-right: none !important;
}

.dark .text-gray-900 {
  color: #f1f5f9;
}

/* 模態框動畫 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}

/* 里程標籤樣式 */
:deep(.mileage-tooltip) {
  background-color: rgba(255, 255, 255, 0.95) !important;
  color: #1f2937 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  white-space: nowrap !important;
}

:deep(.mileage-tooltip::before) {
  border-top-color: rgba(0, 0, 0, 0.1) !important;
}
</style>
