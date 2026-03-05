<template>
  <div class="temporal-data-marker">
    <!-- 這個組件將在地圖上創建標記 -->
  </div>
</template>

<script>
export default {
  name: 'TemporalDataMarker',
  props: {
    temporalData: {
      type: Object,
      required: true
    },
    map: {
      type: Object,
      required: true
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      marker: null,
      popup: null
    }
  },
  mounted() {
    this.createMarker()
  },
  beforeUnmount() {
    this.removeMarker()
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        this.createMarker()
      } else {
        this.removeMarker()
      }
    },
    temporalData: {
      handler() {
        this.updateMarker()
      },
      deep: true
    }
  },
  methods: {
    createMarker() {
      if (!this.isVisible || !this.temporalData || !this.map) return
      
      // 從 spatial_extent 或 location_columns 獲取座標
      const coordinates = this.getCoordinates()
      if (!coordinates) return
      
      // 創建自定義圖標
      const icon = this.createCustomIcon()
      
      // 創建標記
      this.marker = L.marker(coordinates, { icon })
        .addTo(this.map)
      
      // 創建彈出視窗
      this.popup = L.popup({
        maxWidth: 300,
        className: 'temporal-data-popup'
      })
      
      // 設置彈出視窗內容
      this.popup.setContent(this.createPopupContent())
      this.marker.bindPopup(this.popup)
      
      // 添加點擊事件
      this.marker.on('click', this.onMarkerClick)
    },
    
    removeMarker() {
      if (this.marker) {
        this.map.removeLayer(this.marker)
        this.marker = null
        this.popup = null
      }
    },
    
    updateMarker() {
      this.removeMarker()
      this.createMarker()
    },
    
    getCoordinates() {
      // 嘗試從 spatial_extent 獲取座標
      if (this.temporalData.spatial_extent) {
        try {
          // 如果是 POINT 格式，解析座標
          const pointMatch = this.temporalData.spatial_extent.match(/POINT\(([^)]+)\)/)
          if (pointMatch) {
            const coords = pointMatch[1].split(' ')
            return [parseFloat(coords[1]), parseFloat(coords[0])] // [lat, lng]
          }
        } catch (error) {
          console.error('解析 spatial_extent 失敗:', error)
        }
      }
      
      // 如果沒有 spatial_extent，嘗試從 location_columns 獲取
      if (this.temporalData.location_columns && this.temporalData.location_columns.length >= 2) {
        // 這裡需要從實際數據中獲取座標，暫時返回 null
        return null
      }
      
      return null
    },
    
    createCustomIcon() {
      // 根據資料類型創建不同顏色的圖標
      const color = this.getTypeColor(this.temporalData.data_type)
      
      return L.divIcon({
        className: 'temporal-data-icon',
        html: `
          <div class="temporal-marker" style="background-color: ${color}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      })
    },
    
    getTypeColor(type) {
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
    
    createPopupContent() {
      return `
        <div class="temporal-popup-content">
          <div class="popup-header">
            <h4 class="popup-title">${this.temporalData.name}</h4>
            <span class="popup-type" style="background-color: ${this.getTypeColor(this.temporalData.data_type)}">
              ${this.getTypeLabel(this.temporalData.data_type)}
            </span>
          </div>
          <div class="popup-body">
            <p class="popup-description">${this.temporalData.description || '無描述'}</p>
            <div class="popup-info">
              <div class="info-item">
                <span class="info-label">資料格式:</span>
                <span class="info-value">${this.temporalData.data_format.toUpperCase()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">記錄數:</span>
                <span class="info-value">${this.temporalData.total_records || 0}</span>
              </div>
              <div class="info-item">
                <span class="info-label">時間範圍:</span>
                <span class="info-value">${this.formatDateRange(this.temporalData.start_time, this.temporalData.end_time)}</span>
              </div>
            </div>
            <div class="popup-actions">
              <button class="view-chart-btn" onclick="window.viewTemporalChart('${this.temporalData.temporal_id}')">
                查看圖表
              </button>
            </div>
          </div>
        </div>
      `
    },
    
    getTypeLabel(type) {
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
    
    formatDateRange(startTime, endTime) {
      if (!startTime || !endTime) return '未知'
      
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      return `${start.toLocaleDateString('zh-TW')} - ${end.toLocaleDateString('zh-TW')}`
    },
    
    onMarkerClick(event) {
      // 發送事件給父組件
      this.$emit('marker-click', {
        temporalData: this.temporalData,
        coordinates: event.latlng
      })
    }
  }
}
</script>

<style scoped>
.temporal-data-marker {
  display: none; /* 這個組件不顯示任何內容，只是管理地圖標記 */
}

/* 全局樣式，用於地圖標記 */
:global(.temporal-data-icon) {
  background: transparent !important;
  border: none !important;
}

:global(.temporal-marker) {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

:global(.temporal-marker:hover) {
  transform: scale(1.1);
}

:global(.temporal-data-popup) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

:global(.temporal-popup-content) {
  min-width: 200px;
}

:global(.popup-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

:global(.popup-title) {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

:global(.popup-type) {
  font-size: 10px;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

:global(.popup-body) {
  font-size: 12px;
}

:global(.popup-description) {
  margin: 0 0 8px 0;
  color: #6b7280;
  line-height: 1.4;
}

:global(.popup-info) {
  margin-bottom: 12px;
}

:global(.info-item) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

:global(.info-label) {
  color: #6b7280;
  font-weight: 500;
}

:global(.info-value) {
  color: #1f2937;
  font-weight: 600;
}

:global(.popup-actions) {
  text-align: center;
}

:global(.view-chart-btn) {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

:global(.view-chart-btn:hover) {
  background-color: #2563eb;
}
</style>
