<template>
  <div class="w-full h-full relative">
    <div ref="mapContainer" class="w-full h-full rounded-lg overflow-hidden"></div>
    
    <!-- 地圖圖例 -->
    <div v-if="!childProjects || childProjects.length === 0" 
         class="absolute top-4 right-4 rounded-lg shadow-lg p-3 z-[1000] transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'">
      <h4 class="text-sm font-semibold mb-2 transition-colors duration-300"
          :class="isDarkMode ? 'text-white' : 'text-gray-900'">圖例</h4>
      <div class="space-y-2">
        <!-- 專案圖例 -->
        <div v-if="projects.length > 0" class="space-y-1">
          <div class="text-xs font-medium transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">專案</div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-green-500"></div>
            <span class="text-xs transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">公路</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-blue-500"></div>
            <span class="text-xs transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">國道</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-purple-500"></div>
            <span class="text-xs transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">鐵路</span>
          </div>
        </div>
        
        <!-- 報告圖例 -->
        <div v-if="reports.length > 0" class="space-y-1">
          <div class="text-xs font-medium transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">報告</div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-red-500"></div>
            <span class="text-xs transition-colors duration-300"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">報告</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 子專案資訊卡片 -->
    <Teleport to="body">
      <div v-if="showInfoCard && selectedChildProject" 
           class="fixed inset-0 z-[2000] flex items-center justify-center p-4"
           @click.self="closeInfoCard">
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 transition-opacity duration-300"
             :class="isDarkMode ? 'bg-black/70' : 'bg-black/50'"
             @click="closeInfoCard"></div>
        
        <!-- 資訊卡片 -->
        <div class="relative w-full max-w-md rounded-2xl shadow-2xl transition-all duration-300 transform"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
          <!-- 標題列 -->
          <div class="flex items-center justify-between p-6 border-b"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <div class="flex items-center space-x-3">
              <!-- 順序號圖標 -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                   style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                {{ selectedChildProject.orderNumber || 1 }}
              </div>
              <div>
                <h3 class="text-xl font-semibold transition-colors duration-300"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  時期專案資訊
                </h3>
                <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  點擊下方按鈕進入專案詳情
                </p>
              </div>
            </div>
            
            <!-- 關閉按鈕 -->
            <button
              @click="closeInfoCard"
              class="p-2 rounded-lg transition-all duration-300"
              :class="isDarkMode ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- 內容區域 -->
          <div class="p-6 space-y-4">
            <!-- 專案名稱 -->
            <div>
              <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                專案名稱
              </label>
              <p class="text-base font-medium transition-colors duration-300"
                 :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ selectedChildProject.name || '未命名' }}
              </p>
            </div>
            
            <!-- 專案描述 -->
            <div v-if="selectedChildProject.description">
              <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                專案描述
              </label>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                {{ selectedChildProject.description }}
              </p>
            </div>
            
            <!-- 重要事件日期 -->
            <div v-if="selectedChildProject.event_date">
              <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                重要事件日期
              </label>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                {{ formatEventDate(selectedChildProject.event_date) }}
              </p>
            </div>
            
            <!-- 母專案資訊 -->
            <div v-if="selectedChildProject.parentProject">
              <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                所屬地點
              </label>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                {{ selectedChildProject.parentProject.name || '未知' }}
              </p>
            </div>
          </div>
          
          <!-- 底部按鈕 -->
          <div class="flex items-center justify-end space-x-3 p-6 border-t"
               :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <button
              @click="closeInfoCard"
              class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300"
              :class="isDarkMode 
                ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
            >
              取消
            </button>
            
            <button
              @click="openChildProject"
              class="px-6 py-2.5 rounded-lg font-medium transition-all duration-300"
              :class="isDarkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-500 text-white hover:bg-blue-600'"
            >
              進入專案
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 修復Leaflet默認圖標問題
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default {
  name: 'ProjectMap',
  emits: ['project-clicked', 'child-project-clicked', 'map-click', 'marker-click'],
  props: {
    projects: {
      type: Array,
      default: () => []
    },
    childProjects: {
      type: Array,
      default: () => []
    },
    reports: {
      type: Array,
      default: () => []
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      map: null,
      markers: [],
      selectedChildProject: null, // 當前選中的子專案（用於顯示資訊卡片）
      showInfoCard: false // 是否顯示資訊卡片
    }
  },
  mounted() {
    // 延遲初始化以確保DOM已渲染
    this.$nextTick(() => {
      setTimeout(() => {
        this.initMap()
        this.addMarkers()
        this.updateControlStyles()
      }, 100)
    })
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove()
    }
  },
  watch: {
    projects: {
      handler() {
        this.updateMarkers()
      },
      deep: true
    },
    childProjects: {
      handler() {
        this.updateMarkers()
      },
      deep: true
    },
    reports: {
      handler() {
        this.updateMarkers()
      },
      deep: true
    },
    isDarkMode() {
      this.updateMapStyle()
    }
  },
  methods: {
    initMap() {
      
      if (!this.$refs.mapContainer) {
        console.error('地圖容器未找到')
        return
      }

      // 創建地圖實例
      this.map = L.map(this.$refs.mapContainer, {
        zoomControl: true,
        attributionControl: true
      })

      // 設置初始視圖（台灣中心）
      this.map.setView([23.5, 121], 7)

      // 添加圖層
      this.addTileLayer()
      
    },

    addTileLayer() {
      // 根據主題選擇不同的地圖樣式
      const tileUrl = this.isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      
      const attribution = this.isDarkMode
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

      L.tileLayer(tileUrl, {
        attribution: attribution,
        maxZoom: 18
      }).addTo(this.map)
    },

    addMarkers() {
      this.clearMarkers()
      
      // 如果提供了 childProjects，只顯示子專案標記
      if (this.childProjects && this.childProjects.length > 0) {
        this.childProjects.forEach(childProject => {
          if (childProject.location && childProject.location.lat && childProject.location.lng) {
            const marker = this.createChildProjectMarker(childProject)
            marker.addTo(this.map)
            this.markers.push(marker)
          }
        })
      } else {
        // 回退到顯示專案標記（向後兼容）
        this.projects.forEach(project => {
          if (project.location && project.location.lat && project.location.lng) {
            const marker = this.createProjectMarker(project)
            marker.addTo(this.map)
            this.markers.push(marker)
          }
        })
      }
      
      // 添加報告標記
      this.reports.forEach(report => {
        if (report.location && report.location.lat && report.location.lng) {
          const marker = this.createReportMarker(report)
          marker.addTo(this.map)
          this.markers.push(marker)
        }
      })

      // 調整地圖視圖以包含所有標記
      if (this.markers.length > 0) {
        const group = new L.featureGroup(this.markers)
        this.map.fitBounds(group.getBounds().pad(0.1))
      }
    },

    createChildProjectMarker(childProject) {
      // 使用順序數字作為標記（藍色圓形，中間顯示數字）
      const orderNumber = childProject.orderNumber || 1
      const iconColor = '#3b82f6' // 藍色

      // 創建自定義圖標（藍色圓形，中間顯示數字）
      const customIcon = L.divIcon({
        className: 'custom-child-project-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${iconColor} 0%, #2563eb 100%);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: white;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: transform 0.2s ease;
          " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            ${orderNumber}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      })

      // 創建標記
      const marker = L.marker([childProject.location.lat, childProject.location.lng], {
        icon: customIcon
      })

      // 添加點擊事件來顯示子專案資訊卡片
      marker.on('click', () => {
        this.selectedChildProject = childProject
        this.showInfoCard = true
        this.$emit('child-project-clicked', childProject)
      })

      return marker
    },

    createProjectMarker(project) {
      // 根據道路類型選擇不同的圖標顏色
      let iconColor = 'green'
      switch (project.roadType) {
        case 'highway':
          iconColor = 'green'
          break
        case 'national':
          iconColor = 'blue'
          break
        case 'railway':
          iconColor = 'purple'
          break
        default:
          iconColor = 'green'
      }

      // 創建自定義圖標
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" style="background-color: ${iconColor};">${this.getProjectIconText(project.roadType)}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      // 創建標記
      const marker = L.marker([project.location.lat, project.location.lng], {
        icon: customIcon
      })

      // 添加彈出窗口
      const popupContent = this.createPopupContent(project)
      marker.bindPopup(popupContent)

      // 添加點擊事件來打開圖層面板
      marker.on('click', () => {
        this.$emit('project-clicked', project)
      })

      return marker
    },

    createReportMarker(report) {
      // 報告使用紅色圖標
      const iconColor = 'red'

      // 創建自定義圖標
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold" style="background-color: ${iconColor};">報</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      // 創建標記
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: customIcon
      })

      // 添加彈出窗口
      const popupContent = this.createReportPopupContent(report)
      marker.bindPopup(popupContent)

      return marker
    },

    createPopupContent(project) {
      return `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-2">${project.eventName}</h3>
          <p class="text-xs text-gray-600 mb-2">${project.description}</p>
          <div class="space-y-1 text-xs">
            <div><strong>道路編號:</strong> ${project.highway}</div>
            <div><strong>開始時間:</strong> ${new Date(project.startTime).toLocaleString('zh-TW')}</div>
            <div><strong>結束時間:</strong> ${new Date(project.endTime).toLocaleString('zh-TW')}</div>
          </div>
        </div>
      `
    },

    createReportPopupContent(report) {
      return `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-sm mb-2">${report.title}</h3>
          <p class="text-xs text-gray-600 mb-2">${report.description || '無描述'}</p>
          <div class="space-y-1 text-xs">
            <div><strong>檔案類型:</strong> ${report.fileType}</div>
            <div><strong>檔案名稱:</strong> ${report.fileName || '無'}</div>
            <div><strong>創建時間:</strong> ${new Date(report.createdAt).toLocaleString('zh-TW')}</div>
          </div>
        </div>
      `
    },

    getProjectIconText(roadType) {
      switch (roadType) {
        case 'highway':
          return '公'
        case 'national':
          return '國'
        case 'railway':
          return '鐵'
        default:
          return '公'
      }
    },

    clearMarkers() {
      this.markers.forEach(marker => {
        this.map.removeLayer(marker)
      })
      this.markers = []
    },

    updateMarkers() {
      this.addMarkers()
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
        
        // 如果有時間（不是 00:00），顯示時間
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

    // 關閉資訊卡片
    closeInfoCard() {
      this.showInfoCard = false
      this.selectedChildProject = null
    },

    // 打開子專案詳情
    openChildProject() {
      if (this.selectedChildProject) {
        this.$emit('child-project-clicked', this.selectedChildProject)
        this.closeInfoCard()
      }
    },

    updateMapStyle() {
      if (this.map) {
        // 清除現有圖層
        this.map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            this.map.removeLayer(layer)
          }
        })
        
        // 添加新的圖層
        this.addTileLayer()
        
        // 更新控件樣式
        this.updateControlStyles()
      }
    },

    updateControlStyles() {
      // 更新縮放按鈕樣式
      const zoomControls = document.querySelectorAll('.leaflet-control-zoom a')
      zoomControls.forEach(control => {
        if (this.isDarkMode) {
          control.style.backgroundColor = '#1e293b'
          control.style.color = '#e2e8f0'
        } else {
          control.style.backgroundColor = 'white'
          control.style.color = '#333'
        }
      })

      // 更新attribution樣式
      const attribution = document.querySelector('.leaflet-control-attribution')
      if (attribution) {
        if (this.isDarkMode) {
          attribution.style.backgroundColor = 'rgba(30, 41, 59, 0.8)'
          attribution.style.color = '#e2e8f0'
        } else {
          attribution.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
          attribution.style.color = '#333'
        }
      }

      // 更新圖例框樣式（如果存在）
      const legend = this.$el.querySelector('.absolute.top-4.right-4')
      if (legend) {
        if (this.isDarkMode) {
          legend.style.backgroundColor = '#1e293b'
          legend.style.borderColor = '#475569'
        } else {
          legend.style.backgroundColor = 'white'
          legend.style.borderColor = '#e5e7eb'
        }
      }
    }
  }
}
</script>

<style scoped>
.custom-marker {
  background: transparent !important;
  border: none !important;
}

/* 確保地圖容器有正確的高度 */
.leaflet-container {
  height: 100%;
  width: 100%;
}

/* Leaflet 縮放按鈕主題支援 */
.leaflet-control-zoom {
  border: none !important;
  box-shadow: 0 1px 5px rgba(0,0,0,0.4) !important;
}

.leaflet-control-zoom a {
  background-color: white !important;
  color: #333 !important;
  border: none !important;
  font-size: 18px !important;
  font-weight: bold !important;
  line-height: 26px !important;
  text-align: center !important;
  text-decoration: none !important;
  width: 26px !important;
  height: 26px !important;
  display: block !important;
}

.leaflet-control-zoom a:hover {
  background-color: #f4f4f4 !important;
  color: #333 !important;
}

/* Attribution 控制項主題支援 */
.leaflet-control-attribution {
  background-color: rgba(255, 255, 255, 0.8) !important;
  color: #333 !important;
  font-size: 11px !important;
}

/* Popup 主題支援 */
.leaflet-popup-content-wrapper {
  border-radius: 8px !important;
  box-shadow: 0 3px 14px rgba(0,0,0,0.4) !important;
}

.leaflet-popup-content {
  margin: 8px 12px !important;
  line-height: 1.4 !important;
}

/* 子專案標記樣式 */
:deep(.custom-child-project-marker) {
  background: transparent !important;
  border: none !important;
}
</style>
