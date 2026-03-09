<template>
  <div class="map-container">
    <div 
      :id="mapId" 
      class="map-element"
      :style="height > 0 ? { height: `${height}px` } : { height: '100%' }"
    ></div>
    
    <!-- 地图控制器 -->
    <div v-if="showControls" class="map-controls">
      <div class="control-group">
        <button 
          v-if="showProjectMarkers"
          @click="toggleLayer('projects')"
          class="control-btn"
          :class="{ active: visibleLayers.projects }"
        >
          專案標記
        </button>

        <button 
          v-if="hasMileageData"
          @click="toggleLayer('mileage')"
          class="control-btn"
          :class="{ active: visibleLayers.mileage }"
        >
          里程樁號
        </button>
      </div>
    </div>
    
    <!-- 信息面板 -->
    <div v-if="selectedMarker" class="info-panel">
      <div class="info-header">
        <h4 class="info-title">{{ getMarkerTitle(selectedMarker) }}</h4>
        <button @click="closeInfoPanel" class="close-btn">×</button>
      </div>
      <div class="info-content">
        <p class="info-description">{{ getMarkerDescription(selectedMarker) }}</p>
        <div class="info-meta">
          <span class="info-time">{{ formatDateTime(selectedMarker.datetime || selectedMarker.createdAt) }}</span>
          <span class="info-location">
            {{ selectedMarker.location.lat.toFixed(4) }}, 
            {{ selectedMarker.location.lng.toFixed(4) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import dayjs from 'dayjs'

export default {
  name: 'MapComponent',
  props: {
    height: {
      type: Number,
      default: 400
    },
    interactive: {
      type: Boolean,
      default: true
    },
    showControls: {
      type: Boolean,
      default: true
    },
    projectData: {
      type: Array,
      default: () => []
    },
    warningData: {
      type: Array,
      default: () => []
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    selectedProject: {
      type: Object,
      default: null
    },
    selectedWarningLevel: {
      type: String,
      default: 'all'
    },
    showWeatherLayer: {
      type: Boolean,
      default: false
    },
    projectUploads: {
      type: Array,
      default: () => []
    },
    showInSARData: {
      type: Boolean,
      default: false
    },
    insarDataUrl: {
      type: String,
      default: ''
    },
    showMileageMarkers: {
      type: Boolean,
      default: false
    },
    mileageDataUrl: {
      type: String,
      default: ''
    },
    center: {
      type: Object,
      default: () => ({ lat: 24.8186, lng: 121.2681 })
    },
    zoom: {
      type: Number,
      default: 12
    },
    lockView: {
      type: Boolean,
      default: false
    },
    showProjectMarkers: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      map: null,
      mapId: `map-${Date.now()}`,
      selectedMarker: null,
      visibleLayers: {
        projects: true,
        warnings: true,
        weather: false,
        orthophoto: false,
        shapefile: false,
        insar: false,
        numerical: false,
        mileage: true
      },
      layers: {
        projects: null,
        warnings: null,
        weather: null,
        orthophoto: null,
        shapefile: null,
        insar: null,
        numerical: null,
        mileage: null
      },
      markers: [],
      shapefileData: null,
      insarData: null,
      numericalData: null,
      mileageData: null
    }
  },
  emits: ['map-click', 'marker-click'],
  computed: {
    hasWarningData() {
      return this.warningData && this.warningData.length > 0
    },
    hasWeatherData() {
      // 可以根據實際需要控制天氣圖層的顯示
      return false
    },
    hasOrthophotoData() {
      if (!this.selectedProject) return false
      return this.projectUploads.some(upload => 
        upload.projectId === this.selectedProject.id && upload.dataType === 'orthophoto'
      )
    },
    hasShapefileData() {
      if (!this.selectedProject) return false
      return this.projectUploads.some(upload => 
        upload.projectId === this.selectedProject.id && upload.dataType === 'shapefile'
      )
    },
    hasInSARData() {
      return this.showInSARData && this.insarDataUrl
    },
    hasNumericalData() {
      if (!this.selectedProject) return false
      return this.projectUploads.some(upload => 
        upload.projectId === this.selectedProject.id && upload.dataType === 'numerical_simulation'
      )
    },
    hasMileageData() {
      return this.showMileageMarkers && this.mileageDataUrl
    }
  },
  mounted() {
    this.initMap()
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove()
    }
  },
  watch: {
    projectData: {
      handler() {
        this.updateProjectMarkers()
      },
      deep: true
    },
    warningData: {
      handler() {
        this.updateWarningMarkers()
      },
      deep: true
    },
    selectedProject: {
      handler(newProject) {
        if (newProject) {
          this.focusOnMarker(newProject)
        }
        // 重新初始化資料圖層
        this.reinitDataLayers()
      }
    },
    selectedWarningLevel: {
      handler() {
        this.updateWarningMarkers()
      }
    },
    showWeatherLayer: {
      handler(show) {
        this.toggleWeatherLayer(show)
      }
    },
    showInSARData: {
      handler() {
        this.reinitDataLayers()
      }
    },
    insarDataUrl: {
      handler() {
        this.reinitDataLayers()
      }
    },
    mileageDataUrl: {
      handler() {
        this.initMileageLayer()
      }
    }
  },
  methods: {
    initMap() {
      // 初始化地图
      this.map = L.map(this.mapId, {
        center: [23.8, 121.0], // 台湾中心
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: this.interactive,
        dragging: this.interactive,
        touchZoom: this.interactive,
        doubleClickZoom: this.interactive,
        boxZoom: this.interactive,
        keyboard: this.interactive
      })
      
      // 添加底图
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map)
      
      // 初始化图层组
      this.layers.projects = L.layerGroup().addTo(this.map)
      this.layers.warnings = L.layerGroup().addTo(this.map)
      this.layers.weather = L.layerGroup()
      this.layers.orthophoto = L.layerGroup()
      this.layers.shapefile = L.layerGroup()
      this.layers.insar = L.layerGroup()
      this.layers.numerical = L.layerGroup()
      this.layers.mileage = L.layerGroup().addTo(this.map)
      
      // 添加点击事件
      if (this.interactive) {
        this.map.on('click', this.onMapClick)
      }
      
      // 初始化数据
      this.updateProjectMarkers()
      this.updateWarningMarkers()
      this.initOrthophotoLayer()
      this.initShapefileLayer()
      this.initInSARLayer()
      this.initNumericalLayer()
      this.initMileageLayer()
      
      if (this.showWeatherLayer) {
        this.toggleWeatherLayer(true)
      }
      
      // 设置地图视图
      if (this.lockView) {
        this.map.setView([this.center.lat, this.center.lng], this.zoom)
      }
    },
    
    onMapClick(e) {
      this.$emit('map-click', {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      })
    },
    
    updateProjectMarkers() {
      if (!this.layers.projects) return
      
      // 清除现有标记
      this.layers.projects.clearLayers()
      
      // 添加專案標記
      this.projectData.forEach(project => {
        const marker = this.createProjectMarker(project)
        this.layers.projects.addLayer(marker)
      })
    },
    
    createProjectMarker(project) {
      const icon = this.getProjectIcon(project)
      const marker = L.marker([project.location.lat, project.location.lng], { icon })
      
      marker.on('click', () => {
        this.selectedMarker = project
        this.$emit('marker-click', project)
      })
      
      return marker
    },
    
    getProjectIcon(project) {
      const isSelected = this.selectedProject && this.selectedProject.id === project.id
      const color = isSelected ? '#2563eb' : '#6366f1'
      const iconText = '📋'
      
      return L.divIcon({
        html: `
          <div class="project-marker" style="background-color: ${color}; border-color: ${isSelected ? '#1d4ed8' : '#4f46e5'}">
            <span class="marker-icon">${iconText}</span>
          </div>
        `,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    },
    
    updateWarningMarkers() {
      if (!this.layers.warnings) return
      
      // 清除现有标记
      this.layers.warnings.clearLayers()
      
      // 添加预警标记
      this.warningData.forEach(warning => {
        if (this.selectedWarningLevel === 'all' || warning.level === this.selectedWarningLevel) {
          const marker = this.createWarningMarker(warning)
          this.layers.warnings.addLayer(marker)
        }
      })
    },
    
    createWarningMarker(warning) {
      const colors = {
        green: '#22c55e',
        yellow: '#eab308',
        orange: '#f97316',
        red: '#ef4444'
      }
      
      const color = colors[warning.level] || '#6b7280'
      
      // 创建预警区域圆圈
      const circle = L.circle([warning.location.lat, warning.location.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        radius: 5000 // 5km 范围
      })
      
      circle.on('click', () => {
        this.selectedMarker = warning
        this.$emit('marker-click', warning)
      })
      
      return circle
    },
    
    toggleLayer(layerName) {
      this.visibleLayers[layerName] = !this.visibleLayers[layerName]
      
      if (layerName === 'weather') {
        this.toggleWeatherLayer(this.visibleLayers[layerName])
      } else if (layerName === 'orthophoto') {
        this.toggleOrthophotoLayer(this.visibleLayers[layerName])
      } else if (layerName === 'shapefile') {
        this.toggleShapefileLayer(this.visibleLayers[layerName])
      } else if (layerName === 'insar') {
        this.toggleInSARLayer(this.visibleLayers[layerName])
      } else if (layerName === 'numerical') {
        this.toggleNumericalLayer(this.visibleLayers[layerName])
      } else if (layerName === 'mileage') {
        this.toggleMileageLayer(this.visibleLayers[layerName])
      } else {
        if (this.visibleLayers[layerName]) {
          this.map.addLayer(this.layers[layerName])
        } else {
          this.map.removeLayer(this.layers[layerName])
        }
      }
    },
    
    toggleOrthophotoLayer(show) {
      if (show) {
        this.map.addLayer(this.layers.orthophoto)
        // 自動縮放到正射影像範圍
        if (this.orthophotoData) {
          this.map.fitBounds(this.orthophotoData.bounds, { padding: [20, 20] })
        }
      } else {
        this.map.removeLayer(this.layers.orthophoto)
      }
    },
    
    toggleShapefileLayer(show) {
      if (show) {
        this.map.addLayer(this.layers.shapefile)
        // 自動縮放到 shapefile 的實際範圍
        if (this.shapefileData && this.shapefileData.bounds) {
          this.map.fitBounds(this.shapefileData.bounds, { padding: [20, 20] })
        } else if (this.selectedProject) {
          // 如果shapefile資料尚未載入，先縮放到專案中心
          this.map.setView([this.selectedProject.location.lat, this.selectedProject.location.lng], 16)
        }
      } else {
        this.map.removeLayer(this.layers.shapefile)
      }
    },
    
    toggleWeatherLayer(show) {
      if (show) {
        // 添加天气图层（这里使用示例图层）
        const weatherLayer = L.tileLayer('https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY', {
          attribution: '© OpenWeatherMap',
          opacity: 0.5
        })
        
        this.layers.weather.addLayer(weatherLayer)
        this.map.addLayer(this.layers.weather)
        this.visibleLayers.weather = true
      } else {
        this.map.removeLayer(this.layers.weather)
        this.visibleLayers.weather = false
      }
    },
    
    initOrthophotoLayer() {
      // 檢查是否有正射影像資料
      if (!this.hasOrthophotoData) return
      
      // 正射影像資訊 - 關聯到台7線49.8K專案
      const orthophotoData = {
        name: '台7線49.8K正射影像',
        center: [24.67527860016387, 121.40511190135854], // 用戶創建的專案座標
        bounds: [
          [24.668457, 121.401275], // 西南角
          [24.679611, 121.411297]  // 東北角
        ],
        imageUrl: '/images/orthophoto/taiwan7_orthophoto.png', // 轉換後的PNG影像
        captureDate: '2024-11-07',
        resolution: '0.1m/pixel',
        projectName: '台7線49.8K'
      }
      
      // 建立實際的正射影像覆蓋層
      const imageOverlay = L.imageOverlay(orthophotoData.imageUrl, orthophotoData.bounds, {
        opacity: 0.8,
        interactive: true
      })
      
      // 添加彈出視窗
      const popupContent = `
        <div class="orthophoto-popup">
          <h4 class="popup-title">${orthophotoData.name}</h4>
          <div class="popup-info">
            <p><strong>專案:</strong> ${orthophotoData.projectName}</p>
            <p><strong>拍攝日期:</strong> ${orthophotoData.captureDate}</p>
            <p><strong>解析度:</strong> ${orthophotoData.resolution}</p>
            <p><strong>專案座標:</strong> ${orthophotoData.center[0].toFixed(6)}, ${orthophotoData.center[1].toFixed(6)}</p>
            <p><strong>影像範圍:</strong> ${((orthophotoData.bounds[1][0] - orthophotoData.bounds[0][0]) * 111000).toFixed(0)}m × ${((orthophotoData.bounds[1][1] - orthophotoData.bounds[0][1]) * 111000).toFixed(0)}m</p>
          </div>
          <button onclick="this.closest('.leaflet-popup').querySelector('.leaflet-popup-close-button').click(); document.dispatchEvent(new CustomEvent('focus-orthophoto', { detail: ${JSON.stringify(orthophotoData)} }));" class="focus-btn">
            定位到此影像
          </button>
        </div>
      `
      
      imageOverlay.bindPopup(popupContent)
      
      // 添加到圖層組（只加入影像覆蓋層，不加入標記）
      this.layers.orthophoto.addLayer(imageOverlay)
      
      // 監聽定位事件
      document.addEventListener('focus-orthophoto', (e) => {
        const data = e.detail
        this.map.fitBounds(data.bounds, { padding: [20, 20] })
      })
      
      // 儲存正射影像資料供其他方法使用
      this.orthophotoData = orthophotoData
    },
    
    async initShapefileLayer() {
      // 檢查是否有 shapefile 資料
      if (!this.hasShapefileData) return
      
      // 台7線49.8K專案的真實 shapefile 資料
      if (this.selectedProject && this.selectedProject.id === 4) {
        try {
          // 載入真實的 GeoJSON 資料
          const response = await fetch('/data/geojson/DamanProfiles.geojson')
          if (!response.ok) throw new Error('Failed to load shapefile data')
          
          const geojsonData = await response.json()
          
          // 使用 Leaflet 的 GeoJSON 圖層
          const shapefileLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
              return {
                color: '#FF6B35',
                weight: 4,
                opacity: 0.9,
                dashArray: '5, 5' // 虛線樣式以區分不同線條
              }
            },
            onEachFeature: function(feature, layer) {
              // 為每個要素添加彈出視窗，只顯示照片
              const popupContent = `
                <div class="shapefile-popup">
                  <img src="${feature.properties.PhotoPath}" 
                       alt="Profile ${feature.properties.ProfileId}" 
                       style="width: 100%; min-width: 400px; max-width: 600px; height: auto; border-radius: 8px; display: block;"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                  <div style="display: none; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; color: #6b7280;">
                    📷
                  </div>
                </div>
              `
              layer.bindPopup(popupContent, {
                maxWidth: 650,
                className: 'daman-profile-popup'
              })
              
              // 滑鼠懸停效果
              layer.on('mouseover', function(e) {
                this.setStyle({
                  weight: 6,
                  color: '#FF4500',
                  opacity: 1
                })
              })
              
              layer.on('mouseout', function(e) {
                this.setStyle({
                  weight: 4,
                  color: '#FF6B35',
                  opacity: 0.9
                })
              })
            }
          })
          
          // 添加到圖層組
          this.layers.shapefile.addLayer(shapefileLayer)
          
          // 儲存圖層資訊供其他方法使用
          this.shapefileData = {
            layer: shapefileLayer,
            bounds: shapefileLayer.getBounds(),
            featureCount: geojsonData.features.length
          }
          
          
        } catch (error) {
          console.error('載入 shapefile 資料失敗:', error)
          
          // 如果載入失敗，顯示錯誤訊息
          const errorMarker = L.marker([this.selectedProject.location.lat, this.selectedProject.location.lng])
            .bindPopup(`
              <div class="error-popup">
                <h4 style="color: red;">Shapefile 載入失敗</h4>
                <p>無法載入 DamanProfiles.geojson</p>
                <p>錯誤: ${error.message}</p>
              </div>
            `)
          
          this.layers.shapefile.addLayer(errorMarker)
        }
      }
    },
    
    focusOnMarker(project) {
      if (project.location) {
        this.map.setView([project.location.lat, project.location.lng], 12)
        this.selectedMarker = project
      }
    },
    
    closeInfoPanel() {
      this.selectedMarker = null
    },
    
    getMarkerTitle(marker) {
      if (marker.eventName) {
        // 專案資料
        return marker.eventName
      } else if (marker.area) {
        // 预警信息
        return marker.area
      } else {
        return '未知項目'
      }
    },
    
    getMarkerDescription(marker) {
      if (marker.eventName) {
        // 專案資料
        return `專案建立時間: ${this.formatDateTime(marker.createdAt)}`
      } else if (marker.description) {
        // 预警信息
        return marker.description
      } else {
        return '無詳細描述'
      }
    },
    
    formatDateTime(date) {
      return dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    
    reinitDataLayers() {
      // 清除現有的資料圖層
      if (this.layers.orthophoto) {
        this.layers.orthophoto.clearLayers()
      }
      if (this.layers.shapefile) {
        this.layers.shapefile.clearLayers()
      }
      if (this.layers.insar) {
        this.layers.insar.clearLayers()
      }
      if (this.layers.numerical) {
        this.layers.numerical.clearLayers()
      }
      
      // 重新初始化資料圖層
      this.initOrthophotoLayer()
      this.initShapefileLayer()
      this.initInSARLayer()
      this.initNumericalLayer()
    },
    
    // 公共方法：跳轉到正射影像區域
    focusOnOrthophoto() {
      if (this.orthophotoData) {
        // 啟用正射影像圖層
        if (!this.visibleLayers.orthophoto) {
          this.toggleOrthophotoLayer(true)
          this.visibleLayers.orthophoto = true
        }
        // 縮放到正射影像範圍
        this.map.fitBounds(this.orthophotoData.bounds, { padding: [20, 20] })
      }
    },
    
    // 公共方法：移動到指定位置
    moveToLocation(location, zoom = 12) {
      if (this.map && location) {
        this.map.setView([location.lat, location.lng], zoom)
      }
    },
    
    // UTM转经纬度函数 (台湾使用 UTM Zone 51N)
    utmToLatLng(easting, northing, zone = 51) {
      const k0 = 0.9996;
      const a = 6378137.0; // WGS84 长半轴
      const e = 0.08181919084262; // WGS84 偏心率
      const e1sq = e * e / (1 - e * e);
      const n = (a - 6356752.314245179) / (a + 6356752.314245179);
      
      const x = easting - 500000;
      const y = northing;
      
      const M = y / k0;
      const mu = M / (a * (1 - Math.pow(n, 2) / 4 - 3 * Math.pow(n, 4) / 64 - 5 * Math.pow(n, 6) / 256));
      
      const phi1rad = mu + (3 * n / 2 - 27 * Math.pow(n, 3) / 32) * Math.sin(2 * mu) + 
                     (21 * Math.pow(n, 2) / 16 - 55 * Math.pow(n, 4) / 32) * Math.sin(4 * mu) + 
                     (151 * Math.pow(n, 3) / 96) * Math.sin(6 * mu);
      
      const phi1 = phi1rad * 180 / Math.PI;
      const N1 = a / Math.sqrt(1 - Math.pow(e * Math.sin(phi1rad), 2));
      const T1 = Math.pow(Math.tan(phi1rad), 2);
      const C1 = e1sq * Math.pow(Math.cos(phi1rad), 2);
      const R1 = a * (1 - e * e) / Math.pow(1 - Math.pow(e * Math.sin(phi1rad), 2), 1.5);
      const D = x / (N1 * k0);
      
      const lat = phi1rad - (N1 * Math.tan(phi1rad) / R1) * (Math.pow(D, 2) / 2 - (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e1sq - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720);
      
      const lng = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180 + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e1sq + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120) / Math.cos(phi1rad);
      
      return {
        lat: lat * 180 / Math.PI,
        lng: lng * 180 / Math.PI
      };
    },
    
    async initInSARLayer() {
      if (!this.hasInSARData) return
      
      try {
        // 加载CSV数据
        const response = await fetch(this.insarDataUrl)
        if (!response.ok) throw new Error('Failed to load InSAR data')
        
        const csvText = await response.text()
        const lines = csvText.trim().split('\n')
        const headers = lines[0].split(',')
        
        // 解析数据
        const insarPoints = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',')
          const x = parseFloat(values[2])
          const y = parseFloat(values[3])
          const move = parseFloat(values[1])
          
          // 转换UTM坐标为经纬度
          const latLng = this.utmToLatLng(x, y)
          
          insarPoints.push({
            id: values[0],
            move: move,
            x: x,
            y: y,
            lat: latLng.lat,
            lng: latLng.lng
          })
        }
        
        // 创建InSAR数据点
        insarPoints.forEach(point => {
          const marker = this.createInSARMarker(point)
          this.layers.insar.addLayer(marker)
        })
        
        // 计算边界
        const lats = insarPoints.map(p => p.lat)
        const lngs = insarPoints.map(p => p.lng)
        const bounds = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        ]
        
        this.insarData = {
          points: insarPoints,
          bounds: bounds
        }
        
        
      } catch (error) {
        console.error('载入 InSAR 数据失败:', error)
      }
    },
    
    createInSARMarker(point) {
      // 根据移动量确定颜色
      let color = '#22c55e' // 绿色 (稳定)
      if (point.move < -30) {
        color = '#ef4444' // 红色 (大幅沉降)
      } else if (point.move < -15) {
        color = '#f97316' // 橙色 (中度沉降)
      } else if (point.move < -5) {
        color = '#eab308' // 黄色 (轻度沉降)
      }
      
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      })
      
      // 添加弹出窗口
      marker.bindPopup(`
        <div class="insar-popup">
          <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">InSAR 測點 #${point.id}</h4>
          <p style="margin: 4px 0; font-size: 12px;"><strong>移動量:</strong> ${point.move} mm</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>UTM座標:</strong> ${point.x.toFixed(2)}, ${point.y.toFixed(2)}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>經緯度:</strong> ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</p>
          <p style="margin: 4px 0; font-size: 10px; color: #6b7280;">
            ${point.move < -30 ? '⚠️ 大幅沉降' : 
              point.move < -15 ? '⚠️ 中度沉降' : 
              point.move < -5 ? '⚠️ 轻度沉降' : '✅ 相对稳定'}
          </p>
        </div>
      `)
      
      return marker
    },
    
    toggleInSARLayer(show) {
      if (show) {
        this.map.addLayer(this.layers.insar)
        // 自动缩放到InSAR数据范围
        if (this.insarData && this.insarData.bounds) {
          this.map.fitBounds(this.insarData.bounds, { padding: [50, 50] })
        }
      } else {
        this.map.removeLayer(this.layers.insar)
      }
    },
    
    // 公共方法：跳转到InSAR数据区域
    focusOnInSAR() {
      if (this.insarData) {
        // 启用InSAR图层
        if (!this.visibleLayers.insar) {
          this.toggleInSARLayer(true)
          this.visibleLayers.insar = true
        }
        // 缩放到InSAR数据范围
        this.map.fitBounds(this.insarData.bounds, { padding: [50, 50] })
      }
    },
    
    // 初始化里程樁號圖層
    async initMileageLayer() {
      if (!this.hasMileageData) return
      
      try {
        // 載入里程樁號CSV數據
        const response = await fetch(this.mileageDataUrl)
        if (!response.ok) throw new Error('Failed to load mileage data')
        
        const csvText = await response.text()
        const lines = csvText.split('\n')
        const headers = lines[0].split(',')
        
        // 解析CSV數據
        const mileagePoints = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          const values = line.split(',')
          if (values.length < 4) continue
          
          const point = {
            mileage: values[0].trim(), // 里程數
            roadCode: values[1].trim(), // 公路編
            lng: parseFloat(values[2].trim()), // 經度
            lat: parseFloat(values[3].trim()), // 緯度
            e: parseFloat(values[4]?.trim() || 0), // E座標
            n: parseFloat(values[5]?.trim() || 0), // N座標
            workStation: values[6]?.trim() || '', // 工程處
            maintenanceSection: values[7]?.trim() || '', // 工務段
            date: values[8]?.trim() || '', // 日期
            county: values[9]?.trim() || '', // 縣市別
            township: values[10]?.trim() || '', // 鄉鎮區
            village: values[11]?.trim() || '', // 村里
            remarks: values[12]?.trim() || '' // 備註
          }
          
          // 檢查座標是否有效
          if (!isNaN(point.lat) && !isNaN(point.lng) && point.lat && point.lng) {
            mileagePoints.push(point)
          }
        }
        
        // 清除現有圖層
        this.layers.mileage.clearLayers()
        
        // 添加里程樁號標記
        mileagePoints.forEach(point => {
          const marker = this.createMileageMarker(point)
          this.layers.mileage.addLayer(marker)
        })
        
        // 儲存數據
        this.mileageData = {
          points: mileagePoints,
          bounds: this.calculateBounds(mileagePoints)
        }
        
        
      } catch (error) {
        console.error('載入里程樁號數據失敗:', error)
      }
    },
    
    // 創建里程樁號標記
    createMileageMarker(point) {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 4,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      })
      
      // 添加彈出窗口
      marker.bindPopup(`
        <div class="mileage-popup">
          <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">里程樁號 ${point.mileage}</h4>
          <p style="margin: 4px 0; font-size: 12px;"><strong>公路編號:</strong> ${point.roadCode}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>位置:</strong> ${point.county} ${point.township} ${point.village}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>工務段:</strong> ${point.maintenanceSection}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>經緯度:</strong> ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</p>
          ${point.remarks ? `<p style="margin: 4px 0; font-size: 11px; color: #6b7280;"><strong>備註:</strong> ${point.remarks}</p>` : ''}
        </div>
      `)
      
      return marker
    },
    
    // 切換里程樁號圖層
    toggleMileageLayer(show) {
      if (show) {
        this.map.addLayer(this.layers.mileage)
        // 自動縮放到里程樁號範圍
        if (this.mileageData && this.mileageData.bounds) {
          this.map.fitBounds(this.mileageData.bounds, { padding: [20, 20] })
        }
      } else {
        this.map.removeLayer(this.layers.mileage)
      }
    },
    
    // 初始化數值模擬圖層
    async initNumericalLayer() {
      // 檢查是否有數值模擬資料
      if (!this.hasNumericalData) return
      
      // 台7線49.8K專案的數值模擬資料
      if (this.selectedProject && this.selectedProject.id === 4) {
        try {
          // 載入 GeoJSON 資料
          const response = await fetch('/data/geojson/DoDshp_numerical.geojson')
          if (!response.ok) throw new Error('Failed to load numerical simulation data')
          
          const geojsonData = await response.json()
          
          // 使用 Leaflet 的 GeoJSON 圖層
          const numericalLayer = L.geoJSON(geojsonData, {
            style: (feature) => {
              return this.getNumericalStyle(feature)
            },
            onEachFeature: (feature, layer) => {
              // 為每個要素添加彈出視窗
              const popupContent = `
                <div class="numerical-popup">
                  <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">數值模擬結果</h4>
                  <p style="margin: 4px 0; font-size: 12px;"><strong>要素ID:</strong> ${feature.properties.ID}</p>
                  <p style="margin: 4px 0; font-size: 12px;"><strong>高程值:</strong> ${feature.properties.ELEV} m</p>
                  <p style="margin: 4px 0; font-size: 12px;"><strong>分類:</strong> ${this.getElevationCategory(feature.properties.ELEV)}</p>
                  <div style="margin: 8px 0; padding: 4px; background: ${this.getElevationColor(feature.properties.ELEV)}; border-radius: 4px;">
                    <span style="color: white; font-weight: bold;">顏色代碼: ${this.getElevationColorName(feature.properties.ELEV)}</span>
                  </div>
                </div>
              `
              layer.bindPopup(popupContent, {
                maxWidth: 400,
                className: 'numerical-popup'
              })
              
              // 滑鼠懸停效果
              layer.on('mouseover', function(e) {
                this.setStyle({
                  weight: 8,
                  opacity: 1
                })
              })
              
              layer.on('mouseout', function(e) {
                this.setStyle({
                  weight: 4,
                  opacity: 0.8
                })
              })
            }
          })
          
          // 添加到圖層組
          this.layers.numerical.addLayer(numericalLayer)
          
          // 儲存圖層資訊供其他方法使用
          this.numericalData = {
            layer: numericalLayer,
            bounds: numericalLayer.getBounds(),
            featureCount: geojsonData.features.length
          }
          
          
        } catch (error) {
          console.error('載入數值模擬資料失敗:', error)
        }
      }
    },
    
    // 根據ELEV值獲取樣式
    getNumericalStyle(feature) {
      const elev = feature.properties.ELEV
      return {
        color: this.getElevationColor(elev),
        weight: 4,
        opacity: 0.8,
        fillOpacity: 0.6
      }
    },
    
    // 根據ELEV值獲取顏色
    getElevationColor(elev) {
      if (elev <= -30) return '#0066cc'      // 藍色
      if (elev <= -15) return '#66b3ff'      // 淺藍
      if (elev <= 0) return '#ffffff'        // 白色
      if (elev <= 15) return '#ffcccc'       // 淺紅
      if (elev <= 30) return '#cc0000'       // 深紅
      return '#990000'                       // 更深的紅色 (超過30)
    },
    
    // 根據ELEV值獲取顏色名稱
    getElevationColorName(elev) {
      if (elev <= -30) return '藍色'
      if (elev <= -15) return '淺藍'
      if (elev <= 0) return '白色'
      if (elev <= 15) return '淺紅'
      if (elev <= 30) return '深紅'
      return '極深紅'
    },
    
    // 根據ELEV值獲取分類
    getElevationCategory(elev) {
      if (elev <= -30) return '大幅負值'
      if (elev <= -15) return '中等負值'
      if (elev <= 0) return '零值/微負值'
      if (elev <= 15) return '中等正值'
      if (elev <= 30) return '大幅正值'
      return '極大正值'
    },
    
    // 切換數值模擬圖層
    toggleNumericalLayer(show) {
      if (show) {
        this.map.addLayer(this.layers.numerical)
        // 自動縮放到數值模擬範圍
        if (this.numericalData && this.numericalData.bounds) {
          this.map.fitBounds(this.numericalData.bounds, { padding: [20, 20] })
        }
      } else {
        this.map.removeLayer(this.layers.numerical)
      }
    },
    
    // 計算邊界
    calculateBounds(points) {
      if (!points || points.length === 0) return null
      
      let minLat = points[0].lat
      let maxLat = points[0].lat
      let minLng = points[0].lng
      let maxLng = points[0].lng
      
      points.forEach(point => {
        minLat = Math.min(minLat, point.lat)
        maxLat = Math.max(maxLat, point.lat)
        minLng = Math.min(minLng, point.lng)
        maxLng = Math.max(maxLng, point.lng)
      })
      
      return [[minLat, minLng], [maxLat, maxLng]]
    },
    
    // 從父組件接收圖層控制命令
    toggleLayerFromParent(dataType, show) {
      // 更新圖層可見性狀態
      this.visibleLayers[dataType] = show
      
      // 根據資料類型控制對應圖層
      if (dataType === 'orthophoto') {
        this.toggleOrthophotoLayer(show)
      } else if (dataType === 'shapefile') {
        this.toggleShapefileLayer(show)
      } else if (dataType === 'numerical_simulation') {
        this.toggleNumericalLayer(show)
      }
    }
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
  height: 100%;
}

.map-element {
  width: 100%;
  z-index: 1;
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-btn {
  padding: 8px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.control-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.info-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 400px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
}

.info-content {
  padding: 16px;
}

.info-description {
  color: #4b5563;
  font-size: 14px;
  margin: 0 0 12px 0;
}

.info-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
}

.info-time {
  font-weight: 500;
}

.info-location {
  font-family: monospace;
}

/* 自定义标记样式 */
:deep(.custom-marker) {
  background: transparent;
  border: none;
}

:deep(.project-marker) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

:deep(.marker-icon) {
  font-size: 16px;
}



:deep(.orthophoto-popup) {
  min-width: 250px;
}

:deep(.popup-title) {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #FF6B35;
}

:deep(.popup-info) {
  margin: 8px 0;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.popup-info p) {
  margin: 4px 0;
  color: #4b5563;
}

:deep(.focus-btn) {
  background: #FF6B35;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s;
}

:deep(.focus-btn:hover) {
  background: #FF4500;
}

@media (max-width: 640px) {
  .map-controls {
    top: 5px;
    right: 5px;
  }
  
  .control-group {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .control-btn {
    font-size: 10px;
    padding: 6px 8px;
  }
  
  .info-panel {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }
}
</style> 