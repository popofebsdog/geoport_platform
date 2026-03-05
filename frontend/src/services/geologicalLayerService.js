/**
 * 地質圖層服務
 * 處理 WMS 地質圖層的創建、管理和配置
 */

import L from 'leaflet'

export class GeologicalLayerService {
  constructor(map) {
    this.map = map
    this.layers = {}
    this.eventListeners = []
  }

  /**
   * 創建 WMS 地質圖層
   * @param {Object} configs - 圖層配置
   * @param {Object} selectedLayers - 選中的圖層
   */
  createLayers(configs, selectedLayers) {
    this.removeAllLayers()
    this.layers = {}

    Object.entries(selectedLayers).forEach(([layerType, isSelected]) => {
      if (isSelected && configs[layerType]) {
        const config = configs[layerType]
        const layer = this.createWMSTileLayer(config)
        
        if (layer) {
          this.layers[layerType] = layer
          this.setupLayerEvents(layer, config)
          this.setupLayerLoadingStrategy(layer, config)
        }
      }
    })

    return this.layers
  }

  /**
   * 創建單個 WMS 圖層
   * @param {Object} config - 圖層配置
   */
  createWMSTileLayer(config) {
    try {
      const layer = L.tileLayer.wms(config.url, {
        layers: config.layer,
        format: config.format,
        version: config.version,
        crs: L.CRS.EPSG4326,
        transparent: config.transparent,
        opacity: config.opacity,
        attribution: `© ${config.title} - 經濟部地質調查及礦業管理中心`,
        zIndex: 1000,
        maxZoom: config.maxZoom || 18,
        minZoom: config.minZoom || 1,
        tileSize: 256,
        zoomOffset: 0,
        srs: 'EPSG:4326',
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      })

      return layer
    } catch (error) {
      console.error('創建 WMS 圖層失敗:', error)
      return null
    }
  }

  /**
   * 設置圖層事件監聽
   * @param {Object} layer - Leaflet 圖層
   * @param {Object} config - 圖層配置
   */
  setupLayerEvents(layer, config) {
    // 靜默處理瓦片載入錯誤
    layer.on('tileerror', () => {
      // 靜默處理
    })

    // 靜默處理圖層載入事件
    layer.on('loading', () => {
      // 靜默處理
    })

    layer.on('load', () => {
      // 靜默處理
    })
  }

  /**
   * 設置圖層載入策略
   * @param {Object} layer - Leaflet 圖層
   * @param {Object} config - 圖層配置
   */
  setupLayerLoadingStrategy(layer, config) {
    if (!this.map || !layer) return

    const optimizeLoading = () => {
      const zoom = this.map.getZoom()
      
      // 根據縮放級別調整透明度
      if (zoom < 8) {
        layer.setOpacity(0.6)
      } else if (zoom >= 12) {
        layer.setOpacity(config.opacity)
      } else {
        layer.setOpacity(config.opacity || 0.8)
      }

      // 強制刷新圖層
      if (layer.redraw) {
        layer.redraw()
      }

      if (layer._reset) {
        layer._reset()
      }

      // 檢查圖層是否應該在當前縮放級別顯示
      const shouldShow = zoom >= (layer.options.minZoom || 1) && zoom <= (layer.options.maxZoom || 18)
      
      if (shouldShow && !this.map.hasLayer(layer)) {
        layer.addTo(this.map)
      } else if (!shouldShow && this.map.hasLayer(layer)) {
        this.map.removeLayer(layer)
      }

      // 在高縮放級別下強制刷新
      if (zoom >= 15 && layer._reset) {
        layer._reset()
      }
    }

    // 添加事件監聽器
    this.map.on('zoomend', optimizeLoading)
    this.map.on('moveend', optimizeLoading)
    this.map.on('viewreset', optimizeLoading)

    // 保存事件監聽器引用
    this.eventListeners.push({
      events: ['zoomend', 'moveend', 'viewreset'],
      handler: optimizeLoading
    })

    // 初始設置
    optimizeLoading()
  }

  /**
   * 添加所有圖層到地圖
   */
  addAllLayersToMap() {
    Object.values(this.layers).forEach(layer => {
      if (layer && !this.map.hasLayer(layer)) {
        layer.addTo(this.map)
      }
    })
  }

  /**
   * 從地圖移除所有圖層
   */
  removeAllLayersFromMap() {
    Object.values(this.layers).forEach(layer => {
      if (layer && this.map.hasLayer(layer)) {
        this.map.removeLayer(layer)
      }
    })
  }

  /**
   * 移除所有圖層
   */
  removeAllLayers() {
    this.removeAllLayersFromMap()
    this.cleanupEventListeners()
    this.layers = {}
  }

  /**
   * 清理事件監聽器
   */
  cleanupEventListeners() {
    this.eventListeners.forEach(({ events, handler }) => {
      events.forEach(event => {
        if (this.map) {
          this.map.off(event, handler)
        }
      })
    })
    this.eventListeners = []
  }

  /**
   * 強制刷新所有圖層
   */
  refreshAllLayers() {
    Object.values(this.layers).forEach(layer => {
      if (layer && this.map.hasLayer(layer)) {
        if (layer.redraw) {
          layer.redraw()
        }
        if (layer._reset) {
          layer._reset()
        }
      }
    })
  }

  /**
   * 設置圖層透明度
   * @param {string} layerType - 圖層類型
   * @param {number} opacity - 透明度 (0-1)
   */
  setLayerOpacity(layerType, opacity) {
    const layer = this.layers[layerType]
    if (layer) {
      layer.setOpacity(opacity)
    }
  }

  /**
   * 設置所有圖層透明度
   * @param {number} opacity - 透明度 (0-1)
   */
  setAllLayersOpacity(opacity) {
    Object.values(this.layers).forEach(layer => {
      if (layer) {
        layer.setOpacity(opacity)
      }
    })
  }

  /**
   * 獲取圖層狀態
   */
  getLayerStatus() {
    const status = {}
    Object.entries(this.layers).forEach(([layerType, layer]) => {
      status[layerType] = {
        exists: !!layer,
        onMap: layer && this.map.hasLayer(layer),
        opacity: layer ? layer.options.opacity : 0,
        zIndex: layer ? layer.options.zIndex : 0
      }
    })
    return status
  }

  /**
   * 測試 WMS 服務連接
   * @param {Object} config - 圖層配置
   */
  async testWMSService(config) {
    if (!this.map) return false

    try {
      const bounds = this.map.getBounds()
      const testUrl = `${config.url}SERVICE=WMS&VERSION=${config.version}&REQUEST=GetMap&LAYERS=${config.layer}&STYLES=&FORMAT=${config.format}&TRANSPARENT=${config.transparent}&WIDTH=256&HEIGHT=256&CRS=EPSG:4326&BBOX=${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`

      const response = await fetch(testUrl)
      return response.ok
    } catch (error) {
      console.error('WMS 服務測試失敗:', error)
      return false
    }
  }

  /**
   * 銷毀服務
   */
  destroy() {
    this.removeAllLayers()
  }
}

export default GeologicalLayerService
