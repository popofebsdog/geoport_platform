// 移除不必要的 COG 服務導入

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
    console.log('COG 文件檢測:', { filePath, isCOG })
    return isCOG
  }

  /**
   * 創建 TiTiler 瓦片圖層
   * @param {string} imageUrl - 圖片 URL
   * @param {Object} baseMap - 底圖資訊
   * @returns {L.TileLayer} TiTiler 瓦片圖層
   */
  createTiTilerLayer(imageUrl, baseMap) {
    if (!this.map) {
      throw new Error('地圖未準備好')
    }

    // 構建 TiTiler 瓦片 URL (使用 WebMercatorQuad 瓦片矩陣集)
    const titilerUrl = `http://localhost:8000/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${encodeURIComponent(imageUrl)}`
    
    console.log('創建 TiTiler 瓦片圖層:', titilerUrl)
    
    // 創建自定義瓦片圖層，實現全瓦片載入
    const layer = L.tileLayer(titilerUrl, {
      attribution: `© ${baseMap.name} | TiTiler COG`,
      minZoom: 1,
      maxZoom: 22,
      opacity: 0.8,
      // 使用完全透明的錯誤瓦片
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      // 添加 CSS 類來處理藍色瓦片
      className: 'cog-tile-layer',
      // 添加超時設置
      timeout: 10000,
      // 添加重試設置
      retry: 3,
      // 設置跨域屬性
      crossOrigin: true,
      // 關鍵配置：讓瓦片圖層載入所有瓦片
      keepBuffer: 20, // 增加緩衝區，預載入更多瓦片
      updateWhenZooming: true, // 縮放時更新瓦片
      updateWhenIdle: true, // 空閒時更新瓦片
      // 設置瓦片大小
      tileSize: 256,
      // 禁用瓦片邊界檢查
      bounds: null
    })

    // 添加地圖事件監聽，確保瓦片持續載入
    layer.on('add', () => {
      console.log('COG 瓦片圖層已添加到地圖')
      
      // 監聽地圖移動和縮放事件，確保瓦片持續載入
      this.map.on('moveend', () => {
        console.log('地圖移動結束，更新瓦片')
        layer.redraw()
      })
      
      this.map.on('zoomend', () => {
        console.log('地圖縮放結束，更新瓦片')
        layer.redraw()
      })
    })
    
    // 重寫瓦片載入邏輯，確保載入所有瓦片
    const originalCreateTile = layer.createTile
    layer.createTile = function(coords, done) {
      const tile = originalCreateTile.call(this, coords, done)
      
      // 為瓦片添加載入完成事件
      tile.onload = function() {
        console.log(`瓦片載入完成: ${coords.z}/${coords.x}/${coords.y}`)
      }
      
      return tile
    }

    // 添加錯誤處理
    layer.on('tileerror', (error) => {
      console.warn('TiTiler 瓦片載入錯誤:', error)
    })

    layer.on('tileload', () => {
      console.log('TiTiler 瓦片載入成功')
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
          console.debug('無法檢測瓦片顏色（跨域限制）:', error.message)
        }
      }
    })

    return layer
  }

  // 移除 loadCOGBaseMap 方法，因為已經有 createTiTilerLayer 處理 COG


  /**
   * 清除快取（釋放記憶體）
   */
  clearCache() {
    console.log('清除所有圖層快取')
    this.cogLayers.clear()
  }





  /**
   * 載入 GeoTIFF 檔案
   * @param {string} imageUrl - 圖片 URL
   * @param {Object} baseMap - 底圖資訊
   * @returns {Promise<Object>} GeoRasterLayer 實例
   */
  async loadGeoTIFF(imageUrl, baseMap) {
    // 檢查是否為 COG 文件
    console.log('檢查 COG 文件:', { 
      storagePath: baseMap.storagePath, 
      originalName: baseMap.originalName,
      name: baseMap.name 
    })
    if (this.isCOGFile(baseMap.storagePath || baseMap.originalName)) {
      console.log('檢測到 COG 文件，使用 TiTiler 服務:', baseMap.name)
      
      // 檢查 TiTiler 服務器是否可用
      const healthCheck = await fetch('http://localhost:8000/health', { 
        method: 'GET',
        timeout: 5000 
      }).catch(() => null)
      
      if (!healthCheck || !healthCheck.ok) {
        throw new Error('TiTiler 服務器不可用，請確保服務器正在運行')
      }
      
      console.log('TiTiler 服務器正常，創建瓦片圖層')
      const layer = this.createTiTilerLayer(imageUrl, baseMap)
      console.log('TiTiler 圖層創建成功:', baseMap.name)
      return layer
    }

    // 對於非 COG 文件，直接載入（不再使用暫存）
    console.log('載入傳統 TIF 文件:', baseMap.name)
    return this._loadGeoTIFFInternal(imageUrl, baseMap)
  }

  async _loadGeoTIFFInternal(imageUrl, baseMap) {
    try {
      console.log('開始載入 GeoTIFF 檔案:', imageUrl)
      
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
      console.log('TIF 檔案載入完成，檔案大小:', arrayBuffer.byteLength, 'bytes')
      
      // 解析 GeoTIFF（可能會出現一些警告，但不影響最終結果）
      console.log('開始解析 GeoTIFF（可能會出現一些解析警告，這是正常的）...')
      
      // 暫時抑制 console.error 來避免顯示 georaster 的內部警告
      const originalConsoleError = console.error
      console.error = (...args) => {
        // 過濾掉 georaster 的 EOI_CODE 警告
        const message = args.join(' ')
        if (!message.includes('EOI_CODE') && !message.includes('ran off the end of the buffer')) {
          originalConsoleError.apply(console, args)
        }
      }
      
      let georaster
      try {
        georaster = await parseGeoraster(arrayBuffer)
      } finally {
        // 恢復原始的 console.error
        console.error = originalConsoleError
      }
      
      console.log('GeoTIFF 解析完成，創建圖層...')
      
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
      
      console.log('GeoRasterLayer 創建成功')
      
      console.log(`TIF 檔案載入完成: ${baseMap.name}`)
      return layer
      
    } catch (error) {
      console.error(`載入 GeoTIFF 失敗: ${baseMap.name}`, error)
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
      // 如果有 imageUrl，嘗試從 TiTiler 服務器獲取邊界
      if (imageUrl) {
        try {
          const response = await fetch(`http://localhost:8000/cog/bounds?url=${encodeURIComponent(imageUrl)}`)
          const result = await response.json()
          
          if (result.success && result.bounds) {
            const bounds = [
              [result.bounds.minLat, result.bounds.minLon], // 西南角
              [result.bounds.maxLat, result.bounds.maxLon]  // 東北角
            ]
            console.log('從 TiTiler 獲取的邊界:', bounds)
            return bounds
          }
        } catch (error) {
          console.warn('無法從 TiTiler 獲取邊界:', error)
        }
      }
      
    // 如果 API 和文件名解析都失敗，返回一個合理的預設邊界
    console.warn('無法獲取 COG 文件邊界，使用預設邊界')
    return [
      [24.67, 121.40], // 西南角 [lat, lng] - 台灣中部山區
      [24.68, 121.41]  // 東北角 [lat, lng] - 台灣中部山區
    ]
  } catch (error) {
    console.warn('無法獲取 COG 文件邊界:', error)
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
      console.error('調整地圖視圖時發生錯誤:', error)
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
      console.log('地圖未初始化，無法切換底圖')
      return
    }
    
    // 如果沒有選擇底圖，切換回默認底圖
    if (!baseMap) {
      this.switchToDefaultBaseMap()
      return
    }
    
    console.log('切換到自定義底圖:', baseMap)
    
    try {
      // 移除現有的自定義底圖
      if (this.customBaseMapLayer && this.map.hasLayer(this.customBaseMapLayer)) {
        this.map.removeLayer(this.customBaseMapLayer)
      }
      
      // 創建新的底圖圖層
      const baseMapUrl = `http://localhost:3001/${baseMap.storagePath.replace(/^\//, '')}`
      console.log('底圖 URL:', baseMapUrl)
      
      // 根據檔案類型創建不同的圖層
      if (baseMap.fileType === 'orthophoto' || baseMap.originalName?.toLowerCase().endsWith('.tif')) {
        await this.createTifBaseMapLayer(baseMapUrl, baseMap, onLoadingStart, onLoadingEnd)
      } else {
        this.createTileBaseMapLayer(baseMapUrl, baseMap)
        if (onLoadingEnd) onLoadingEnd()
      }
      
      this.isCustomBaseMapActive = true
      console.log('自定義底圖切換成功')
      
    } catch (error) {
      console.error('切換自定義底圖失敗:', error)
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
    console.log('開始創建 TIF 底圖圖層:', baseMap)
    console.log('圖片 URL:', imageUrl)
    
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
        // 對於 TiTiler 圖層，使用計算的邊界
        console.log('開始計算 TIF 邊界，參數:', { 
          filename: baseMap.originalName || baseMap.name, 
          imageUrl: imageUrl 
        })
        const boundsArray = await this.calculateTifBounds(baseMap.originalName || baseMap.name, imageUrl)
        console.log('計算得到的邊界:', boundsArray)
        const bounds = L.latLngBounds(boundsArray)
        console.log('Leaflet 邊界對象:', bounds)
        this.fitMapToBounds(bounds)
      }
      
      console.log('TIF 底圖圖層創建成功')
      
      // 載入完成
      if (onLoadingEnd) {
        onLoadingEnd()
      }
      
    } catch (error) {
      console.error('創建 TIF 底圖圖層失敗:', error)
      console.log('嘗試使用備用方案...')
      
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
        
        console.log('備用方案成功：使用 imageOverlay 創建底圖')
        
        // 載入完成
        if (onLoadingEnd) {
          onLoadingEnd()
        }
        
      } catch (fallbackError) {
        console.error('備用方案也失敗:', fallbackError)
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
      console.log('開始切換到預設底圖...')
      
      // 移除自定義底圖圖層
      if (this.customBaseMapLayer && this.map) {
        if (this.map.hasLayer && this.map.hasLayer(this.customBaseMapLayer)) {
          console.log('移除自定義底圖圖層')
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
            console.log('發現並移除遺漏的底圖圖層')
            this.map.removeLayer(layer)
          }
        })
      }
      
      this.isCustomBaseMapActive = false
      console.log('切換到預設底圖完成')
      
    } catch (error) {
      console.warn('切換到預設底圖時發生錯誤:', error)
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
      console.warn('BaseMapService 清理時發生錯誤:', error)
    }
  }
}
