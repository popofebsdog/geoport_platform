<template>
  <div class="w-full h-full relative">
    <div ref="mapContainer" class="w-full h-full" style="min-height: 400px; pointer-events: auto;"></div>
    
    <!-- 紅綠燈設置面板 -->
    <WarningLightSettingsPanel
      v-if="showWarningLightSettings"
      :warning-lights="warningLightMarkers.map(item => item.data)"
      @close="showWarningLightSettings = false"
      @update="handleWarningLightUpdate"
    />
  </div>
</template>

<script>
import L from 'leaflet'
import * as omnivore from 'leaflet-omnivore'
import proj4 from 'proj4'
import 'proj4leaflet'
import { BaseMapService } from '../../services/BaseMapService.js'
import GeologicalLayerService from '@/services/geologicalLayerService.js'
import TemporalDataMarker from '../temporal/TemporalDataMarker.vue'
import WarningLightMarker from './WarningLightMarker.vue'
import WarningLightSettingsPanel from './WarningLightSettingsPanel.vue'
import { generateWarningLightHTML } from '@/utils/warningLightMarkerHelper.js'

// 確保 proj4leaflet 正確加載
if (typeof window !== 'undefined') {
  window.proj4 = proj4
}

// 手動將 omnivore 掛載到 L
L.omnivore = omnivore

// 定義坐標系統 - 使用標準的 TWD97/TM2 zone 121 定義
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')

// 確保 WGS84 定義存在
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs')

// 測試坐標系統定義
console.log('TWD97 坐標系統定義:', proj4.defs('EPSG:3826'))
console.log('WGS84 坐標系統定義:', proj4.defs('EPSG:4326'))

// 測試坐標轉換
try {
  const testCoords = [291170.151664275676012, 2729797.045946272090077] // 用戶資料中的坐標
  console.log('測試坐標轉換:')
  console.log('輸入坐標 (TWD97):', testCoords)
  const result = proj4('EPSG:3826', 'EPSG:4326', testCoords)
  console.log('轉換結果 (WGS84):', result)
  console.log('Leaflet 格式:', [result[1], result[0]])
} catch (error) {
  console.error('坐標轉換測試失敗:', error)
}

// 創建 TWD97 坐標系統（簡化版本）
let TWD97 = null
try {
  TWD97 = new L.Proj.CRS('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', {
    resolutions: [
      156543.03392800014,
      78271.51696399994,
      39135.75848200009,
      19567.87924099992,
      9783.93962049996,
      4891.96981024998,
      2445.98490512499,
      1222.992452562495,
      611.4962262813797,
      305.74811314055756,
      152.87405657041106,
      76.43702828507324,
      38.21851414253662,
      19.10925707126831,
      9.554628535634155,
      4.77731426794937,
      2.388657133974685,
      1.1943285668550503,
      0.5971642835598172,
      0.29858214164761665
    ],
    origin: [0, 0],
    bounds: L.bounds([0, 0], [500000, 3000000])
  })
  console.log('TWD97 坐標系統創建成功')
} catch (error) {
  console.error('TWD97 坐標系統創建失敗:', error)
  TWD97 = L.CRS.EPSG4326 // 回退到 WGS84
}

// 確保 omnivore 正確加載
console.log('Leaflet 版本:', L.version)
console.log('omnivore 可用性:', !!L.omnivore)
console.log('omnivore.kml 可用性:', !!omnivore.kml)

// KML 顏色轉換函數（從 aabbggrr 格式轉換為 #rrggbb 格式）
const convertKMLColor = (kmlColor) => {
  if (!kmlColor || kmlColor.length !== 8) return '#ff0000'
  
  // KML 格式：aabbggrr，我們需要 rrggbb
  const r = kmlColor.substring(6, 8)
  const g = kmlColor.substring(4, 6)
  const b = kmlColor.substring(2, 4)
  
  return `#${r}${g}${b}`
}

export default {
  name: 'ProjectMap',
  components: {
    WarningLightMarker,
    WarningLightSettingsPanel
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
    activeChildProjectId: {
      type: String,
      default: null
    },
    geojsonData: {
      type: Object,
      default: null
    },
    featureUploads: {
      type: Object,
      default: () => ({})
    },
    potentialAnalysisLayer: {
      type: Object,
      default: null
    },
    loadedGeojsonLayers: {
      type: Object,
      default: () => ({})
    },
    layerVisibility: {
      type: Object,
      default: () => ({})
    },
    currentBaseMap: {
      type: Object,
      default: null
    },
    highwayMileageVisible: {
      type: Boolean,
      default: false
    },
    mileageLabelVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'map-ready',
    'feature-click',
    'map-click',
    'kml-loading-start',
    'kml-loading-complete',
    'kml-loading-error',
    'show-loading',
    'hide-loading',
    'toggle-highway-mileage',
    'toggle-mileage-label'
  ],
  data() {
    return {
      map: null,
      marker: null,
      childMarkers: [], // 子專案標記陣列
      childProjects: [], // 子專案列表
      geojsonLayer: null,
      geojsonLayers: {}, // 存儲多個 GeoJSON 圖層
      isRendering: false, // 防止重複渲染的標記
      layers: {
        street: null,
        satellite: null,
        emap: null, // 台灣通用地圖
        photo: null, // 台灣通用地圖正射影像
        geology50k: null // 1/50000 地質圖
      },
      currentLayer: 'emap', // 默認使用台灣通用地圖
      layerControl: null,
      highwayMileageControl: null, // 省道里程樁號控件
      zoomLevelControl: null, // 縮放層級滑動條控件
      _hasSetInitialView: false, // 追蹤是否已設置初始視圖
      customBaseMapLayer: null, // 自定義底圖圖層
      isCustomBaseMapActive: false, // 是否正在使用自定義底圖
      geologicalLayerService: null, // 地質圖層服務
      baseMapService: null, // 底圖服務
      wmsLayerActive: false, // WMS 圖層是否應該處於活躍狀態
      wmsLayerConfigs: null, // WMS 圖層配置
      wmsLayerSelectedLayers: null, // WMS 圖層選中狀態
      highwayMileageLayer: null, // 省道里程樁號圖層
      // ❌ 移除：highwayMileageVisible 和 mileageLabelVisible 已在 props 中定義，不應重複
      warningLightMarkers: [], // 紅綠燈標記陣列
      warningLightControl: null, // 紅綠燈設置控件
      showWarningLightSettings: false // 是否顯示紅綠燈設置面板
    }
  },
  watch: {
    // 監聽活躍子專案變化，重新渲染標記
    activeChildProjectId(newId, oldId) {
      if (newId !== oldId && this.isParentProject()) {
        console.log('活躍子專案變化，重新渲染標記:', { newId, oldId })
        this.addChildProjectMarkers()
      }
    },
    
    project: {
      async handler(newProject, oldProject) {
        // 檢查專案是否真的改變了（避免不必要的更新）
        const newProjectId = newProject?.projectId || newProject?.project_id
        const oldProjectId = oldProject?.projectId || oldProject?.project_id
        
        if (this.map && newProject && newProjectId !== oldProjectId) {
          console.log('專案改變，重置地圖視圖標記')
          // 重置初始視圖標記，允許重新定位
          this._hasSetInitialView = false
          
          // 等待一下確保專案類型已經判斷完成
          await this.$nextTick()
          this.updateMap()
        }
      },
      immediate: false
    },
    isDarkMode() {
      if (this.map) {
        this.updateMapStyle()
      }
    },
    // 禁用 geojsonData watcher，因為現在使用 loadedGeojsonLayers 系統
    // geojsonData: {
    //   handler() {
    //     if (this.map && this.geojsonData && this.geojsonData.geojson) {
    //       // GeoJSON 和 KML 文件
    //       this.addGeoJSONToMap(this.geojsonData.geojson)
    //     }
    //   },
    //   immediate: true
    // },
    loadedGeojsonLayers: {
      handler(newLayers) {
        if (this.map && Object.keys(newLayers).length > 0 && !this.isRendering) {
          // 只渲染新添加的圖層，不重新渲染所有圖層
          this.renderNewLayers(newLayers)
        }
      },
      deep: true
    },
    // 移除 layerVisibility watcher，避免與 updateLayerVisibility 衝突
    // layerVisibility: {
    //   handler(newVisibility) {
    //     if (this.map) {
    //       this.updateAllLayersVisibility(newVisibility)
    //     }
    //   },
    //   deep: true
    // },
    
    // 監聽底圖變更
    currentBaseMap: {
      handler(newBaseMap, oldBaseMap) {
        if (this.map) {
          // 避免重複載入相同的底圖
          if (newBaseMap && oldBaseMap && newBaseMap.id === oldBaseMap.id) {
            console.log('底圖未變更，跳過重新載入')
            return
          }
          this.switchToCustomBaseMap(newBaseMap)
        }
      }
    },
    highwayMileageVisible: {
      handler(newVisible) {
        console.log('[ProjectMap Watcher] highwayMileageVisible 變化:', newVisible, 'map:', !!this.map)
        if (this.map) {
          // ✅ 移除：不應該修改 prop 的值（單向數據流）
          // this.highwayMileageVisible = newVisible
          console.log('[ProjectMap Watcher] 開始切換圖層...')
          // 切換圖層
          this.toggleHighwayMileageLayer(newVisible)
          // 通知控件更新樣式
          this.map.fire('highway-mileage-visibility-changed')
          // 如果控件有更新方法，直接調用
          if (this.highwayMileageControl && this.highwayMileageControl.updateButtonStyle) {
            this.highwayMileageControl.updateButtonStyle()
          }
          console.log('[ProjectMap Watcher] 圖層切換完成')
        } else {
          console.warn('[ProjectMap Watcher] 地圖未初始化，無法處理 highwayMileageVisible 變化')
        }
      },
      immediate: false
    },
    mileageLabelVisible: {
      handler(newVisible) {
        if (this.map) {
          // ✅ 移除：不應該修改 prop 的值（單向數據流）
          // this.mileageLabelVisible = newVisible
          // 通知控件更新樣式
          this.map.fire('mileage-label-visibility-changed')
          // 如果控件有更新方法，直接調用
          if (this.mileageLabelControl && this.mileageLabelControl.updateButtonStyle) {
            this.mileageLabelControl.updateButtonStyle()
          }
        }
      },
      immediate: false
    }
  },
  mounted() {
    console.log('ProjectMap 組件已掛載')
    console.log('接收到的 project:', this.project)
    this.initMap()
  },
  
  created() {
    console.log('ProjectMap 組件已創建')
    console.log('接收到的 project:', this.project)
  },
  beforeUnmount() {
    try {
      // 清理紅綠燈標記
      this.clearWarningLightMarkers()
      
      // 清理子專案標記
      this.clearChildMarkers()
      
      // 清理地質圖層服務
      if (this.geologicalLayerService) {
        this.geologicalLayerService.destroy()
        this.geologicalLayerService = null
      }
      
      // 清理底圖服務
      if (this.baseMapService) {
        this.baseMapService.destroy()
        this.baseMapService = null
      }
      
      // 清理自定義底圖圖層
      if (this.customBaseMapLayer) {
        try {
          if (this.map && this.map.hasLayer && this.map.hasLayer(this.customBaseMapLayer)) {
            this.map.removeLayer(this.customBaseMapLayer)
          }
        } catch (error) {
          console.warn('清理自定義底圖圖層時發生錯誤:', error)
        }
        this.customBaseMapLayer = null
      }
      
      // 清理省道里程樁號圖層
      if (this.highwayMileageLayer) {
        try {
          if (this.map && this.map.hasLayer && this.map.hasLayer(this.highwayMileageLayer)) {
            this.map.removeLayer(this.highwayMileageLayer)
          }
        } catch (error) {
          console.warn('清理省道里程樁號圖層時發生錯誤:', error)
        }
        this.highwayMileageLayer = null
      }
      
      // 清理省道里程樁號控件
      if (this.highwayMileageControl) {
        try {
          if (this.map && this.map.hasControl && this.map.hasControl(this.highwayMileageControl)) {
            this.map.removeControl(this.highwayMileageControl)
          }
        } catch (error) {
          console.warn('清理省道里程樁號控件時發生錯誤:', error)
        }
        this.highwayMileageControl = null
      }
      
      // 清理紅綠燈設置控件
      if (this.warningLightControl) {
        try {
          if (this.map && this.map.hasControl && this.map.hasControl(this.warningLightControl)) {
            this.map.removeControl(this.warningLightControl)
          }
        } catch (error) {
          console.warn('清理紅綠燈設置控件時發生錯誤:', error)
        }
        this.warningLightControl = null
      }
      
      // 清理地圖
    if (this.map) {
        try {
          // 停止所有動畫和事件
          if (this.map.stop) {
            this.map.stop()
          }
          if (this.map.off) {
            this.map.off()
          }
          
          // 移除所有圖層
          if (this.map.eachLayer) {
            this.map.eachLayer((layer) => {
              try {
                this.map.removeLayer(layer)
              } catch (error) {
                console.warn('移除圖層時發生錯誤:', error)
              }
            })
          }
          
          // 銷毀地圖
          if (this.map.remove) {
      this.map.remove()
          }
        } catch (error) {
          console.warn('清理地圖時發生錯誤:', error)
        }
        this.map = null
      }
    } catch (error) {
      console.error('組件卸載時發生錯誤:', error)
    }
  },
  methods: {
    // 判斷是否應該使用 TWD97 坐標系統
    shouldUseTWD97() {
      // 檢查是否有 TWD97 坐標系統的圖層
      if (this.loadedGeojsonLayers && Object.keys(this.loadedGeojsonLayers).length > 0) {
        for (const layerId in this.loadedGeojsonLayers) {
          const layer = this.loadedGeojsonLayers[layerId]
          if (layer.srid === 3826) {
            return true
          }
        }
      }
      return false
    },

    // 將 TWD97 坐標轉換為 WGS84
    convertTWD97ToWGS84(geojson) {
      if (!geojson || !geojson.features) {
        return geojson
      }

      console.log('開始轉換 TWD97 GeoJSON，特徵數量:', geojson.features.length)
      
      const convertedGeoJSON = JSON.parse(JSON.stringify(geojson)) // 深拷貝

      convertedGeoJSON.features.forEach((feature, index) => {
        if (feature.geometry && feature.geometry.coordinates) {
          console.log(`轉換特徵 ${index + 1}:`, feature.geometry.type)
          feature.geometry.coordinates = this.convertCoordinates(feature.geometry.coordinates, feature.geometry.type)
        }
      })

      console.log('TWD97 轉換完成')
      return convertedGeoJSON
    },

    // 遞歸轉換坐標
    convertCoordinates(coords, geometryType) {
      if (geometryType === 'Point') {
        return this.convertPoint(coords)
      } else if (geometryType === 'LineString') {
        return coords.map(coord => this.convertPoint(coord))
      } else if (geometryType === 'Polygon') {
        return coords.map(ring => ring.map(coord => this.convertPoint(coord)))
      } else if (geometryType === 'MultiPoint') {
        return coords.map(coord => this.convertPoint(coord))
      } else if (geometryType === 'MultiLineString') {
        return coords.map(line => line.map(coord => this.convertPoint(coord)))
      } else if (geometryType === 'MultiPolygon') {
        return coords.map(polygon => polygon.map(ring => ring.map(coord => this.convertPoint(coord))))
      }
      return coords
    },

    // 轉換單個點坐標
    convertPoint(coords) {
      try {
        const [x, y] = coords
        
        // 只在第一個點時輸出詳細信息，避免日誌過多
        if (!this._firstPointConverted) {
          console.log('=== 開始轉換第一個 TWD97 坐標點 ===')
          console.log('轉換前 TWD97 坐標:', [x, y])
          console.log('proj4 定義檢查:')
          console.log('EPSG:3826 定義:', proj4.defs('EPSG:3826'))
          console.log('EPSG:4326 定義:', proj4.defs('EPSG:4326'))
        }
        
        const wgs84 = proj4('EPSG:3826', 'EPSG:4326', [x, y])
        
        if (!this._firstPointConverted) {
          console.log('proj4 轉換結果:', wgs84)
          console.log('轉換後 WGS84 坐標 [lng, lat]:', wgs84)
        }
        
        // proj4 返回 [lng, lat]，GeoJSON 標準格式也是 [lng, lat]
        const result = [wgs84[0], wgs84[1]] // 返回 [lng, lat] (GeoJSON 標準格式)
        
        if (!this._firstPointConverted) {
          console.log('GeoJSON 標準格式坐標 [lng, lat]:', result)
          console.log('=== 第一個坐標點轉換完成 ===')
          this._firstPointConverted = true
        }
        
        return result
      } catch (error) {
        console.error('坐標轉換失敗:', error, coords)
        console.error('錯誤詳情:', error.message)
        return coords // 如果轉換失敗，返回原始坐標
      }
    },

    // 測試坐標轉換
    testCoordinateConversion() {
      console.log('=== 測試坐標轉換 ===')
      
      // 測試實際的 TWD97 坐標點（來自用戶提供的資料）
      const testCoords1 = [291038.942551413550973, 2729773.20912585966289] // 用戶資料中的第一個點
      const testCoords2 = [250000, 2750000] // 台灣中部
      
      console.log('測試坐標1 (TWD97 - 用戶資料):', testCoords1)
      console.log('測試坐標2 (TWD97 - 台灣中部):', testCoords2)
      
      try {
        const wgs84_1 = proj4('EPSG:3826', 'EPSG:4326', testCoords1)
        const wgs84_2 = proj4('EPSG:3826', 'EPSG:4326', testCoords2)
        
        console.log('轉換結果1 (WGS84):', wgs84_1)
        console.log('轉換結果2 (WGS84):', wgs84_2)
        console.log('Leaflet 格式1:', [wgs84_1[1], wgs84_1[0]])
        console.log('Leaflet 格式2:', [wgs84_2[1], wgs84_2[0]])
        
        // 驗證轉換是否合理（台灣的經緯度範圍）
        const lat1 = wgs84_1[1]
        const lng1 = wgs84_1[0]
        const lat2 = wgs84_2[1]
        const lng2 = wgs84_2[0]
        
        if (lat1 >= 21 && lat1 <= 26 && lng1 >= 119 && lng1 <= 122) {
          console.log('✅ 坐標轉換結果1合理（在台灣範圍內）')
        } else {
          console.log('❌ 坐標轉換結果1不合理（超出台灣範圍）')
        }
        
        if (lat2 >= 21 && lat2 <= 26 && lng2 >= 119 && lng2 <= 122) {
          console.log('✅ 坐標轉換結果2合理（在台灣範圍內）')
        } else {
          console.log('❌ 坐標轉換結果2不合理（超出台灣範圍）')
        }
      } catch (error) {
        console.error('坐標轉換測試失敗:', error)
      }
      
      console.log('=== 測試結束 ===')
    },

    // 計算 GeoJSON 邊界
    calculateGeoJSONBounds(geojson) {
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        return null
      }

      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity

      geojson.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = this.extractAllCoordinates(feature.geometry)
          coords.forEach((coord) => {
            // 對每個坐標進行轉換（從 TWD97 轉換為 WGS84）
            const convertedCoord = this.convertPoint(coord)
            const [lng, lat] = convertedCoord // convertPoint 現在返回 [lng, lat] 格式
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
          })
        }
      })

      return {
        south: minLat,
        north: maxLat,
        west: minLng,
        east: maxLng
      }
    },

    // 提取幾何體中的所有坐標
    extractAllCoordinates(geometry) {
      const coords = []
      
      if (geometry.type === 'Point') {
        coords.push(geometry.coordinates)
      } else if (geometry.type === 'LineString') {
        coords.push(...geometry.coordinates)
      } else if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => {
          coords.push(...ring)
        })
      } else if (geometry.type === 'MultiLineString') {
        geometry.coordinates.forEach(line => {
          coords.push(...line)
        })
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            coords.push(...ring)
          })
        })
      }
      
      return coords
    },

    initMap() {
      console.log('=== 開始初始化地圖 ===')
      console.log('初始化地圖')
      console.log('地圖容器:', this.$refs.mapContainer)
      console.log('專案位置:', this.project?.location)
      
      // 檢查地圖容器尺寸
      if (this.$refs.mapContainer) {
        const rect = this.$refs.mapContainer.getBoundingClientRect()
        console.log('地圖容器尺寸:', {
          width: rect.width,
          height: rect.height,
          clientWidth: this.$refs.mapContainer.clientWidth,
          clientHeight: this.$refs.mapContainer.clientHeight
        })
      }
      
      try {
        // 使用標準的 WGS84 坐標系統（Leaflet 默認）
        console.log('使用坐標系統: WGS84 (Leaflet 標準)')
        
        // 設置地圖中心點（WGS84）
        const center = [this.project?.location?.lat || 24.8186, this.project?.location?.lng || 121.2681]
        const zoom = 15
        
        this.map = L.map(this.$refs.mapContainer, {
          center: center,
          zoom: zoom,
          minZoom: 1,
          maxZoom: 20, // 支援到 20 層級
          zoomControl: false, // 禁用默認縮放控制
          dragging: true, // 啟用滑鼠拖動
          touchZoom: true, // 啟用觸摸縮放
          doubleClickZoom: true, // 啟用雙擊縮放
          scrollWheelZoom: true, // 啟用滾輪縮放
          boxZoom: true, // 啟用框選縮放
          keyboard: true, // 啟用鍵盤導航
          // 不指定 crs，使用 Leaflet 默認的 WGS84
        })
        
        console.log('地圖創建成功:', this.map)
        
        // 測試坐標轉換
        this.testCoordinateConversion()
        
        // 檢查地圖尺寸
        setTimeout(() => {
          if (this.map) {
            const size = this.map.getSize()
            console.log('地圖尺寸:', size)
            console.log('地圖中心:', this.map.getCenter())
            console.log('地圖縮放級別:', this.map.getZoom())
          }
        }, 100)
      } catch (error) {
        console.error('地圖初始化失敗:', error)
        // 回退到基本的 WGS84 地圖
      this.map = L.map(this.$refs.mapContainer, {
        center: [this.project?.location?.lat || 24.8186, this.project?.location?.lng || 121.2681],
        zoom: 15,
        minZoom: 1,
        maxZoom: 20, // 支援到 20 層級
        zoomControl: false,
        dragging: true, // 啟用滑鼠拖動
        touchZoom: true, // 啟用觸摸縮放
        doubleClickZoom: true, // 啟用雙擊縮放
        scrollWheelZoom: true, // 啟用滾輪縮放
        boxZoom: true, // 啟用框選縮放
        keyboard: true // 啟用鍵盤導航
      })
        console.log('使用回退地圖配置')
      }
      
      console.log('地圖已創建:', this.map)

      this.initLayers()
      this.addDefaultLayer()
      this.addLayerControl() // ✅ 圖層切換控制器（台灣通用地圖/正射影像/地質圖）
      // this.addHighwayMileageControl() // ❌ 移除：里程點應該常駐顯示，不需要切換按鈕
      // this.addWarningLightControl() // ❌ 移除：僅預警模組使用
      this.addMileageLabelControl() // ✅ 里程數字標籤切換控件（顯示/隱藏 084K+100 這類數字）
      this.addZoomLevelControl() // 添加縮放層級滑動條（在比例尺上方）
      this.addScaleControl() // 添加比例尺（在底部）
      this.addProjectMarker()

      // 初始化地質圖層服務
      this.geologicalLayerService = new GeologicalLayerService(this.map)

      // 添加點擊事件
      this.map.on('click', (e) => {
        this.$emit('map-click', e)
      })

      // 監聽縮放事件，控制紅綠燈標記顯示
      this.map.on('zoomend', () => {
        this.updateWarningLightMarkersVisibility()
      })
      
      // 初始化紅綠燈標記（不自動定位，由父組件控制）
      // this.initWarningLightMarkers()
      
      // 初始化底圖服務
      this.baseMapService = new BaseMapService()
      console.log('BaseMapService 已初始化')
      
      // 設置地圖到服務中
      this.baseMapService.setMap(this.map)
      console.log('BaseMapService 地圖已設置')
      
      // 通知父組件 baseMapService 已準備好
      console.log('發送 base-map-service-ready 事件')
      this.$emit('base-map-service-ready', this.baseMapService)
      
      // 發送地圖準備就緒事件
      this.$emit('map-ready', this.map)
      
      // 延遲執行地圖更新，確保父組件有機會完成專案類型判斷
      setTimeout(() => {
        // 觸發地圖更新（會在專案類型判斷完成後進行正確的定位）
        if (this.project && this.map) {
          console.log('延遲執行 updateMap，確保專案類型已判斷')
          this.updateMap()
        }
      }, 100)
      
      // 強制刷新地圖以確保正確顯示
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize()
          console.log('地圖已強制刷新')
        }
      }, 200)
      
      console.log('=== 地圖初始化完成 ===')
    },

    initLayers() {
      // 街道地圖 - 使用簡單的 OpenStreetMap 服務
      this.layers.street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 20,
        maxNativeZoom: 18, // 原生支援到 18 層級
        minZoom: 1,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })

      // 衛星圖像 - 使用簡單的服務
      this.layers.satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 20,
        maxNativeZoom: 18, // 原生支援到 18 層級
        minZoom: 1,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })

      // 台灣通用地圖 (EMAP)
      this.layers.emap = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '© NLSC',
        maxZoom: 20,
        minZoom: 1,
        tileSize: 256,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })

      // 台灣通用地圖正射影像 (PHOTO2)
      this.layers.photo = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        attribution: '© NLSC',
        maxZoom: 20,
        minZoom: 1,
        tileSize: 256,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })

      // 1/50000 地質圖（使用 WMS 服務，合併地層和地層名稱）
      // 創建一個組合圖層，包含地層和地層名稱兩個 WMS 圖層
      const geology50kBaseLayer = L.tileLayer.wms('https://geomap.gsmma.gov.tw/mapguide/mapagent/mapagent.fcgi?', {
        layers: 'WMS/50K_Geomap_strata,WMS/50K_Geomap_lable',
        format: 'image/png',
        version: '1.0.0',
        crs: L.CRS.EPSG4326,
        transparent: true,
        opacity: 0.8,
        attribution: '© 經濟部地質調查及礦業管理中心',
        maxZoom: 18,
        minZoom: 1,
        tileSize: 256,
        srs: 'EPSG:4326',
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })
      this.layers.geology50k = geology50kBaseLayer
    },

    addDefaultLayer() {
      // 默認使用台灣通用地圖
      if (this.layers.emap) {
        this.layers.emap.addTo(this.map)
        this.currentLayer = 'emap'
        
        // 添加瓦片載入事件監聽
        this.layers.emap.on('tileload', (e) => {
          console.log('台灣通用地圖瓦片載入成功:', e.tile.src)
        })
        
        this.layers.emap.on('tileerror', (e) => {
          console.error('台灣通用地圖瓦片載入失敗:', e.tile.src, e.error)
        })
        
        this.layers.emap.on('loading', () => {
          console.log('開始載入台灣通用地圖瓦片')
        })
        
        this.layers.emap.on('load', () => {
          console.log('台灣通用地圖瓦片載入完成')
        })
      } else if (this.layers.photo) {
        // 回退到台灣正射影像
        this.layers.photo.addTo(this.map)
        this.currentLayer = 'photo'
      } else if (this.layers.geology50k) {
        // 回退到地質圖
        this.layers.geology50k.addTo(this.map)
        this.currentLayer = 'geology50k'
      } else if (this.layers.street) {
        // 最後回退到街道地圖
        this.layers.street.addTo(this.map)
        this.currentLayer = 'street'
      }
    },

    addLayerControl() {
      // 只顯示台灣地圖圖層（順序：通用地圖 > 正射影像 > 地質圖）
      const baseLayers = {
        '台灣通用地圖': this.layers.emap,
        '台灣通用地圖正射影像': this.layers.photo,
        '1/50000 地質圖': this.layers.geology50k
      }

      this.layerControl = L.control.layers(baseLayers, null, {
        position: 'topright',
        collapsed: true
      }).addTo(this.map)

      // 監聽圖層切換事件（Leaflet 會自動處理底圖切換）
      this.map.on('baselayerchange', (e) => {
        // 更新當前圖層標記
        if (e.layer === this.layers.photo) {
          this.currentLayer = 'photo'
          console.log('已切換至台灣通用地圖正射影像')
        } else if (e.layer === this.layers.geology50k) {
          this.currentLayer = 'geology50k'
          console.log('已切換至 1/50000 地質圖')
        } else if (e.layer === this.layers.emap) {
          this.currentLayer = 'emap'
          console.log('已切換至台灣通用地圖')
        }
        
        // 如果有自定義底圖，確保它在基本底圖之上
        if (this.customBaseMapLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          if (this.customBaseMapLayer.bringToFront) {
            this.customBaseMapLayer.bringToFront()
            console.log('已將自定義底圖置於最上層')
          }
        }
      })
    },

    addHighwayMileageControl() {
      // 創建省道里程樁號切換控件
      const self = this
      const HighwayMileageControl = L.Control.extend({
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'highway-mileage-control')
          container.style.marginTop = '10px'
          
          // 創建按鈕（使用與 ProjectTitleBar 相同的樣式）
          const button = L.DomUtil.create('button', 'icon-button', container)
          button.type = 'button'
          button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            border-width: 1px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            cursor: pointer;
            padding: 0;
            background-color: ${self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'};
            border-color: ${self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'};
            color: ${self.isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'};
          `
          
          // 更新按鈕樣式的函數
          const updateButtonStyle = () => {
            const isVisible = self.highwayMileageVisible || self.$props.highwayMileageVisible || false
            button.title = isVisible ? '隱藏省道里程樁號' : '顯示省道里程樁號'
            
            // 根據可見性和主題更新樣式
            if (isVisible) {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
              button.style.borderColor = self.isDarkMode ? 'rgb(100, 116, 139)' : 'rgb(209, 213, 219)'
              button.style.color = self.isDarkMode ? 'rgb(255, 255, 255)' : 'rgb(31, 41, 55)'
            } else {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
              button.style.borderColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'
              button.style.color = self.isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
            }
            
            // 更新圖標（使用定位圖標）
              button.innerHTML = `
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              `
          }
          
          // 添加 hover 效果
          button.addEventListener('mouseenter', () => {
            if (self.highwayMileageVisible || self.$props.highwayMileageVisible) {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(100, 116, 139)' : 'rgb(229, 231, 235)'
            } else {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
            }
          })
          
          button.addEventListener('mouseleave', () => {
            updateButtonStyle()
          })
          
          button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)'
          })
          
          button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)'
          })
          
          // 初始樣式
          updateButtonStyle()
          
          // 點擊事件 - 通知父組件切換狀態
          L.DomEvent.on(button, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            
            console.log('[ProjectMap] 省道里程樁號按鈕被點擊')
            console.log('[ProjectMap] 當前狀態:', self.highwayMileageVisible)
            
            // 直接發射事件，讓父組件處理狀態切換
            // 父組件會更新 prop，然後觸發 watcher
            self.$emit('toggle-highway-mileage')
            console.log('[ProjectMap] 已發出 toggle-highway-mileage 事件')
          })
          
          // 監聽可見性變化
          map.on('highway-mileage-visibility-changed', () => {
            updateButtonStyle()
          })
          
          // 保存更新函數到控件實例
          this.updateButtonStyle = updateButtonStyle
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          
          return container
        }
      })
      
      this.highwayMileageControl = new HighwayMileageControl({
        position: 'topright'
      }).addTo(this.map)
    },

    addWarningLightControl() {
      // 創建選擇里程點設置控件
      const self = this
      const WarningLightControl = L.Control.extend({
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'warning-light-control')
          container.style.marginTop = '10px'
          
          // 創建按鈕
          const button = L.DomUtil.create('button', 'icon-button', container)
          button.type = 'button'
          button.title = '選擇里程點設置'
          button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            border-width: 1px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            cursor: pointer;
            padding: 0;
            background-color: ${self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'};
            border-color: ${self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'};
            color: ${self.isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'};
          `
          
          // 添加里程點設置圖標（使用地圖標記圖標）
          button.innerHTML = `
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          `
          
          // 添加 hover 效果
          button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
            button.style.transform = 'scale(1.05)'
          })
          
          button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
            button.style.transform = 'scale(1)'
          })
          
          button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)'
          })
          
          button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)'
          })
          
          // 點擊事件 - 打開設置面板
          L.DomEvent.on(button, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            self.showWarningLightSettings = true
          })
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          
          return container
        }
      })
      
      this.warningLightControl = new WarningLightControl({
        position: 'topright'
      }).addTo(this.map)
    },

    addMileageLabelControl() {
      // 創建里程標籤顯示切換控件
      const self = this
      const MileageLabelControl = L.Control.extend({
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'mileage-label-control')
          container.style.marginTop = '10px'
          
          // 創建按鈕
          const button = L.DomUtil.create('button', 'icon-button', container)
          button.type = 'button'
          button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            border-width: 1px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            cursor: pointer;
            padding: 0;
            background-color: ${self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'};
            border-color: ${self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'};
            color: ${self.isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'};
          `
          
          // 更新按鈕樣式的函數
          const updateButtonStyle = () => {
            const isVisible = self.mileageLabelVisible || self.$props.mileageLabelVisible || false
            button.title = `里程數字：${isVisible ? '開啟' : '關閉'}`
            
            // 根據可見性和主題更新樣式
            if (isVisible) {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(37, 99, 235)' : 'rgb(37, 99, 235)'
              button.style.borderColor = self.isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(59, 130, 246)'
              button.style.color = 'rgb(255, 255, 255)'
            } else {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
              button.style.borderColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'
              button.style.color = self.isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
            }
            
            // 更新圖標
            if (isVisible) {
              button.innerHTML = `
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                </svg>
              `
            } else {
              button.innerHTML = `
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
              `
            }
          }
          
          // 添加 hover 效果
          button.addEventListener('mouseenter', () => {
            const isVisible = self.mileageLabelVisible || self.$props.mileageLabelVisible || false
            if (isVisible) {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(29, 78, 216)'
            } else {
              button.style.backgroundColor = self.isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
            }
            button.style.transform = 'scale(1.05)'
          })
          
          button.addEventListener('mouseleave', () => {
            updateButtonStyle()
            button.style.transform = 'scale(1)'
          })
          
          button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)'
          })
          
          button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)'
          })
          
          // 初始樣式
          updateButtonStyle()
          
          // 點擊事件 - 通知父組件切換狀態
          L.DomEvent.on(button, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            self.$emit('toggle-mileage-label')
          })
          
          // 監聽可見性變化
          map.on('mileage-label-visibility-changed', () => {
            updateButtonStyle()
          })
          
          // 保存更新函數到控件實例
          this.updateButtonStyle = updateButtonStyle
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          
          return container
        }
      })
      
      this.mileageLabelControl = new MileageLabelControl({
        position: 'topright'
      }).addTo(this.map)
    },

    addScaleControl() {
      L.control.scale({
        position: 'bottomright',
        metric: true,
        imperial: false
      }).addTo(this.map)
    },

    addZoomLevelControl() {
      // 創建自定義縮放級別控制（使用滑動條）
      const self = this
      const ZoomLevelControl = L.Control.extend({
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'leaflet-control-zoom-level')
          container.style.background = self.isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'
          container.style.border = '1px solid rgba(0,0,0,0.2)'
          container.style.borderRadius = '4px'
          container.style.padding = '8px 12px'
          container.style.minWidth = '220px'
          container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)'
          container.style.userSelect = 'none'
          
          // 創建標籤顯示當前縮放級別
          const label = L.DomUtil.create('div', 'zoom-level-label', container)
          label.style.fontSize = '11px'
          label.style.fontWeight = 'bold'
          label.style.color = self.isDarkMode ? '#e2e8f0' : '#333'
          label.style.marginBottom = '6px'
          label.style.textAlign = 'center'
          label.textContent = `縮放: ${map.getZoom()}`
          
          // 創建滑動條容器（包含按鈕和滑動條）
          const sliderContainer = L.DomUtil.create('div', 'zoom-slider-container', container)
          sliderContainer.style.display = 'flex'
          sliderContainer.style.alignItems = 'center'
          sliderContainer.style.gap = '8px'
          
          // 創建減號按鈕
          const minusBtn = L.DomUtil.create('button', 'zoom-minus-btn', sliderContainer)
          minusBtn.textContent = '−'
          minusBtn.style.width = '28px'
          minusBtn.style.height = '28px'
          minusBtn.style.borderRadius = '4px'
          minusBtn.style.border = '1px solid rgba(0,0,0,0.2)'
          minusBtn.style.background = self.isDarkMode ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
          minusBtn.style.color = self.isDarkMode ? '#e2e8f0' : '#333'
          minusBtn.style.fontSize = '18px'
          minusBtn.style.fontWeight = 'bold'
          minusBtn.style.cursor = 'pointer'
          minusBtn.style.display = 'flex'
          minusBtn.style.alignItems = 'center'
          minusBtn.style.justifyContent = 'center'
          minusBtn.style.outline = 'none'
          minusBtn.style.transition = 'all 0.2s'
          
          // 減號按鈕 hover 效果
          minusBtn.addEventListener('mouseenter', () => {
            minusBtn.style.background = self.isDarkMode ? 'rgba(100, 116, 139, 0.8)' : 'rgba(209, 213, 219, 0.8)'
          })
          minusBtn.addEventListener('mouseleave', () => {
            minusBtn.style.background = self.isDarkMode ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
          })
          
          // 創建滑動條
          const sliderWrapper = L.DomUtil.create('div', 'zoom-slider-wrapper', sliderContainer)
          sliderWrapper.style.flex = '1'
          sliderWrapper.style.position = 'relative'
          sliderWrapper.style.display = 'flex'
          sliderWrapper.style.alignItems = 'center'
          
          const slider = L.DomUtil.create('input', 'zoom-level-slider', sliderWrapper)
          slider.type = 'range'
          slider.min = '1'
          slider.max = '20'
          slider.value = map.getZoom()
          slider.style.width = '100%'
          slider.style.height = '6px'
          slider.style.borderRadius = '3px'
          slider.style.outline = 'none'
          slider.style.cursor = 'pointer'
          slider.style.background = 'transparent'
          slider.style.margin = '0'
          slider.style.padding = '0'
          
          // 滑動條樣式（WebKit）
          slider.style.webkitAppearance = 'none'
          slider.style.appearance = 'none'
          
          // 滑動條軌道樣式
          const style = document.createElement('style')
          style.textContent = `
            .zoom-level-slider {
              margin: 0;
              padding: 0;
            }
            .zoom-level-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 8px;
              height: 18px;
              border-radius: 2px;
              background: ${self.isDarkMode ? '#3b82f6' : '#2563eb'};
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              margin-top: -6px;
            }
            .zoom-level-slider::-moz-range-thumb {
              width: 8px;
              height: 18px;
              border-radius: 2px;
              background: ${self.isDarkMode ? '#3b82f6' : '#2563eb'};
              cursor: pointer;
              border: none;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            .zoom-level-slider::-webkit-slider-runnable-track {
              height: 6px;
              background: ${self.isDarkMode ? '#475569' : '#e2e8f0'};
              border-radius: 3px;
            }
            .zoom-level-slider::-moz-range-track {
              height: 6px;
              background: ${self.isDarkMode ? '#475569' : '#e2e8f0'};
              border-radius: 3px;
            }
          `
          document.head.appendChild(style)
          
          // 創建加號按鈕
          const plusBtn = L.DomUtil.create('button', 'zoom-plus-btn', sliderContainer)
          plusBtn.textContent = '+'
          plusBtn.style.width = '28px'
          plusBtn.style.height = '28px'
          plusBtn.style.borderRadius = '4px'
          plusBtn.style.border = '1px solid rgba(0,0,0,0.2)'
          plusBtn.style.background = self.isDarkMode ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
          plusBtn.style.color = self.isDarkMode ? '#e2e8f0' : '#333'
          plusBtn.style.fontSize = '18px'
          plusBtn.style.fontWeight = 'bold'
          plusBtn.style.cursor = 'pointer'
          plusBtn.style.display = 'flex'
          plusBtn.style.alignItems = 'center'
          plusBtn.style.justifyContent = 'center'
          plusBtn.style.outline = 'none'
          plusBtn.style.transition = 'all 0.2s'
          
          // 加號按鈕 hover 效果
          plusBtn.addEventListener('mouseenter', () => {
            plusBtn.style.background = self.isDarkMode ? 'rgba(100, 116, 139, 0.8)' : 'rgba(209, 213, 219, 0.8)'
          })
          plusBtn.addEventListener('mouseleave', () => {
            plusBtn.style.background = self.isDarkMode ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
          })
          
          // 更新標籤的函數
          const updateLabel = (zoom) => {
            label.textContent = `縮放: ${zoom}`
          }
          
          // 更新縮放級別的函數
          const updateZoom = (delta) => {
            const currentZoom = map.getZoom()
            const newZoom = Math.max(1, Math.min(20, Math.round(currentZoom + delta)))
            map.setZoom(newZoom)
            slider.value = newZoom
            updateLabel(newZoom)
          }
          
          // 減號按鈕事件
          L.DomEvent.on(minusBtn, 'click', function(e) {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            updateZoom(-1)
          })
          
          // 加號按鈕事件
          L.DomEvent.on(plusBtn, 'click', function(e) {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            updateZoom(1)
          })
          
          // 滑動條事件監聽
          L.DomEvent.on(slider, 'input', function(e) {
            const zoom = parseInt(e.target.value)
            updateLabel(zoom)
            map.setZoom(zoom)
          })
          
          // 監聽地圖縮放變化，同步滑動條
          map.on('zoomend', function() {
            const currentZoom = map.getZoom()
              const clampedZoom = Math.max(1, Math.min(20, Math.round(currentZoom)))
            if (slider.value != clampedZoom) {
              slider.value = clampedZoom
              updateLabel(clampedZoom)
            }
          })
          
          // 防止地圖事件冒泡
          L.DomEvent.disableClickPropagation(container)
          L.DomEvent.disableScrollPropagation(container)
          
          // 初始化標籤
          updateLabel(map.getZoom())
          
          return container
        },
        
        onRemove: function(map) {
          // 清理工作
        }
      })
      
      // 添加控制到地圖（bottomright，在比例尺上方）
      this.zoomLevelControl = new ZoomLevelControl({ position: 'bottomright' }).addTo(this.map)
    },

    // 判斷是否是母專案
    isParentProject() {
      return this.project?.is_parent === true || 
             (this.project?.parent_project_id === null || this.project?.parent_project_id === undefined)
    },

    // 載入子專案列表
    async loadChildProjects() {
      if (!this.isParentProject()) {
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
          
          // 創建子專案標記
          this.addChildProjectMarkers()
        }
      } catch (error) {
        console.error('載入子專案失敗:', error)
      }
    },

    // 添加子專案標記
    addChildProjectMarkers() {
      // 清除現有的子專案標記
      this.clearChildMarkers()
      
      this.childProjects.forEach(childProject => {
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
        
        // 只有當有有效座標時才創建標記
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          this.createChildProjectMarker(childProject, lat, lng)
        }
      })
      
      // 所有標記創建完成後，如果是母專案且還沒有設置初始視圖，調整地圖視圖以包含所有子專案
      if (this.isParentProject() && this.childMarkers.length > 0 && !this._hasSetInitialView) {
        this.$nextTick(() => {
          const group = new L.featureGroup(this.childMarkers)
          const bounds = group.getBounds()
          
          if (bounds.isValid()) {
            // 使用 fitBounds 包含所有子專案，自動調整縮放層級
            this.map.fitBounds(bounds, { padding: [50, 50] })
            this._hasSetInitialView = true
            console.log('母專案地圖定位完成 - 包含所有子專案:', {
              markersCount: this.childMarkers.length,
              bounds: bounds.toBBoxString(),
              zoom: this.map.getZoom()
            })
          }
        })
      }
    },

    // 創建單個子專案標記
    createChildProjectMarker(childProject, lat, lng) {
      const orderNumber = childProject.orderNumber || 1
      const isActive = this.activeChildProjectId === childProject.project_id
      
      // 根據是否為活躍子專案選擇不同的樣式
      const iconColor = isActive ? '#f59e0b' : '#3b82f6' // 活躍：橙色，普通：藍色
      const size = isActive ? 44 : 32 // 活躍：更大
      const fontSize = isActive ? 18 : 14
      const borderWidth = isActive ? 4 : 3
      const pulseAnimation = isActive ? `
        @keyframes pulse-active {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7), 0 2px 8px rgba(0, 0, 0, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0), 0 2px 12px rgba(0, 0, 0, 0.4); }
        }
        animation: pulse-active 2s ease-in-out infinite;
      ` : ''

      // 創建自定義圖標
      const customIcon = L.divIcon({
        className: `custom-child-project-marker ${isActive ? 'active-child-marker' : ''}`,
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${iconColor} 0%, ${isActive ? '#ea580c' : '#2563eb'} 100%);
            border: ${borderWidth}px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: ${fontSize}px;
            color: white;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: transform 0.2s ease;
            ${pulseAnimation}
            z-index: ${isActive ? 1000 : 500};
            position: relative;
          " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            ${orderNumber}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2)]
      })

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: isActive ? 1000 : 0
      }).addTo(this.map)
      
      // 儲存子專案 ID 到標記上，方便後續更新
      marker.childProjectId = childProject.project_id

      // 添加彈出窗口
      const popupContent = `
        <div class="project-popup">
          <h3 class="font-bold text-lg mb-2">${childProject.name || '未命名專案'}</h3>
          <p class="text-sm text-gray-600 mb-2">${childProject.description || '無描述'}</p>
          ${childProject.event_date ? `<p class="text-xs text-gray-500">事件日期: ${this.formatEventDate(childProject.event_date)}</p>` : ''}
          <p class="text-xs text-gray-500">座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
        </div>
      `
      marker.bindPopup(popupContent)

      this.childMarkers.push(marker)
    },

    // 清除子專案標記
    clearChildMarkers() {
      this.childMarkers.forEach(marker => {
        if (this.map && this.map.hasLayer(marker)) {
          this.map.removeLayer(marker)
        }
      })
      this.childMarkers = []
    },

    // 生成紅綠燈標記的HTML
    generateWarningLightHTML(lightData, zoom = 16) {
      const { routeName, currentLevel, currentLevelName, isRedLightOn, showSpecialAlert, specialAlertCountdown } = lightData
      
      // 根據縮放層級計算縮放比例（16層級為基準1.0，每增加1層級放大1.2倍）
      // 整體縮小20%（乘以0.8）
      const scaleFactor = Math.pow(1.2, zoom - 16) * 0.8
      
      // 基礎尺寸
      const baseLightSize = 12
      const baseFontSize = 10
      const basePadding = 6
      
      // 根據縮放層級調整尺寸
      const lightSize = Math.round(baseLightSize * scaleFactor)
      const fontSize = Math.max(8, Math.round(baseFontSize * scaleFactor))
      const smallFontSize = Math.max(7, Math.round(8 * scaleFactor))
      const padding = Math.round(basePadding * scaleFactor)
      const containerMinWidth = Math.round(70 * scaleFactor)
      const containerMaxWidth = Math.round(90 * scaleFactor)
      
      const getColorStyle = (colorClass) => {
        const colorMap = {
          'text-green-400': 'color: #4ade80;',
          'text-yellow-400': 'color: #facc15;',
          'text-red-400': 'color: #f87171;',
          'text-gray-400': 'color: #9ca3af;'
        }
        return colorMap[colorClass] || 'color: #9ca3af;'
      }
      
      return `
        <div class="warning-light-marker-container" style="pointer-events: none; position: relative;">
          <div style="background-color: transparent; border-radius: 0.5rem; padding: ${padding}px; text-align: center; min-width: ${containerMinWidth}px; max-width: ${containerMaxWidth}px; position: relative;">
            <!-- 路線資訊 -->
            <h4 style="color: #000; font-weight: 500; font-size: ${fontSize}px; line-height: 1.2; margin-bottom: ${Math.round(4 * scaleFactor)}px;">${routeName || ''}</h4>
            
            <!-- 紅綠燈顯示 -->
            <div style="display: flex; justify-content: center; margin-bottom: ${Math.round(4 * scaleFactor)}px;">
              <div 
                style="background-color: rgba(31, 41, 55, 0.8); border-radius: 0.5rem; padding: ${Math.round(4 * scaleFactor)}px; border: ${Math.round(2 * scaleFactor)}px solid ${showSpecialAlert ? '#ef4444' : '#4b5563'}; ${showSpecialAlert ? 'box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);' : ''}"
              >
                <!-- 紅燈 (上) -->
                <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
                  <div 
                    style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${isRedLightOn ? 'background-color: #ef4444; border-color: #fca5a5; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                  ></div>
                </div>
                
                <!-- 黃燈 (中) -->
                <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
                  <div 
                    style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${currentLevel === 'yellow' ? 'background-color: #facc15; border-color: #fde047; box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                  ></div>
                </div>
                
                <!-- 綠燈 (下) -->
                <div>
                  <div 
                    style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${currentLevel === 'green' ? 'background-color: #22c55e; border-color: #86efac; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                  ></div>
                </div>
              </div>
            </div>
            
            <!-- 特殊告警倒計時（僅在告警時顯示） -->
            ${showSpecialAlert ? `<div style="font-size: ${Math.max(6, Math.round(7 * scaleFactor))}px; color: #f87171; margin-top: ${Math.round(2 * scaleFactor)}px; font-weight: 500; text-align: center;">(${specialAlertCountdown}s)</div>` : ''}
          </div>
        </div>
      `
    },

    // 初始化紅綠燈標記
    initWarningLightMarkers() {
      // 清除現有標記
      this.clearWarningLightMarkers()
      
      // 測試數據：可以在這裡從API獲取紅綠燈位置
      const testWarningLights = [
        {
          lat: 24.8186,
          lng: 121.2681,
          routeName: '台7線',
          currentLevel: 'green',
          currentLevelName: '預警綠燈',
          currentLevelColor: 'text-green-400',
          isRedLightOn: false,
          showSpecialAlert: false,
          specialAlertCountdown: 0
        },
        {
          lat: 24.8200,
          lng: 121.2700,
          routeName: '台7線',
          currentLevel: 'yellow',
          currentLevelName: '預警黃燈',
          currentLevelColor: 'text-yellow-400',
          isRedLightOn: false,
          showSpecialAlert: false,
          specialAlertCountdown: 0
        }
      ]
      
      testWarningLights.forEach(lightData => {
        this.createWarningLightMarker(lightData)
      })
      
      // 初始顯示狀態
      this.updateWarningLightMarkersVisibility()
      
      // 移除自動定位邏輯，避免與父組件（EarlyWarning.vue）的地圖定位衝突
      // 地圖定位由父組件的 updateMapForRegion -> fitMapToRoadData 控制
      // 定位到第一個紅綠燈位置（縮放層級17）
      // if (testWarningLights.length > 0 && this.map) {
      //   const firstLight = testWarningLights[0]
      //   this.$nextTick(() => {
      //     this.map.setView([firstLight.lat, firstLight.lng], 17)
      //     console.log('已定位到紅綠燈位置:', firstLight.lat, firstLight.lng, '縮放層級: 17')
      //   })
      // }
    },

    // 創建單個紅綠燈標記
    createWarningLightMarker(lightData) {
      const { lat, lng } = lightData
      
      if (!lat || !lng || !this.map) {
        return
      }
      
      // 使用工具函數生成HTML
      const currentZoom = this.map.getZoom()
      const markerHTML = generateWarningLightHTML(lightData, currentZoom)
      
      // 整體縮小20%（乘以0.8）
      const scaleFactor = Math.pow(1.2, currentZoom - 16) * 0.8
      const containerMaxWidth = Math.round(90 * scaleFactor)
      // 估算高度（路線名稱 + 紅綠燈）
      const estimatedHeight = Math.round((10 + 40) * scaleFactor)
      
      const customIcon = L.divIcon({
        className: 'warning-light-marker-icon',
        html: markerHTML,
        iconSize: [containerMaxWidth, estimatedHeight],
        iconAnchor: [containerMaxWidth / 2, estimatedHeight], // 錨點在底部中心，對齊到地圖座標
        popupAnchor: [0, -10]
      })
      
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: 1000 // 確保紅綠燈標記在其他標記之上
      })
      
      // 添加點擊事件和說明彈窗
      marker.on('click', () => {
        const popupContent = this.generateWarningLightDescription(lightData)
        marker.bindPopup(popupContent).openPopup()
      })
      
      // 初始狀態：根據當前縮放層級決定是否顯示
      if (currentZoom >= 16 && currentZoom <= 20) {
        marker.addTo(this.map)
      }
      
      // 存儲標記和數據
      this.warningLightMarkers.push({
        marker: marker,
        data: lightData
      })
    },

    // 更新紅綠燈標記的可見性和大小
    updateWarningLightMarkersVisibility() {
      if (!this.map) return
      
      const currentZoom = this.map.getZoom()
      const shouldShow = currentZoom >= 16 && currentZoom <= 20
      
      this.warningLightMarkers.forEach(({ marker, data }) => {
        if (shouldShow) {
          // 更新標記圖標以反映當前縮放層級
          // 整體縮小20%（乘以0.8）
          const scaleFactor = Math.pow(1.2, currentZoom - 16) * 0.8
          const containerMaxWidth = Math.round(90 * scaleFactor)
          // 估算高度（路線名稱 + 紅綠燈 + 狀態文字）
          const estimatedHeight = Math.round((10 + 40 + 15) * scaleFactor)
          const markerHTML = generateWarningLightHTML(data, currentZoom)
          const newIcon = L.divIcon({
            className: 'warning-light-marker-icon',
            html: markerHTML,
            iconSize: [containerMaxWidth, estimatedHeight],
            iconAnchor: [containerMaxWidth / 2, estimatedHeight], // 錨點在底部中心，對齊到地圖座標
            popupAnchor: [0, -10]
          })
          marker.setIcon(newIcon)
          
          if (!this.map.hasLayer(marker)) {
            marker.addTo(this.map)
          }
        } else {
          if (this.map.hasLayer(marker)) {
            this.map.removeLayer(marker)
          }
        }
      })
    },

    // 清除紅綠燈標記
    clearWarningLightMarkers() {
      this.warningLightMarkers.forEach(({ marker }) => {
        if (this.map && this.map.hasLayer(marker)) {
          this.map.removeLayer(marker)
        }
      })
      this.warningLightMarkers = []
    },

    // 處理紅綠燈更新
    handleWarningLightUpdate(updatedLights) {
      // 更新標記數據
      updatedLights.forEach((updatedLight, index) => {
        if (this.warningLightMarkers[index]) {
          this.warningLightMarkers[index].data = { ...updatedLight }
          
          // 更新標記圖標
          const currentZoom = this.map.getZoom()
          const scaleFactor = Math.pow(1.2, currentZoom - 16) * 0.8
          const containerMaxWidth = Math.round(90 * scaleFactor)
          const estimatedHeight = Math.round((10 + 40) * scaleFactor)
          
          const markerHTML = generateWarningLightHTML(updatedLight, currentZoom)
          const newIcon = L.divIcon({
            className: 'warning-light-marker-icon',
            html: markerHTML,
            iconSize: [containerMaxWidth, estimatedHeight],
            iconAnchor: [containerMaxWidth / 2, estimatedHeight],
            popupAnchor: [0, -10]
          })
          
          this.warningLightMarkers[index].marker.setIcon(newIcon)
        }
      })
    },

    // 格式化事件日期
    formatEventDate(dateString) {
      if (!dateString) return '未設定'
      
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
        console.error('格式化日期失敗:', error)
        return dateString
      }
    },

    addProjectMarker() {
      // 如果是母專案，不顯示專案標記，而是顯示子專案標記
      if (this.isParentProject()) {
        this.loadChildProjects()
        return
      }

      // 如果是子專案，顯示當前專案標記
      if (this.project?.location) {
        const lat = this.project.location.lat
        const lng = this.project.location.lng
        
        // 驗證座標是否有效
        if (lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
            !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
            isFinite(lat) && isFinite(lng)) {
          try {
            this.marker = L.marker([parseFloat(lat), parseFloat(lng)])
              .addTo(this.map)
              .bindPopup(`
                <div class="project-popup">
                  <h3 class="font-bold text-lg mb-2">${this.project.name || '未命名專案'}</h3>
                  <p class="text-sm text-gray-600 mb-2">${this.project.description || '無描述'}</p>
                  <p class="text-xs text-gray-500">座標: ${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}</p>
                </div>
              `)
          } catch (error) {
            console.error('創建地圖標記失敗:', error)
            console.error('座標值:', { lat, lng })
          }
        } else {
          console.warn('專案座標無效，無法創建標記:', {
            project: this.project,
            location: this.project.location
          })
        }
      }
    },

    updateMap() {
      if (!this.map) {
        console.warn('地圖未初始化，無法更新')
        return
      }
      
      console.log('updateMap 被調用，當前專案類型:', {
        isParentProject: this.isParentProject(),
        is_parent: this.project?.is_parent,
        parent_project_id: this.project?.parent_project_id
      })
      
      // 如果是母專案，重新載入子專案標記
      if (this.isParentProject()) {
        console.log('檢測到母專案，載入子專案標記')
        this.loadChildProjects()
        // 地圖視圖會在 addChildProjectMarkers 完成後設置
        return
      }

      // 如果是子專案，更新當前專案標記位置
      // 嘗試多種方式獲取座標
      let lat = null
      let lng = null
      
      if (this.project?.location) {
        lat = this.project.location.lat
        lng = this.project.location.lng
      } else if (this.project?.latitude && this.project?.longitude) {
        // 如果沒有 location 對象，嘗試直接使用 latitude/longitude
        lat = this.project.latitude
        lng = this.project.longitude
      } else if (this.project?.location_geometry?.coordinates) {
        // 嘗試從 location_geometry 獲取座標
        const coords = this.project.location_geometry.coordinates
        lng = coords[0] // GeoJSON 格式是 [lng, lat]
        lat = coords[1]
      }
      
      console.log('子專案座標提取結果:', {
        lat,
        lng,
        hasLocation: !!this.project?.location,
        hasLatLng: !!(this.project?.latitude && this.project?.longitude),
        hasLocationGeometry: !!this.project?.location_geometry
      })
        
        // 驗證座標是否有效
        if (lat !== null && lat !== undefined && lng !== null && lng !== undefined &&
            !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
            isFinite(lat) && isFinite(lng)) {
          const validLat = parseFloat(lat)
          const validLng = parseFloat(lng)
          
          // 更新標記位置
          if (this.marker) {
            this.marker.setLatLng([validLat, validLng])
        } else {
          // 如果標記不存在，創建一個
          this.marker = L.marker([validLat, validLng]).addTo(this.map)
          }
          
        // 只在初始化時設置視圖到專案位置，縮放層級為 16
          if (!this._hasSetInitialView) {
          this.map.setView([validLat, validLng], 16)
            this._hasSetInitialView = true
          console.log('子專案地圖定位完成:', { lat: validLat, lng: validLng, zoom: 16 })
        } else {
          // 如果已經設置過，但專案改變了，強制重新定位
          console.log('重新定位子專案地圖:', { lat: validLat, lng: validLng, zoom: 16 })
          this.map.setView([validLat, validLng], 16)
          }
      } else {
        console.warn('子專案座標無效，無法定位:', {
          lat,
          lng,
          project: this.project,
          location: this.project?.location,
          latitude: this.project?.latitude,
          longitude: this.project?.longitude,
          location_geometry: this.project?.location_geometry
        })
      }
    },

    updateMapStyle() {
      // 地圖樣式更新邏輯
      // 這裡可以根據 dark/light 模式調整地圖樣式
    },

    async addGeoJSONToMap(geojsonData) {
      if (!this.map || !geojsonData) {
        console.log('addGeoJSONToMap: 缺少地圖或數據', { map: !!this.map, geojsonData: !!geojsonData })
        return
      }

      console.log('addGeoJSONToMap: 開始添加 GeoJSON', geojsonData)
      console.log('Features 數量:', geojsonData.features?.length)

      // 移除現有的 GeoJSON 圖層
      if (this.geojsonLayer) {
        this.map.removeLayer(this.geojsonLayer)
      }

      // 創建 GeoJSON 圖層
      this.geojsonLayer = L.geoJSON(geojsonData, {
        pointToLayer: (feature, latlng) => {
          const properties = feature.properties
          let color = '#3388ff'
          
          if (properties.status === 'warning') {
            color = '#ff6b6b'
          } else if (properties.status === 'active') {
            color = '#51cf66'
          }

          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          })
        },
        style: (feature) => {
          const properties = feature.properties
          // 支持多種 feature ID 格式
          const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid
          
          // 總是使用 getFeatureColor 來分配顏色，確保每個 feature 都有獨特的顏色
          const color = this.getFeatureColor(featureId, feature, this.geojsonData)
          
          console.log(`Feature ${featureId} 顏色: ${color}`)

          return {
            color: color,
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.3
          }
        },
        onEachFeature: (feature, layer) => {
          const featureId = feature.properties.Id || feature.properties.ProfileId || feature.properties.ID || feature.properties.fid
          
          // 檢查是否有關聯上傳數據
          const hasUploads = this.featureUploads[featureId] && this.featureUploads[featureId].length > 0

          // 添加 tooltip - 顯示整個資料的名稱和描述
          const tooltipContent = `
            <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
              <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.geojsonData?.file_name || '圖層'}</div>
              <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${this.geojsonData?.metadata?.data_description || '無描述'}</div>
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: ${feature.properties?.Id || featureId}</div>
              ${hasUploads ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料</div>` : ''}
            </div>
          `
          
          layer.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'center',
            className: 'feature-info-tooltip'
          })

          // 為所有 feature 添加點擊事件，但會檢查是否有關聯上傳
          layer.on('click', (e) => {
            // 發送點擊事件，讓父組件處理關聯上傳的檢查和載入
            this.$emit('feature-click', {
              feature,
              featureId,
              hasUploads,
              latlng: e.latlng,
              fileId: this.geojsonData?.file_id || null
            })
          })
        }
      })

      // 添加到地圖
      this.geojsonLayer.addTo(this.map)
      
      console.log('GeoJSON 圖層已添加到地圖')
      console.log('圖層 bounds:', this.geojsonLayer.getBounds())
      
      // 自動調整地圖視圖到 GeoJSON 範圍
      if (this.geojsonLayer.getBounds().isValid()) {
        this.map.fitBounds(this.geojsonLayer.getBounds(), { padding: [20, 20] })
        console.log('地圖已調整到 GeoJSON 範圍')
      }
    },

    getFeatureColor(featureId, feature, layerData) {
      // 如果是潛勢評估圖層（原始或快照）且有分析數據，使用數值區間顏色
      if ((layerData?.metadata?.data_type === 'potential_analysis' || 
           layerData?.metadata?.data_type === 'potential_analysis_snapshot') && 
          layerData?.metadata?.analysis_data?.intervals) {
        return this.getPotentialAnalysisColor(feature, layerData.metadata.analysis_data)
      }
      
      // 如果圖層有自定義顏色，使用圖層顏色
      if (layerData?.metadata?.layer_color) {
        return layerData.metadata.layer_color
      }
      
      // 默認顏色分配
      const colorList = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
        '#ff6348', '#2ed573', '#1e90ff', '#ffa502', '#ff3838',
        '#3742fa', '#2f3542', '#ff4757', '#5352ed', '#2ed573',
        '#ffa502', '#ff6348', '#3742fa', '#2f3542', '#ff4757',
        '#5352ed', '#2ed573', '#ffa502', '#ff6348', '#3742fa'
      ]
      
      // 將 featureId 轉換為數字索引
      let numericId = 0
      if (typeof featureId === 'number') {
        numericId = featureId
      } else if (typeof featureId === 'string') {
        // 如果是字符串，嘗試轉換為數字
        numericId = parseInt(featureId, 10) || 0
      }

      // 使用模運算來分配顏色，確保相同 ID 總是得到相同顏色
      const colorIndex = Math.abs(numericId) % colorList.length
      return colorList[colorIndex]
    },

    // 獲取潛勢評估的顏色
    getPotentialAnalysisColor(feature, analysisData) {
      if (!feature.properties) {
        return '#cccccc' // 默認灰色
      }

      // 如果是快照圖層，直接使用 properties 中的 color
      if (feature.properties.color) {
        return feature.properties.color
      }

      // 原始潛勢分析圖層的處理邏輯
      if (!analysisData || !analysisData.intervals) {
        return '#cccccc'
      }

      // 找到第一個有區間定義的數值欄位
      const numericField = Object.keys(analysisData.intervals)[0]
      if (!numericField) {
        return '#cccccc'
      }

      const value = feature.properties[numericField]
      if (typeof value !== 'number' || isNaN(value)) {
        return '#cccccc'
      }

      // 找到對應的區間
      const intervals = analysisData.intervals[numericField]
      for (const interval of intervals) {
        if (value >= interval.min && value <= interval.max) {
          return interval.color
        }
      }

      return '#cccccc' // 如果沒有匹配的區間，返回默認顏色
    },

    // 只渲染新添加的圖層
    renderNewLayers(newLayers) {
      if (this.isRendering) {
        console.log('正在渲染中，跳過重複調用')
        return
      }

      this.isRendering = true
      try {
        // 只處理新添加的圖層
        Object.entries(newLayers).forEach(([fileId, layerData]) => {
          // 如果圖層已經存在，跳過
          if (this.geojsonLayers[fileId]) {
            console.log(`圖層 ${fileId} 已存在，跳過`)
            return
          }

          if (layerData && (layerData.geojson || layerData.kml || layerData.storage_path)) {
            this.addGeojsonLayerToMap(fileId, layerData)
            
            // 根據 layerVisibility 狀態決定是否顯示圖層
            const isVisible = this.layerVisibility[fileId] === undefined ? false : this.layerVisibility[fileId]
            if (isVisible && this.geojsonLayers[fileId]) {
              // 如果應該顯示，確保圖層在地圖上
              if (!this.map.hasLayer(this.geojsonLayers[fileId])) {
                this.geojsonLayers[fileId].addTo(this.map)
                console.log(`圖層 ${fileId} 根據可見性設置被顯示`)
              }
            } else if (!isVisible && this.geojsonLayers[fileId]) {
              // 如果應該隱藏，確保圖層不在圖層上
              if (this.map.hasLayer(this.geojsonLayers[fileId])) {
                this.map.removeLayer(this.geojsonLayers[fileId])
                console.log(`圖層 ${fileId} 根據可見性設置被隱藏`)
              }
            }
          }
        })
        
        
      } finally {
        this.isRendering = false
      }
    },

    // 渲染所有 GeoJSON 圖層
    renderAllGeojsonLayers() {
      if (this.isRendering) {
        console.log('正在渲染中，跳過重複調用')
        return
      }
      
      this.isRendering = true
      console.log('開始渲染所有 GeoJSON 圖層:', Object.keys(this.loadedGeojsonLayers))
      
      try {
        // 清除現有的圖層
        Object.values(this.geojsonLayers).forEach(layer => {
          if (layer && this.map.hasLayer(layer)) {
            this.map.removeLayer(layer)
          }
        })
        this.geojsonLayers = {}

        // 渲染每個圖層
        Object.entries(this.loadedGeojsonLayers).forEach(([fileId, layerData]) => {
          if (layerData && (layerData.geojson || layerData.kml || layerData.storage_path)) {
            this.addGeojsonLayerToMap(fileId, layerData)
            
            // 根據 layerVisibility 狀態決定是否顯示圖層
            const isVisible = this.layerVisibility[fileId] === undefined ? false : this.layerVisibility[fileId]
            if (isVisible && this.geojsonLayers[fileId]) {
              // 如果應該顯示，確保圖層在地圖上
              if (!this.map.hasLayer(this.geojsonLayers[fileId])) {
                this.geojsonLayers[fileId].addTo(this.map)
                console.log(`圖層 ${fileId} 根據可見性設置被顯示`)
              }
            } else if (!isVisible && this.geojsonLayers[fileId]) {
              // 如果應該隱藏，確保圖層不在圖層上
              if (this.map.hasLayer(this.geojsonLayers[fileId])) {
                this.map.removeLayer(this.geojsonLayers[fileId])
                console.log(`圖層 ${fileId} 根據可見性設置被隱藏`)
              }
            }
          }
        })
        
        
      } finally {
        this.isRendering = false
      }
    },

    // 添加單個圖層到地圖（支援 GeoJSON 和 KML）
    addGeojsonLayerToMap(fileId, layerData) {
      if (!this.map || !layerData) {
        console.log('addGeojsonLayerToMap: 缺少地圖或數據', { 
          map: !!this.map, 
          layerData: !!layerData
        })
        return
      }

      // 檢查是否有有效的數據
      const hasValidData = layerData.geojson || layerData.kml || layerData.storage_path
      if (!hasValidData) {
        console.log('addGeojsonLayerToMap: 沒有有效的圖層數據', { 
          hasGeojson: !!layerData.geojson, 
          hasKml: !!layerData.kml,
          hasStoragePath: !!layerData.storage_path,
          layerDataKeys: Object.keys(layerData || {}),
          fileExtension: layerData?.file_extension,
          fileType: layerData?.file_type
        })
        return
      }

      const isPotentialAnalysis = layerData.metadata?.data_type === 'potential_analysis' || layerData.metadata?.data_type === 'potential_analysis_snapshot'
      const isKML = layerData.file_type === 'kml' || layerData.kml || layerData.file_extension === '.kml'
      console.log(`添加圖層 ${fileId}:`, layerData.file_name, 'file_extension:', layerData.file_extension, 'file_type:', layerData.file_type, isPotentialAnalysis ? '(潛勢分析)' : '', isKML ? '(KML)' : '(GeoJSON)')

      let layer
      if (isKML) {
        // 創建 KML 圖層
        console.log('創建 KML 圖層')
        console.log('KML 內容長度:', layerData.kml?.length)
        console.log('omnivore 可用性:', !!window.L?.omnivore)
        
        // 顯示加載指示器
        this.$emit('kml-loading-start', { fileId, fileName: layerData.file_name })
        
        // 創建一個臨時的 blob URL 來載入 KML
        const blob = new Blob([layerData.kml], { type: 'application/vnd.google-earth.kml+xml' })
        const kmlUrl = URL.createObjectURL(blob)
        console.log('KML Blob URL:', kmlUrl)
        console.log('KML 文件路徑:', layerData.storage_path)
        
        // 檢查 omnivore 是否可用
        if (!window.L?.omnivore) {
          console.error('omnivore 插件未加載')
          return
        }
        
        // 計算圖層的 z-index（根據順序）
        const baseZIndex = 1000
        const layerIndex = Object.keys(this.geojsonLayers).length
        const layerZIndex = baseZIndex + (layerIndex * 10)
        
        // 使用 omnivore 插件載入 KML（移除縮放級別限制）
        layer = L.omnivore.kml(kmlUrl, {
          // 移除縮放級別限制，確保在所有縮放級別下都能顯示
        }, L.geoJSON(null, {
          // 計算圖層的 z-index（根據順序）
          zIndex: layerZIndex,
          style: (feature) => {
            // 從 styleUrl 中提取樣式 ID
            const styleUrl = feature.properties?.styleUrl
            let color = '#ff0000' // 默認顏色
            
            if (styleUrl) {
              const styleId = styleUrl.replace('#', '')
              // 根據樣式 ID 設置對應的顏色（從 KML 文件中的實際顏色轉換）
              const styleColors = {
                'style0': convertKMLColor('ffaf401e'), // 橙色
                'style1': convertKMLColor('fff6823b'), // 淺橙色
                'style2': convertKMLColor('ff81b910'), // 綠色
                'style3': convertKMLColor('ff0b9ef5'), // 藍色
                'style4': convertKMLColor('ff4444ef')  // 紫色
              }
              color = styleColors[styleId] || '#ff0000'
              console.log(`樣式 ${styleId} 使用顏色: ${color}`)
            }
            
            return {
              color: color,
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.5
            }
          },
          onEachFeature: (feature, layer) => {
            // 添加 tooltip
            const tooltipContent = `
              <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || '潛勢分析快照'}</div>
                <div style="word-wrap: break-word;">${feature.properties?.name || ''}</div>
              </div>
            `
            layer.bindTooltip(tooltipContent, {
              permanent: false,
              direction: 'center',
              className: 'feature-info-tooltip'
            })

            // 添加點擊事件
            layer.on('click', (e) => {
              const uploadCount = this.featureUploads['snapshot_overall'] ? this.featureUploads['snapshot_overall'].length : 0
              this.$emit('feature-click', {
                feature: { properties: { Id: 'snapshot_overall', Description: '快照圖層整體' } },
                featureId: 'snapshot_overall',
                hasUploads: uploadCount > 0,
                latlng: e.latlng,
                fileId: fileId
              })
            })
          }
        })).on('ready', () => {
          console.log('KML 圖層載入完成')
          // 樣式已經在 L.geoJSON 的 style 函數中設置，不需要重複設置
          this.$emit('kml-loading-complete', { fileId, fileName: layerData.file_name })
        }).on('error', (error) => {
          console.error('KML 載入錯誤:', error)
          this.$emit('kml-loading-error', { fileId, fileName: layerData.file_name, error })
        })
        
        // 清理 blob URL
        setTimeout(() => URL.revokeObjectURL(kmlUrl), 1000)
      } else {
        // 創建 GeoJSON 圖層
        console.log('Features 數量:', layerData.geojson.features?.length)
        
        // 計算圖層的 z-index（根據順序）
        const baseZIndex = 1000
        const layerIndex = Object.keys(this.geojsonLayers).length
        const layerZIndex = baseZIndex + (layerIndex * 10)
        
        // 根據坐標系統選擇適當的圖層創建方式
        const layerSRID = layerData.srid || 4326
        console.log('=== 圖層坐標系統檢查 ===')
        console.log('圖層名稱:', layerData.file_name)
        console.log('圖層坐標系統 SRID:', layerSRID)
        console.log('圖層數據:', layerData)
        console.log('是否為 TWD97:', layerSRID === 3826)
        
        if (layerSRID === 3826) {
          // TWD97 坐標系統，需要坐標轉換
          console.log('=== 開始處理 TWD97 圖層 ===')
          console.log('圖層名稱:', layerData.file_name)
          console.log('原始 GeoJSON 特徵數量:', layerData.geojson.features?.length)
          
          // 檢查原始坐標
          if (layerData.geojson.features && layerData.geojson.features.length > 0) {
            const firstFeature = layerData.geojson.features[0]
            console.log('原始第一個特徵坐標 (TWD97):', firstFeature.geometry?.coordinates)
          }
          
          // 重置轉換標記
          this._firstPointConverted = false
          
          // 預先轉換整個 GeoJSON 數據
          const convertedGeoJSON = this.convertTWD97ToWGS84(layerData.geojson)
          console.log('轉換後 GeoJSON 特徵數量:', convertedGeoJSON.features?.length)
          
          // 檢查轉換後的第一個特徵坐標
          if (convertedGeoJSON.features && convertedGeoJSON.features.length > 0) {
            const firstFeature = convertedGeoJSON.features[0]
            console.log('轉換後第一個特徵坐標 (WGS84):', firstFeature.geometry?.coordinates)
            
            // 計算轉換後圖層的邊界
            const bounds = this.calculateGeoJSONBounds(convertedGeoJSON)
            console.log('轉換後圖層邊界:', bounds)
            
            // 檢查邊界是否合理
            if (bounds && bounds.south >= 21 && bounds.north <= 26 && bounds.west >= 119 && bounds.east <= 122) {
              console.log('✅ 轉換後圖層邊界合理（在台灣範圍內）')
            } else {
              console.log('❌ 轉換後圖層邊界不合理（超出台灣範圍）')
              console.log('邊界詳細信息:', {
                south: bounds?.south,
                north: bounds?.north,
                west: bounds?.west,
                east: bounds?.east
              })
            }
          }
          
          console.log('=== TWD97 圖層處理完成 ===')
          
          layer = L.geoJSON(convertedGeoJSON, {
          // 設置較高的 z-index，確保 GeoJSON 圖層在 WMS 圖層之上
          zIndex: layerZIndex,
          pointToLayer: (feature, latlng) => {
            const properties = feature.properties;
            const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid || properties.id || 0;
            
            let color = '#3388ff';
            if (properties.status === 'warning') {
              color = '#ff6b6b';
            } else if (properties.status === 'active') {
              color = '#51cf66';
            }

            return L.circleMarker(latlng, {
              radius: 8,
              fillColor: color,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            });
          },
          style: (feature) => {
            const properties = feature.properties;
            // 支持多種 feature ID 格式
            const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid || properties.id || 0;
            
            // 總是使用 getFeatureColor 來分配顏色，確保每個 feature 都有獨特的顏色
            const color = this.getFeatureColor(featureId, feature, layerData);
            
            if (!isPotentialAnalysis) {
              console.log(`Feature ${featureId} 顏色: ${color}`);
            }

            return {
              color: color,
              weight: isPotentialAnalysis ? 2 : 3, // 潛勢分析圖層使用較細的線條
              opacity: 0.8,
              fillOpacity: isPotentialAnalysis ? 0.5 : 0.3 // 潛勢分析圖層使用較高的填充透明度
            };
          },
          onEachFeature: (feature, layer) => {
            const featureId = feature.properties.Id || feature.properties.ProfileId || feature.properties.ID || feature.properties.fid || feature.properties.id || 0;
            const isOriginalPotentialAnalysis = layerData?.metadata?.data_type === 'potential_analysis';
            const isSnapshotPotentialAnalysis = layerData?.metadata?.data_type === 'potential_analysis_snapshot';
            const hasUploads = (!isOriginalPotentialAnalysis && this.featureUploads[featureId] && this.featureUploads[featureId].length > 0) ||
                              (isSnapshotPotentialAnalysis && this.featureUploads['snapshot_overall'] && this.featureUploads['snapshot_overall'].length > 0);

            // 潛勢分析圖層使用簡化的 tooltip
            if (isOriginalPotentialAnalysis || isSnapshotPotentialAnalysis) {
              let tooltipContent = '';
              
              if (layerData?.metadata?.data_type === 'potential_analysis_snapshot') {
                // 快照圖層的 tooltip - 使用與剖面圖層相同的樣式
                const uploadCount = this.featureUploads['snapshot_overall'] ? this.featureUploads['snapshot_overall'].length : 0;
                tooltipContent = `
                  <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                    <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || '潛勢分析快照'}</div>
                    <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: snapshot_overall</div>
                    ${uploadCount > 0 ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料 (${uploadCount} 個檔案)</div>` : ''}
                  </div>
                `;
              } else {
                // 原始潛勢分析圖層的 tooltip - 使用與剖面圖層相同的樣式
                const uploadCount = this.featureUploads['potential_analysis_overall'] ? this.featureUploads['potential_analysis_overall'].length : 0;
                tooltipContent = `
                  <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                    <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || '潛勢分析圖層'}</div>
                    <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: potential_analysis_overall</div>
                    ${uploadCount > 0 ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料 (${uploadCount} 個檔案)</div>` : ''}
                  </div>
                `;
              }
              
              layer.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'center',
                className: 'feature-info-tooltip'
              });
            } else {
              // 一般圖層的 tooltip - 使用與剖面圖層相同的樣式
              const hasUploads = this.featureUploads[featureId] && this.featureUploads[featureId].length > 0;
              const tooltipContent = `
                <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                  <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || 'Feature'}</div>
                  <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: ${featureId}</div>
                  ${hasUploads ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料</div>` : ''}
                </div>
              `;
              
              layer.bindTooltip(tooltipContent, {
                permanent: false,
                direction: 'center',
                className: 'feature-info-tooltip'
              });
            }

            // 添加點擊事件
            layer.on('click', (e) => {
              if (isOriginalPotentialAnalysis) {
                // 原始潛勢分析圖層處理整體的關聯上傳
                const hasUploads = this.featureUploads['potential_analysis_overall'] && this.featureUploads['potential_analysis_overall'].length > 0;
                this.$emit('feature-click', {
                  feature: { properties: { Id: 'potential_analysis_overall', Description: '潛勢分析圖層整體' } },
                  featureId: 'potential_analysis_overall',
                  hasUploads,
                  latlng: e.latlng,
                  fileId: fileId
                });
                return;
              }
              
              if (isSnapshotPotentialAnalysis) {
                // 快照圖層處理整體的關聯上傳
                this.$emit('feature-click', {
                  feature: { properties: { Id: 'snapshot_overall', Description: '快照圖層整體' } },
                  featureId: 'snapshot_overall',
                  hasUploads,
                  latlng: e.latlng,
                  fileId: fileId
                });
                return;
              }
              
              this.$emit('feature-click', {
                feature,
                featureId,
                hasUploads,
                latlng: e.latlng,
                fileId: fileId
              });
            });
          }
        })
        } else {
          // WGS84 坐標系統，直接使用
          layer = L.geoJSON(layerData.geojson, {
            // 設置較高的 z-index，確保 GeoJSON 圖層在 WMS 圖層之上
            zIndex: layerZIndex,
            pointToLayer: (feature, latlng) => {
              const properties = feature.properties;
              const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid || properties.id || 0;
              
              let color = '#3388ff';
              if (properties.status === 'warning') {
                color = '#ff6b6b';
              } else if (properties.status === 'active') {
                color = '#51cf66';
              }

              return L.circleMarker(latlng, {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
              });
            },
            style: (feature) => {
              const properties = feature.properties;
              // 支持多種 feature ID 格式
              const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid || properties.id || 0;
              
              // 總是使用 getFeatureColor 來分配顏色，確保每個 feature 都有獨特的顏色
              const color = this.getFeatureColor(featureId, feature, layerData);
              
              if (!isPotentialAnalysis) {
                console.log(`Feature ${featureId} 顏色: ${color}`);
              }

              return {
                color: color,
                weight: isPotentialAnalysis ? 2 : 3, // 潛勢分析圖層使用較細的線條
                opacity: 0.8,
                fillOpacity: isPotentialAnalysis ? 0.5 : 0.3 // 潛勢分析圖層使用較高的填充透明度
              };
            },
            onEachFeature: (feature, layer) => {
              const featureId = feature.properties.Id || feature.properties.ProfileId || feature.properties.ID || feature.properties.fid || feature.properties.id || 0;
              const isOriginalPotentialAnalysis = layerData?.metadata?.data_type === 'potential_analysis';
              const isSnapshotPotentialAnalysis = layerData?.metadata?.data_type === 'potential_analysis_snapshot';
              const hasUploads = (!isOriginalPotentialAnalysis && this.featureUploads[featureId] && this.featureUploads[featureId].length > 0) ||
                                (isSnapshotPotentialAnalysis && this.featureUploads['snapshot_overall'] && this.featureUploads['snapshot_overall'].length > 0);

              // 潛勢分析圖層使用簡化的 tooltip
              if (isOriginalPotentialAnalysis || isSnapshotPotentialAnalysis) {
                let tooltipContent = '';
                
                if (layerData?.metadata?.data_type === 'potential_analysis_snapshot') {
                  // 快照圖層的 tooltip - 使用與剖面圖層相同的樣式
                  const uploadCount = this.featureUploads['snapshot_overall'] ? this.featureUploads['snapshot_overall'].length : 0;
                  tooltipContent = `
                    <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                      <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || '潛勢分析快照'}</div>
                      <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                      <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: snapshot_overall</div>
                      ${uploadCount > 0 ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料 (${uploadCount} 個檔案)</div>` : ''}
                    </div>
                  `;
                } else {
                  // 原始潛勢分析圖層的 tooltip - 使用與剖面圖層相同的樣式
                  const uploadCount = this.featureUploads['potential_analysis_overall'] ? this.featureUploads['potential_analysis_overall'].length : 0;
                  tooltipContent = `
                    <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                      <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || '潛勢分析圖層'}</div>
                      <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                      <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: potential_analysis_overall</div>
                      ${uploadCount > 0 ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料 (${uploadCount} 個檔案)</div>` : ''}
                    </div>
                  `;
                }
                
                layer.bindTooltip(tooltipContent, {
                  permanent: false,
                  direction: 'top',
                  offset: [0, -10],
                  className: 'custom-tooltip'
                });
              } else {
                // 一般圖層的 tooltip - 使用統一樣式
                const hasUploads = this.featureUploads[featureId] && this.featureUploads[featureId].length > 0;
                const tooltipContent = `
                  <div style="max-width: 280px; word-wrap: break-word; white-space: normal; line-height: 1.4;">
                    <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${layerData?.file_name || 'Feature'}</div>
                    <div style="color: #9ca3af; margin-bottom: 4px; word-wrap: break-word;">${layerData?.metadata?.data_description || '無描述'}</div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Feature: ${featureId}</div>
                    ${hasUploads ? `<div style="color: #2563eb; font-size: 11px;">📎 點擊查看關聯資料</div>` : ''}
                  </div>
                `;
                
                layer.bindTooltip(tooltipContent, {
                  permanent: false,
                  direction: 'top',
                  offset: [0, -10],
                  className: 'custom-tooltip'
                });
              }

              layer.on('click', (e) => {
                if (isSnapshotPotentialAnalysis) {
                  // 快照圖層處理整體的關聯上傳
                  this.$emit('feature-click', {
                    feature: { properties: { Id: 'snapshot_overall', Description: '快照圖層整體' } },
                    featureId: 'snapshot_overall',
                    hasUploads,
                    latlng: e.latlng,
                    fileId: fileId
                  });
                  return;
                }
                
                this.$emit('feature-click', {
                  feature,
                  featureId,
                  hasUploads,
                  latlng: e.latlng,
                  fileId: fileId
                });
              });
            }
          })
        }
      }

      // 存儲圖層引用
      this.geojsonLayers[fileId] = layer

      // 自動添加圖層到地圖上（默認可見）
      layer.addTo(this.map)
      console.log(`圖層 ${fileId} 已創建並添加到地圖`)
      console.log(`GeoJSON 圖層 ${fileId} z-index:`, layer.options.zIndex)
      console.log(`GeoJSON 圖層 ${fileId} 是否在地圖上:`, this.map.hasLayer(layer))
      
      // 檢查圖層邊界
      try {
        const bounds = layer.getBounds()
        if (bounds && bounds.isValid && bounds.isValid()) {
          console.log(`圖層 ${fileId} 邊界:`, bounds)
          console.log(`圖層 ${fileId} 中心點:`, bounds.getCenter())
        } else {
          console.log(`圖層 ${fileId} 邊界無效`)
        }
      } catch (error) {
        console.error(`圖層 ${fileId} 邊界檢查失敗:`, error)
      }
      
      // 記錄圖層信息用於調試
      const isTIF = layerData.file_extension === '.tif' || layerData.file_extension === '.tiff'
      if (isTIF) {
        console.log('TIF 圖層已創建:', layer)
        if (layerData.metadata?.bounds) {
          console.log('TIF 圖層邊界:', layerData.metadata.bounds)
        }
      } else {
        console.log('GeoJSON/KML 圖層已創建:', layer)
      }
    },

    // 更新所有圖層可見性
    updateAllLayersVisibility(visibility) {
      Object.entries(this.geojsonLayers).forEach(([fileId, layer]) => {
        if (layer) {
          const isVisible = visibility[fileId] === undefined ? false : visibility[fileId]
          if (isVisible) {
            if (!this.map.hasLayer(layer)) {
              layer.addTo(this.map);
              console.log(`顯示圖層 ${fileId}`);
            }
          } else {
            if (this.map.hasLayer(layer)) {
              this.map.removeLayer(layer);
              console.log(`隱藏圖層 ${fileId}`);
            }
          }
        }
      });
      
    },

    // 更新單個圖層可見性
    updateLayerVisibility(fileId, visible) {
      console.log('updateLayerVisibility 被調用:', fileId, visible);
      console.log('當前圖層:', Object.keys(this.geojsonLayers));
      console.log('已載入的圖層:', Object.keys(this.loadedGeojsonLayers));
      
      // 如果圖層不存在，先嘗試載入
      if (!this.geojsonLayers[fileId] && this.loadedGeojsonLayers[fileId]) {
        console.log('圖層不存在，嘗試載入:', fileId);
        this.addGeojsonLayerToMap(fileId, this.loadedGeojsonLayers[fileId]);
        
        // 等待下一個 tick 確保圖層已經創建，然後處理可見性
        this.$nextTick(() => {
          this.handleLayerVisibility(fileId, visible);
        });
        return;
      }
      
      // 直接處理可見性
      this.handleLayerVisibility(fileId, visible);
      
    },

    // 更新圖層顏色
    updateLayerColor(fileId, newColor) {
      console.log('updateLayerColor 被調用:', fileId, newColor);
      
      const layer = this.geojsonLayers[fileId];
      if (!layer) {
        console.log(`圖層 ${fileId} 不存在，無法更新顏色`);
        return;
      }

      // 更新圖層數據中的顏色信息
      const layerData = this.loadedGeojsonLayers[fileId];
      if (layerData && layerData.metadata) {
        layerData.metadata.layer_color = newColor;
        console.log(`圖層 ${fileId} 顏色已更新為: ${newColor}`);
      }

      // 重新設置圖層樣式
      layer.setStyle((feature) => {
        const properties = feature.properties;
        const featureId = properties.Id || properties.ProfileId || properties.ID || properties.fid || properties.id || 0;
        
        // 使用更新後的顏色
        const color = this.getFeatureColor(featureId, feature, layerData);
        
        return {
          color: color,
          weight: 3,
          opacity: 0.8,
          fillOpacity: 0.3
        };
      });

      console.log(`圖層 ${fileId} 樣式已更新`);
    },
    
    // 處理圖層可見性的核心邏輯
    handleLayerVisibility(fileId, visible) {
      const layer = this.geojsonLayers[fileId];
      if (!layer) {
        console.log(`圖層 ${fileId} 不存在，無法更新可見性`);
        return;
      }
      
      if (visible) {
        if (!this.map.hasLayer(layer)) {
          layer.addTo(this.map);
          console.log(`圖層 ${fileId} 已添加到地圖`);
          console.log(`圖層 ${fileId} z-index:`, layer.options.zIndex);
          console.log(`圖層 ${fileId} 樣式:`, layer.options);
          
          // 驗證圖層是否真的在地圖上
          setTimeout(() => {
            console.log(`[驗證] 圖層 ${fileId} 是否在地圖上:`, this.map.hasLayer(layer));
            
            // 檢查圖層的邊界和中心點
            try {
              const bounds = layer.getBounds();
              if (bounds && bounds.isValid && bounds.isValid()) {
                console.log(`[驗證] 圖層 ${fileId} 邊界:`, bounds);
                console.log(`[驗證] 圖層 ${fileId} 中心點:`, bounds.getCenter());
                console.log(`[驗證] 圖層 ${fileId} 邊界大小:`, bounds.getNorthEast().distanceTo(bounds.getSouthWest()));
              } else {
                console.log(`[驗證] 圖層 ${fileId} 邊界無效`);
              }
            } catch (error) {
              console.error(`[驗證] 圖層 ${fileId} 邊界檢查失敗:`, error);
            }
            
            // 檢查圖層的 features 數量
            try {
              const layerCount = layer.getLayers ? layer.getLayers().length : 'unknown';
              console.log(`[驗證] 圖層 ${fileId} features 數量:`, layerCount);
            } catch (error) {
              console.error(`[驗證] 圖層 ${fileId} features 檢查失敗:`, error);
            }
          }, 100);
        } else {
          console.log(`圖層 ${fileId} 已經在地圖上`);
        }
      } else {
        if (this.map.hasLayer(layer)) {
          this.map.removeLayer(layer);
          console.log(`圖層 ${fileId} 已從地圖移除`);
        } else {
          console.log(`圖層 ${fileId} 已經不在圖層上`);
        }
      }
    },

    // 公共方法供父組件調用
    fitBounds(bounds, options = {}) {
      if (this.map && bounds) {
        this.map.fitBounds(bounds, options);
      }
    },

    addLayer(layer) {
      if (this.map && layer) {
        layer.addTo(this.map);
      }
    },

    removeLayer(layer) {
      if (this.map && layer) {
        this.map.removeLayer(layer);
      }
    },
    
    
    // 清理所有圖層（用於組件卸載時）
    clearAllLayers() {
      console.log('清理所有地圖圖層')
      
      try {
      // 清除所有 GeoJSON 圖層
        if (this.geojsonLayers && typeof this.geojsonLayers === 'object') {
      Object.values(this.geojsonLayers).forEach(layer => {
            try {
              if (layer && this.map && this.map.hasLayer && this.map.hasLayer(layer)) {
          this.map.removeLayer(layer)
              }
            } catch (error) {
              console.warn('移除 GeoJSON 圖層時發生錯誤:', error)
        }
      })
        }
      
      // 清除單個 GeoJSON 圖層
        if (this.geojsonLayer) {
          try {
            if (this.map && this.map.hasLayer && this.map.hasLayer(this.geojsonLayer)) {
        this.map.removeLayer(this.geojsonLayer)
            }
          } catch (error) {
            console.warn('移除單個 GeoJSON 圖層時發生錯誤:', error)
          }
        }
        
        // 清理自定義底圖圖層
        if (this.customBaseMapLayer) {
          try {
            if (this.map && this.map.hasLayer && this.map.hasLayer(this.customBaseMapLayer)) {
              this.map.removeLayer(this.customBaseMapLayer)
            }
          } catch (error) {
            console.warn('移除自定義底圖圖層時發生錯誤:', error)
          }
          this.customBaseMapLayer = null
      }
      
      // 清理數據
      this.geojsonLayers = {}
      this.geojsonLayer = null
      // 注意：loadedGeojsonLayers 是 prop，不能直接修改
      // 清理工作應該由父組件完成
        this.isCustomBaseMapActive = false
      } catch (error) {
        console.error('清理地圖圖層時發生錯誤:', error)
      }
    },
    
    // 切換到自定義底圖
    async switchToCustomBaseMap(baseMap) {
      if (!this.baseMapService) {
        console.log('底圖服務未初始化，無法切換底圖')
        return
      }
      
      // 確保地圖已設置到服務中
      if (!this.baseMapService.map && this.map) {
        this.baseMapService.setMap(this.map)
      }
      
      if (!this.baseMapService.map) {
        console.log('地圖未準備好，無法切換底圖')
        return
      }
      
      try {
        await this.baseMapService.switchToCustomBaseMap(
          baseMap,
          // 載入開始回調
          (message) => {
            this.$emit('show-loading', message)
          },
          // 載入結束回調
          () => {
            this.$emit('hide-loading')
          }
        )
        // 同步狀態
        this.customBaseMapLayer = this.baseMapService.customBaseMapLayer
        this.isCustomBaseMapActive = this.baseMapService.isCustomBaseMapActive
        
        // 確保自定義底圖顯示在基本地圖之上
        if (this.customBaseMapLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          if (this.customBaseMapLayer.bringToFront) {
            this.customBaseMapLayer.bringToFront()
            console.log('已將自定義底圖置於最上層（切換後）')
          }
        }
      } catch (error) {
        console.error('切換自定義底圖失敗:', error)
        this.$emit('hide-loading')
        this.switchToDefaultBaseMap()
      }
    },
    
    
    // 切換回默認底圖
    switchToDefaultBaseMap() {
      if (!this.map) return
      
      console.log('切換回默認底圖')
      
      if (this.baseMapService) {
        this.baseMapService.switchToDefaultBaseMap()
        // 同步狀態
        this.customBaseMapLayer = this.baseMapService.customBaseMapLayer
        this.isCustomBaseMapActive = this.baseMapService.isCustomBaseMapActive
      }
      
      // 確保默認底圖是活躍的
      if (!this.map.hasLayer(this.layers.street)) {
        this.layers.street.addTo(this.map)
      }
      
      console.log('已切換回默認底圖')
    },
    
    // 地質圖層控制
    toggleGeologicalLayer(data) {
      if (!this.map || !this.geologicalLayerService) {
        console.log('地圖或地質圖層服務未初始化')
        return
      }
      
      console.log('切換地質圖層:', data)
      
      // 保存 WMS 圖層狀態
      this.wmsLayerActive = data.active
      this.wmsLayerConfigs = data.configs
      this.wmsLayerSelectedLayers = data.selectedLayers
      
      if (data.active) {
        // 添加地質圖層
        this.geologicalLayerService.createLayers(data.configs, data.selectedLayers)
        this.geologicalLayerService.addAllLayersToMap()
      } else {
        // 移除地質圖層
        this.geologicalLayerService.removeAllLayers()
      }
    },
    
    // 強制恢復 WMS 圖層（如果應該處於活躍狀態）
    forceRestoreWMSLayers() {
      if (!this.wmsLayerActive || !this.wmsLayerConfigs || !this.wmsLayerSelectedLayers) {
        return
      }
      
      if (this.geologicalLayerService) {
        this.geologicalLayerService.createLayers(this.wmsLayerConfigs, this.wmsLayerSelectedLayers)
        this.geologicalLayerService.addAllLayersToMap()
      }
    },

    // 載入省道里程樁號數據
    async loadHighwayMileageData() {
      if (!this.map) {
        console.warn('地圖未初始化，無法載入省道里程樁號')
        return
      }

      try {
        console.log('開始載入省道里程樁號數據（從 GeoJSON）...')
        
        // 從 alertRoad.geojson 讀取完整的桩号数据
        let response
        try {
          // 首先嘗試從 public 目錄讀取 GeoJSON
          response = await fetch('/data/uploads/geojson/alertRoad.geojson')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        } catch (fetchError) {
          console.error('從 public 目錄讀取 GeoJSON 失敗:', fetchError)
          throw new Error('無法讀取 alertRoad.geojson 文件，請確保文件存在於 public/data/uploads/geojson/ 目錄')
        }
        
        // 解析 GeoJSON 數據
        const geojsonData = await response.json()
        
        if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
          throw new Error('GeoJSON 文件為空或格式不正確')
        }
        
        console.log('GeoJSON 文件載入成功，共', geojsonData.features.length, '個桩號點位')
        
        // 直接使用所有数据（alertRoad.geojson 已包含所有需要的路線數據）
        const geoJsonData = geojsonData
        
        // 創建 GeoJSON 圖層（使用 alertRoad.geojson 的字段名）
        this.highwayMileageLayer = L.geoJSON(geoJsonData, {
          pointToLayer: (feature, latlng) => {
            // 創建自定義標記（小圓點）
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: '#ef4444', // 紅色
              color: '#ffffff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            })
          },
          onEachFeature: (feature, layer) => {
            // 從 GeoJSON 屬性中提取信息（使用 alertRoad.geojson 的字段）
            const props = feature.properties || {}
            const roadNumber = props.公路編 || props.name || '未知路線'
            const mileage = props.里程數 || props.mileage || '未知'
            const workSection = props.工務段 || ''
            const location = `${props.縣市別 || ''}${props.鄉鎮區 || ''}${props.村里 || ''}`
            
            const popupContent = `
              <div style="min-width: 180px; padding: 8px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #1f2937;">${roadNumber}</div>
                <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                  里程數: ${mileage}<br>
                  ${workSection ? `工務段: ${workSection}<br>` : ''}
                  ${location ? `位置: ${location}` : ''}
                </div>
              </div>
            `
            layer.bindPopup(popupContent)
          }
        })
        
        // 如果圖層應該可見，則添加到地圖
        console.log('[loadHighwayMileageData] 檢查是否應該顯示圖層:', this.highwayMileageVisible)
        if (this.highwayMileageVisible) {
          this.highwayMileageLayer.addTo(this.map)
          console.log('[loadHighwayMileageData] 省道里程樁號圖層已添加到地圖')
        } else {
          console.log('[loadHighwayMileageData] 圖層創建完成但未顯示（highwayMileageVisible 為 false）')
        }
        
        console.log('[loadHighwayMileageData] 省道里程樁號圖層創建完成')
      } catch (error) {
        console.error('[loadHighwayMileageData] 載入省道里程樁號數據失敗:', error)
      }
    },

    // 解析 CSV 行（處理包含逗號的欄位）
    parseCSVLine(line) {
      const values = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      // 添加最後一個值
      values.push(current.trim())
      
      return values
    },

    // 切換省道里程樁號圖層可見性
    toggleHighwayMileageLayer(visible) {
      console.log('========================================')
      console.log('[toggleHighwayMileageLayer] 被調用')
      console.log('[toggleHighwayMileageLayer] visible:', visible)
      console.log('[toggleHighwayMileageLayer] this.map:', !!this.map)
      console.log('[toggleHighwayMileageLayer] this.highwayMileageLayer:', !!this.highwayMileageLayer)
      
      if (!this.map) {
        console.warn('[toggleHighwayMileageLayer] ❌ 地圖未初始化')
        return
      }

      if (visible) {
        // 如果圖層不存在，先載入數據
        if (!this.highwayMileageLayer) {
          console.log('[toggleHighwayMileageLayer] ⚠️ 圖層不存在，開始載入數據...')
          this.loadHighwayMileageData()
          return
        }
        
        // 顯示圖層
        if (!this.map.hasLayer(this.highwayMileageLayer)) {
          this.highwayMileageLayer.addTo(this.map)
          console.log('[toggleHighwayMileageLayer] ✅ 顯示省道里程樁號圖層成功')
        } else {
          console.log('[toggleHighwayMileageLayer] ℹ️ 省道里程樁號圖層已在地圖上')
        }
      } else {
        // 隱藏圖層
        if (this.highwayMileageLayer && this.map.hasLayer(this.highwayMileageLayer)) {
          this.map.removeLayer(this.highwayMileageLayer)
          console.log('[toggleHighwayMileageLayer] ✅ 隱藏省道里程樁號圖層成功')
        } else {
          console.log('[toggleHighwayMileageLayer] ℹ️ 圖層不在地圖上或不存在')
        }
      }
      console.log('========================================')
    },
    
    

    
    // 檢查所有圖層的 z-index 順序
    checkLayerOrder() {
      if (!this.map) return
      
      console.log('=== 圖層順序檢查 ===')
      
      // 檢查 GeoJSON 圖層
      Object.entries(this.geojsonLayers).forEach(([fileId, layer]) => {
        if (layer && this.map.hasLayer(layer)) {
          console.log(`GeoJSON 圖層 ${fileId}: z-index=${layer.options.zIndex}, 在地圖上=${this.map.hasLayer(layer)}`)
        }
      })
      
      // 檢查地質圖層（通過服務）
      if (this.geologicalLayerService) {
        const status = this.geologicalLayerService.getLayerStatus()
        Object.entries(status).forEach(([layerType, layerStatus]) => {
          console.log(`地質圖層 ${layerType}: z-index=${layerStatus.zIndex}, 在地圖上=${layerStatus.onMap}`)
        })
      }
      
      // 檢查所有地圖圖層
      console.log('所有地圖圖層:')
      Object.entries(this.map._layers).forEach(([id, layer]) => {
        if (layer.options && layer.options.zIndex !== undefined) {
          console.log(`  圖層 ${id}: z-index=${layer.options.zIndex}, 類型=${layer.constructor.name}`)
        }
      })
      
      console.log('=== 圖層順序檢查結束 ===')
    },
    
    

    // 更新圖層 z-index 順序
    updateLayerZIndex(layerOrder) {
      if (!this.map || !layerOrder || layerOrder.length === 0) {
        console.log('updateLayerZIndex: 缺少地圖或順序信息')
        return
      }

      console.log('=== 更新圖層 z-index 順序 ===')
      console.log('新的圖層順序:', layerOrder)
      console.log('當前圖層:', Object.keys(this.geojsonLayers))

      // 為每個圖層分配新的 z-index
      // 基礎 z-index 從 1000 開始，每個圖層增加 10
      const baseZIndex = 1000
      
      // 先移除所有圖層
      Object.values(this.geojsonLayers).forEach(layer => {
        if (layer && this.map.hasLayer(layer)) {
          this.map.removeLayer(layer)
        }
      })
      
      // 按照新順序重新添加圖層
      // 注意：在 Leaflet 中，z-index 越高的圖層顯示在越上面
      // 圖層卡順序：第一個在最上面，最後一個在最下面
      // 地圖順序：第一個在最上面，最後一個在最下面
      // 所以第一個圖層（index=0）應該有最高的 z-index
      layerOrder.forEach((fileId, index) => {
        const layer = this.geojsonLayers[fileId]
        if (layer) {
          // 計算 z-index：第一個圖層（index=0）有最高的 z-index
          // 這樣地圖上的順序就會與圖層卡順序一致
          const newZIndex = baseZIndex + ((layerOrder.length - 1 - index) * 10)
          
          // 更新 z-index
          layer.setZIndex(newZIndex)
          
          // 重新添加到地圖（如果圖層應該是可見的）
          const isVisible = this.layerVisibility[fileId] === undefined ? false : this.layerVisibility[fileId]
          if (isVisible) {
            layer.addTo(this.map)
            console.log(`圖層 ${fileId} 重新添加到地圖，z-index: ${newZIndex}, 可見性: ${isVisible}, 圖層卡順序: ${index + 1}/${layerOrder.length}`)
          } else {
            console.log(`圖層 ${fileId} 不可見，不添加到地圖，z-index: ${newZIndex}, 圖層卡順序: ${index + 1}/${layerOrder.length}`)
          }
        } else {
          console.warn(`圖層 ${fileId} 不存在於 geojsonLayers 中`)
        }
      })

      // 檢查更新後的圖層順序
      this.checkLayerOrder()
      console.log('=== 圖層 z-index 更新完成 ===')
    },

  }
}
</script>

<style scoped>
/* 子專案標記樣式 */
:deep(.custom-child-project-marker) {
  background: transparent !important;
  border: none !important;
}

.project-popup {
  min-width: 200px;
}

.feature-info-tooltip {
  background: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
  border: none !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  padding: 8px 12px !important;
  max-width: 280px !important;
  min-width: 120px !important;
  width: auto !important;
  word-wrap: break-word !important;
  white-space: normal !important;
  line-height: 1.4 !important;
  overflow-wrap: break-word !important;
  hyphens: auto !important;
}

.feature-info-tooltip::before {
  border-top-color: rgba(0, 0, 0, 0.8) !important;
}

/* 移除 Leaflet 的藍色選中外框 */
:deep(.leaflet-interactive) {
  outline: none !important;
}

:deep(.leaflet-interactive:focus) {
  outline: none !important;
}

:deep(.leaflet-interactive:active) {
  outline: none !important;
}

/* 移除 GeoJSON 圖層的選中樣式 */
:deep(.leaflet-geojson-layer) {
  outline: none !important;
}

:deep(.leaflet-geojson-layer:focus) {
  outline: none !important;
}

:deep(.leaflet-geojson-layer:active) {
  outline: none !important;
}

/* 移除所有 Leaflet 元素的選中樣式 */
:deep(.leaflet-container .leaflet-interactive) {
  outline: none !important;
  box-shadow: none !important;
}

:deep(.leaflet-container .leaflet-interactive:focus) {
  outline: none !important;
  box-shadow: none !important;
}

:deep(.leaflet-container .leaflet-interactive:active) {
  outline: none !important;
  box-shadow: none !important;
}

/* 確保地圖容器可以接收滑鼠事件 */
:deep(.leaflet-container) {
  pointer-events: auto !important;
  cursor: grab !important;
}

:deep(.leaflet-container:active) {
  cursor: grabbing !important;
}

/* 確保地圖容器不會被其他元素阻擋 */
.map-container {
  pointer-events: auto !important;
  position: relative !important;
  z-index: 1 !important;
}
</style>

