import proj4 from 'proj4'
import { logger } from '@/utils/logger.js'

const log = logger.scoped('BaseMapService')

proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs')

const TRANSPARENT_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/**
 * 底圖管理服務
 * 統一處理所有底圖相關的邏輯，包括 TIF 載入、邊界計算、圖層管理等
 * 支持 COG (Cloud Optimized GeoTIFF) 加速
 */
export class BaseMapService {
  constructor(map = null) {
    this.map = map
    this.customBaseMapLayer = null
    this.isCustomBaseMapActive = false
    
    // COG 圖層快取
    this.cogLayers = new Map()
  }

  /**
   * 設置地圖實例
   * @param {Object} map - Leaflet 地圖實例
   */
  setMap(map) {
    this.map = map
  }

  /**
   * 檢查是否為 COG 文件
   * @param {string} filePath - 文件路徑
   * @returns {boolean} 是否為 COG 文件
   */
  isCOGFile(filePath) {
    const isCOG = filePath && (
      filePath.toLowerCase().includes('_cog') ||
      filePath.toLowerCase().endsWith('_cog.tif') ||
      filePath.toLowerCase().endsWith('_cog.tiff')
    )
    return isCOG
  }

  /**
   * 創建 TiTiler 瓦片圖層
   * @param {string} imageUrl - 圖片 URL
   * @param {Object} baseMap - 底圖資訊
   * @returns {L.TileLayer} TiTiler 瓦片圖層
   */
  createTiTilerLayer(imageUrl, baseMap, boundsArray = null) {
    if (!this.map) {
      throw new Error('地圖未準備好')
    }

    // 構建 TiTiler 瓦片 URL (使用 WebMercatorQuad 瓦片矩陣集)
    const titilerBase = import.meta.env.VITE_TITILER_URL
    const titilerUrl = `${titilerBase}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${encodeURIComponent(imageUrl)}`
    const layerBounds = boundsArray ? L.latLngBounds(boundsArray) : null
    
    // 創建自定義瓦片圖層，實現全瓦片載入
    const layer = L.tileLayer(titilerUrl, {
      attribution: `© ${baseMap.name} | TiTiler COG`,
      minZoom: 1,
      maxZoom: 22,
      opacity: 0.8,
      // 使用完全透明的錯誤瓦片
      errorTileUrl: TRANSPARENT_TILE,
      // 添加 CSS 類來處理藍色瓦片
      className: 'cog-tile-layer',
      // 設置跨域屬性
      crossOrigin: true,
      keepBuffer: 1,
      updateWhenZooming: false,
      updateWhenIdle: true,
      // 設置瓦片大小
      tileSize: 256,
      bounds: layerBounds,
      noWrap: true
    })
    
    // 重寫瓦片載入邏輯，避免對 COG 範圍外的 tile 發出請求
    const originalCreateTile = layer.createTile
    layer.createTile = function(coords, done) {
      if (layerBounds && !BaseMapService.tileIntersectsBounds(coords, layerBounds)) {
        const emptyTile = document.createElement('img')
        emptyTile.alt = ''
        emptyTile.setAttribute('role', 'presentation')
        emptyTile.src = TRANSPARENT_TILE
        if (done) setTimeout(() => done(null, emptyTile), 0)
        return emptyTile
      }

      const tile = originalCreateTile.call(this, coords, done)
      
      // 為瓦片添加載入完成事件
      tile.onload = function() {
      }
      
      return tile
    }

    // 添加錯誤處理
    layer.on('tileerror', (error) => {
      if (error?.tile) {
        error.tile.src = TRANSPARENT_TILE
        error.tile.style.opacity = '0'
      }
    })

    layer.on('tileload', () => {
    })

    // 添加 CSS 樣式來隱藏藍色瓦片（只針對錯誤瓦片）
    if (!document.getElementById('cog-tile-styles')) {
      const style = document.createElement('style')
      style.id = 'cog-tile-styles'
      style.textContent = `
        /* 隱藏藍色錯誤瓦片，不影響正常影像 */
        .cog-tile-layer img[src*="error"],
        .cog-tile-layer img[src*="404"],
        .cog-tile-layer img[src*="outside bounds"],
        .cog-tile-layer img[src*="Not Found"] {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }
        
        /* 隱藏純藍色瓦片和雜訊瓦片 */
        .cog-tile-layer img {
          filter: brightness(1) contrast(1);
        }
        
        /* 使用 JavaScript 動態檢測問題瓦片 */
        .cog-tile-layer img.blue-tile,
        .cog-tile-layer img.noise-tile {
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `
      document.head.appendChild(style)
    }

    // 添加 JavaScript 來動態檢測問題瓦片
    layer.on('tileload', function(e) {
      const img = e.tile
      if (img && img.complete) {
        try {
          // 創建 canvas 來檢測瓦片顏色
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = 4
          canvas.height = 4
          
          ctx.drawImage(img, 0, 0, 4, 4)
          const imageData = ctx.getImageData(0, 0, 4, 4)
          const data = imageData.data
          
          let bluePixels = 0
          let redPixels = 0
          let totalPixels = 0
          
          // 檢測多個像素點
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const a = data[i + 3]
            
            // 只計算不透明的像素
            if (a > 128) {
              totalPixels++
              
              // 檢測藍色瓦片（主要是藍色，紅色和綠色很少）
              if (b > 200 && r < 50 && g < 50) {
                bluePixels++
              }
              
              // 檢測雜訊紅點（主要是紅色，其他顏色很少）
              if (r > 200 && g < 50 && b < 50) {
                redPixels++
              }
            }
          }
          
          // 如果大部分像素都是藍色，標記為藍色瓦片
          if (totalPixels > 0 && bluePixels / totalPixels > 0.7) {
            img.classList.add('blue-tile')
          }
          
          // 如果大部分像素都是紅色雜訊，標記為雜訊瓦片
          if (totalPixels > 0 && redPixels / totalPixels > 0.7) {
            img.classList.add('noise-tile')
          }
        } catch (error) {
          // 跨域錯誤，無法檢測瓦片顏色，跳過
          log.debug('無法檢測瓦片顏色（跨域限制）:', error.message)
        }
      }
    })

    return layer
  }

  static tileIntersectsBounds(coords, bounds) {
    const n = 2 ** coords.z
    const west = coords.x / n * 360 - 180
    const east = (coords.x + 1) / n * 360 - 180
    const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * coords.y / n))) * 180 / Math.PI
    const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coords.y + 1) / n))) * 180 / Math.PI
    const tileBounds = L.latLngBounds([south, west], [north, east])

    return tileBounds.intersects(bounds)
  }

  parseTiTilerBounds(result) {
    if (result?.success && result.bounds) {
      return [
        [result.bounds.minLat, result.bounds.minLon],
        [result.bounds.maxLat, result.bounds.maxLon]
      ]
    }

    if (Array.isArray(result?.bounds) && result.bounds.length === 4) {
      const [minX, minY, maxX, maxY] = result.bounds
      const crs = String(result.crs || '')

      if (crs.includes('3826')) {
        const [minLon, minLat] = proj4('EPSG:3826', 'EPSG:4326', [minX, minY])
        const [maxLon, maxLat] = proj4('EPSG:3826', 'EPSG:4326', [maxX, maxY])
        return [
          [Math.min(minLat, maxLat), Math.min(minLon, maxLon)],
          [Math.max(minLat, maxLat), Math.max(minLon, maxLon)]
        ]
      }

      return [
        [minY, minX],
        [maxY, maxX]
      ]
    }

    return null
  }

  // 移除 loadCOGBaseMap 方法，因為已經有 createTiTilerLayer 處理 COG


  /**
   * 清除快取（釋放記憶體）
   */
  clearCache() {
    this.cogLayers.clear()
  }





  /**
   * 載入 GeoTIFF 檔案
   * @param {string} imageUrl - 圖片 URL
   * @param {Object} baseMap - 底圖資訊
   * @returns {Promise<Object>} GeoRasterLayer 實例
   */
  async loadGeoTIFF(imageUrl, baseMap) {
    // 只有明確設定 VITE_TITILER_URL 才嘗試 TiTiler，避免無謂的 ERR_CONNECTION_REFUSED
    const titilerBase = import.meta.env.VITE_TITILER_URL
    if (titilerBase && this.isCOGFile(baseMap.storagePath || baseMap.originalName)) {
      try {
        const boundsResponse = await fetch(`${titilerBase}/cog/bounds?url=${encodeURIComponent(imageUrl)}`, {
          signal: AbortSignal.timeout(5000)
        })
        const boundsResult = await boundsResponse.json()
        const bounds = this.parseTiTilerBounds(boundsResult)

        if (boundsResponse.ok && bounds) {
          return this.createTiTilerLayer(imageUrl, baseMap, bounds)
        }
      } catch (error) {
        log.warn('TiTiler COG bounds 檢查失敗，改用 GeoRaster:', error)
      }
    }

    // TiTiler 未設定或不可用 → georaster 直接讀取（COG 也是合法 GeoTIFF）
    return this._loadGeoTIFFInternal(imageUrl, baseMap)
  }

  async _loadGeoTIFFInternal(imageUrl, baseMap) {
    try {
      
      // 動態導入 georaster 和 georaster-layer-for-leaflet
      const georasterModule = await import('georaster')
      const parseGeoraster = georasterModule.default || georasterModule.parseGeoraster
      const GeoRasterLayer = (await import('georaster-layer-for-leaflet')).default
      
      // 載入 TIF 檔案
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      
      // 解析 GeoTIFF（可能會出現一些警告，但不影響最終結果）
      
      // 暫時抑制 console.error 來避免顯示 georaster 的內部警告
      const originalConsoleError = globalThis.console.error
      globalThis.console.error = (...args) => {
        // 過濾掉 georaster 的 EOI_CODE 警告
        const message = args.join(' ')
        if (!message.includes('EOI_CODE') && !message.includes('ran off the end of the buffer')) {
          originalConsoleError.apply(globalThis.console, args)
        }
      }
      
      let georaster
      try {
        georaster = await parseGeoraster(arrayBuffer)
      } finally {
        // 恢復原始的 console.error
        globalThis.console.error = originalConsoleError
      }
      
      
      // 創建 GeoRasterLayer（優化參數）
      const layer = new GeoRasterLayer({
        georaster: georaster,
        opacity: 0.8,
        attribution: `© ${baseMap.name}`,
        resolution: 128, // 降低解析度以提升性能
        pixelValuesToColorFn: (values) => {
          // 處理 NoData 值
          if (values[0] === -10000 || values[1] === -10000 || values[2] === -10000) {
            return 'transparent'
          }
          
          // 將黑色或接近黑色的像素變透明
          const r = values[0] || 0
          const g = values[1] || 0
          const b = values[2] || 0
          
          if (r < 10 && g < 10 && b < 10) {
            return 'transparent'
          }
          
          return `rgb(${r}, ${g}, ${b})`
        }
      })
      
      
      return layer
      
    } catch (error) {
      log.error(`載入 GeoTIFF 失敗: ${baseMap.name}`, error)
      throw error
    }
  }

  /**
   * 創建圖片覆蓋層
   * @param {string} imageUrl - 圖片 URL
   * @param {Array} bounds - 邊界座標
   * @param {Object} baseMap - 底圖資訊
   * @returns {Object} L.imageOverlay 實例
   */
  createImageOverlay(imageUrl, bounds, baseMap) {
    return L.imageOverlay(imageUrl, bounds, {
      opacity: 0.8,
      attribution: `© ${baseMap.name}`,
      interactive: false
    })
  }

  /**
   * 創建瓦片圖層
   * @param {string} tileUrl - 瓦片 URL
   * @param {Object} baseMap - 底圖資訊
   * @returns {Object} L.tileLayer 實例
   */
  createTileLayer(tileUrl, baseMap) {
    return L.tileLayer(tileUrl, {
      attribution: `© ${baseMap.name}`,
      opacity: 0.8
    })
  }

  /**
   * 計算 TIF 檔案邊界
   * @param {string} filename - 檔案名稱
   * @returns {Array} 邊界座標陣列
   */
  async calculateTifBounds(filename, imageUrl = null) {
    try {
      // 如果有 imageUrl 且明確設定了 TiTiler，嘗試從 TiTiler 獲取邊界
      const titilerBase = import.meta.env.VITE_TITILER_URL
      if (imageUrl && titilerBase) {
        try {
          const response = await fetch(`${titilerBase}/cog/bounds?url=${encodeURIComponent(imageUrl)}`, {
            signal: AbortSignal.timeout(3000)
          })
          const result = await response.json()

          const bounds = this.parseTiTilerBounds(result)
          if (bounds) {
            return bounds
          }
        } catch (error) {
          log.warn('無法從 TiTiler 獲取邊界:', error)
        }
      }
      
    // 如果 API 和文件名解析都失敗，返回一個合理的預設邊界
    log.warn('無法獲取 COG 文件邊界，使用預設邊界')
    return [
      [24.67, 121.40], // 西南角 [lat, lng] - 台灣中部山區
      [24.68, 121.41]  // 東北角 [lat, lng] - 台灣中部山區
    ]
  } catch (error) {
    log.warn('無法獲取 COG 文件邊界:', error)
    // 返回預設邊界而不是拋出錯誤
    return [
      [24.67, 121.40], // 西南角 [lat, lng] - 台灣中部山區
      [24.68, 121.41]  // 東北角 [lat, lng] - 台灣中部山區
    ]
  }
  }

  /**
   * 調整地圖視圖到邊界
   * @param {Object} bounds - 邊界對象
   * @param {Object} options - 選項
   */
  fitMapToBounds(bounds, options = {}) {
    if (!this.map || !bounds) return
    
    try {
      if (bounds.isValid && bounds.isValid()) {
        setTimeout(() => {
          if (this.map && !this.map._destroyed) {
            this.map.fitBounds(bounds, {
              padding: [20, 20],
              animate: true,
              duration: 1.0,
              ...options
            })
          }
        }, 100)
      }
    } catch (error) {
      log.error('調整地圖視圖時發生錯誤:', error)
    }
  }

  /**
   * 切換到自定義底圖
   * @param {Object} baseMap - 底圖資訊
   * @param {Function} onLoadingStart - 載入開始回調
   * @param {Function} onLoadingEnd - 載入結束回調
   * @returns {Promise<void>}
   */
  async switchToCustomBaseMap(baseMap, onLoadingStart, onLoadingEnd) {
    if (!this.map) {
      return
    }
    
    // 如果沒有選擇底圖，切換回默認底圖
    if (!baseMap) {
      this.switchToDefaultBaseMap()
      return
    }
    
    
    try {
      // 移除現有的自定義底圖
      if (this.customBaseMapLayer && this.map.hasLayer(this.customBaseMapLayer)) {
        this.map.removeLayer(this.customBaseMapLayer)
      }
      
      // 創建新的底圖圖層
      const staticBase = import.meta.env.VITE_STATIC_URL || 'http://localhost:3001'
      const baseMapUrl = `${staticBase}/${baseMap.storagePath.replace(/^\//, '')}`
      
      // 根據檔案類型判斷是否為 TIF（raster / orthophoto，或副檔名為 .tif/.tiff）
      const nameLower = (baseMap.storagePath || baseMap.originalName || '').toLowerCase()
      const isTif = ['raster', 'orthophoto'].includes(baseMap.fileType) ||
                    nameLower.endsWith('.tif') || nameLower.endsWith('.tiff')

      if (isTif) {
        await this.createTifBaseMapLayer(baseMapUrl, baseMap, onLoadingStart, onLoadingEnd)
      } else {
        this.createTileBaseMapLayer(baseMapUrl, baseMap)
        if (onLoadingEnd) onLoadingEnd()
      }
      
      this.isCustomBaseMapActive = true
      
    } catch (error) {
      log.error('切換自定義底圖失敗:', error)
      if (onLoadingEnd) onLoadingEnd()
      this.switchToDefaultBaseMap()
      throw error
    }
  }

  /**
   * 創建 TIF 底圖圖層
   * @param {string} imageUrl - 圖片 URL
   * @param {Object} baseMap - 底圖資訊
   * @param {Function} onLoadingStart - 載入開始回調
   * @param {Function} onLoadingEnd - 載入結束回調
   * @returns {Promise<void>}
   */
  async createTifBaseMapLayer(imageUrl, baseMap, onLoadingStart, onLoadingEnd) {
    
    // 開始載入
    if (onLoadingStart) {
      onLoadingStart('正在載入正射影像底圖...')
    }
    
    try {
      // 檢查地圖是否準備好
      if (!this.map) {
        throw new Error('地圖未準備好')
      }
      
      
      // 嘗試使用 GeoRasterLayer
      this.customBaseMapLayer = await this.loadGeoTIFF(imageUrl, baseMap)
      
      // 檢查圖層是否創建成功
      if (!this.customBaseMapLayer) {
        throw new Error('GeoRasterLayer 創建失敗')
      }
      
      // 只有當圖層還沒有添加到地圖時才添加
      if (!this.map.hasLayer(this.customBaseMapLayer)) {
        this.customBaseMapLayer.addTo(this.map)
        // 確保自定義底圖顯示在基本地圖之上
        if (this.customBaseMapLayer.bringToFront) {
          this.customBaseMapLayer.bringToFront()
        }
      } else {
        // 如果圖層已存在，也要確保它在最上層
        if (this.customBaseMapLayer.bringToFront) {
          this.customBaseMapLayer.bringToFront()
        }
      }
      
      // 調整地圖視圖到底圖位置
      // TiTiler 圖層沒有 getBounds 方法，使用計算的邊界
      if (this.customBaseMapLayer.getBounds) {
        const bounds = this.customBaseMapLayer.getBounds()
        this.fitMapToBounds(bounds)
      } else {
        const boundsArray = await this.calculateTifBounds(baseMap.originalName || baseMap.name, imageUrl)
        const bounds = L.latLngBounds(boundsArray)
        this.fitMapToBounds(bounds)
      }
      
      
      // 載入完成
      if (onLoadingEnd) {
        onLoadingEnd()
      }
      
    } catch (error) {
      log.error('創建 TIF 底圖圖層失敗:', error)
      
      // 備用方案：使用計算的邊界創建簡單的圖片覆蓋層
      try {
        if (!this.map) {
          throw new Error('地圖未準備好，無法使用備用方案')
        }
        
        // 確保沒有殘留的圖層
        if (this.customBaseMapLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          this.map.removeLayer(this.customBaseMapLayer)
        }
        
        const boundsArray = await this.calculateTifBounds(baseMap.originalName || baseMap.name, imageUrl)
        const bounds = L.latLngBounds(boundsArray)
        
        this.customBaseMapLayer = this.createImageOverlay(imageUrl, bounds, baseMap)
        this.customBaseMapLayer.addTo(this.map)
        // 確保自定義底圖顯示在基本地圖之上
        if (this.customBaseMapLayer.bringToFront) {
          this.customBaseMapLayer.bringToFront()
        }
        
        // 調整地圖視圖到計算的邊界
        this.fitMapToBounds(bounds)
        
        
        // 載入完成
        if (onLoadingEnd) {
          onLoadingEnd()
        }
        
      } catch (fallbackError) {
        log.error('備用方案也失敗:', fallbackError)
        if (onLoadingEnd) {
          onLoadingEnd()
        }
        throw fallbackError
      }
    }
  }



  /**
   * 創建瓦片底圖圖層
   * @param {string} tileUrl - 瓦片 URL
   * @param {Object} baseMap - 底圖資訊
   */
  createTileBaseMapLayer(tileUrl, baseMap) {
    this.customBaseMapLayer = this.createTileLayer(tileUrl, baseMap)
    this.customBaseMapLayer.addTo(this.map)
    // 確保自定義底圖顯示在基本地圖之上
    if (this.customBaseMapLayer.bringToFront) {
      this.customBaseMapLayer.bringToFront()
    }
  }

  /**
   * 切換到預設底圖
   */
  switchToDefaultBaseMap() {
    try {
      
      // 移除自定義底圖圖層
      if (this.customBaseMapLayer && this.map) {
        if (this.map.hasLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          this.map.removeLayer(this.customBaseMapLayer)
        }
        this.customBaseMapLayer = null
      }
      
      // 清理所有可能的圖層（防止有遺漏的圖層）
      if (this.map && this.map.eachLayer) {
        this.map.eachLayer((layer) => {
          // 檢查是否為自定義底圖相關的圖層
          if (layer.options && (
            layer.options.attribution && layer.options.attribution.includes('TiTiler COG') ||
            layer.options.attribution && layer.options.attribution.includes('正射影像') ||
            layer._url && layer._url.includes('cog/tiles')
          )) {
            this.map.removeLayer(layer)
          }
        })
      }
      
      this.isCustomBaseMapActive = false
      
    } catch (error) {
      log.warn('切換到預設底圖時發生錯誤:', error)
      this.customBaseMapLayer = null
      this.isCustomBaseMapActive = false
    }
  }

  /**
   * 清理資源
   */
  destroy() {
    try {
      if (this.customBaseMapLayer) {
        if (this.map && this.map.hasLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          this.map.removeLayer(this.customBaseMapLayer)
        }
        this.customBaseMapLayer = null
      }
      
      this.isCustomBaseMapActive = false
      this.map = null
    } catch (error) {
      log.warn('BaseMapService 清理時發生錯誤:', error)
    }
  }
}
