<template>
  <div class="insar-layer">
    <!-- 图例 -->
    <div v-if="showLegend && isActive" class="insar-legend" :style="legendStyle">
      <div class="legend-title">ATS-InSAR 地表形變</div>
      <div class="legend-subtitle">velocity: [mm/yr]</div>
      <div class="legend-items">
        <div v-for="(item, index) in legendItems" :key="index" class="legend-item">
          <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
          <span class="legend-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 时间序列图表模态框 -->
    <Teleport to="body">
      <div 
        v-if="showTimeSeriesChart" 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
        @click="closeChart"
      >
        <div 
          class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-11/12 max-w-4xl max-h-[80vh] overflow-auto"
          @click.stop
        >
          <!-- 标题栏 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                InSAR 時間序列分析
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                點位編號: {{ selectedPoint?.CODE }} | 
                速度: {{ selectedPoint?.VEL?.toFixed(2) }} mm/yr |
                坐標: {{ selectedPoint?.LAT?.toFixed(6) }}, {{ selectedPoint?.LON?.toFixed(6) }}
              </p>
            </div>
            <button
              @click="closeChart"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 图表区域 -->
          <div class="p-6">
            <canvas ref="chartCanvas" style="max-height: 400px;"></canvas>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
export default {
  name: 'InSARLayer',
  props: {
    map: {
      type: Object,
      default: null
    },
    isActive: {
      type: Boolean,
      default: false
    },
    dataPath: {
      type: String,
      default: '/data/uploads/inSAR/INSAR.geojson'
    },
    showLegend: {
      type: Boolean,
      default: true
    },
    sidebarExpanded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      insarLayer: null,
      insarData: null,
      showTimeSeriesChart: false,
      selectedPoint: null,
      chart: null,
      legendItems: [
        { label: '-146.5 ~ -39.4', color: '#d73027', range: [-146.5, -39.4] },
        { label: '-39.4 ~ -8.1', color: '#fc8d59', range: [-39.4, -8.1] },
        { label: '-8.1 ~ 0.0', color: '#fee08b', range: [-8.1, 0.0] },
        { label: '0.0 ~ 33.6', color: '#d9ef8b', range: [0.0, 33.6] },
        { label: '33.6 ~ 54.6', color: '#91cf60', range: [33.6, 54.6] },
        { label: '54.6 ~ 81.4', color: '#1a9850', range: [54.6, 81.4] },
        { label: '81.4 ~ 156.8', color: '#006837', range: [81.4, 156.8] }
      ]
    }
  },
  computed: {
    legendStyle() {
      // 根據側邊欄狀態調整位置，避免覆蓋縮放按鈕
      const leftOffset = this.sidebarExpanded ? 'calc(21rem + 60px)' : '70px'
      return {
        position: 'absolute',
        bottom: '30px',
        left: leftOffset,
        zIndex: 1000,
        transition: 'left 0.3s ease'
      }
    }
  },
  watch: {
    isActive: {
      handler(newVal) {
        if (newVal && this.map) {
          this.loadInSARData()
        } else {
          this.removeLayer()
        }
      },
      immediate: true
    },
    map(newVal) {
      if (newVal && this.isActive) {
        this.loadInSARData()
      }
    }
  },
  beforeUnmount() {
    this.removeLayer()
    if (this.chart) {
      this.chart.destroy()
    }
  },
  methods: {
    getColorForVelocity(vel) {
      if (vel === null || vel === undefined) return '#808080'
      
      for (const item of this.legendItems) {
        if (vel >= item.range[0] && vel < item.range[1]) {
          return item.color
        }
      }
      
      // 处理边界情况
      if (vel >= 81.4) return '#006837'
      if (vel < -146.5) return '#d73027'
      
      return '#808080'
    },
    
    async loadInSARData() {
      if (!this.map || this.insarLayer) return
      
      try {
        const response = await fetch(this.dataPath)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        this.insarData = await response.json()
        
        this.renderLayer()
      } catch (error) {
        console.error('[InSAR] 加載 InSAR 數據失敗:', error)
      }
    },
    
    renderLayer() {
      if (!this.map || !this.insarData || this.insarLayer) return
      
      const L = window.L
      if (!L) return
      
      
      // 创建圖層組
      this.insarLayer = L.layerGroup().addTo(this.map)
      
      // 渲染每個點
      this.insarData.features.forEach((feature) => {
        const props = feature.properties
        const lat = props.LAT
        const lon = props.LON
        const vel = props.VEL
        
        if (!lat || !lon) return
        
        const color = this.getColorForVelocity(vel)
        
        // 創建圓形標記
        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor: color,
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 1,
          opacity: 1
        })
        
        // 綁定彈出信息
        const popupContent = `
          <div class="insar-popup">
            <strong>點位編號:</strong> ${props.CODE || 'N/A'}<br>
            <strong>速度:</strong> ${vel?.toFixed(2) || 'N/A'} mm/yr<br>
            <strong>高程:</strong> ${props.HGT?.toFixed(2) || 'N/A'} m<br>
            <strong>相干性:</strong> ${props.COHERENCE?.toFixed(3) || 'N/A'}
          </div>
        `
        marker.bindPopup(popupContent)
        
        // 綁定點擊事件
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          this.showTimeSeries(feature.properties)
        })
        
        // 添加到圖層組
        marker.addTo(this.insarLayer)
      })
      
    },
    
    showTimeSeries(properties) {
      this.selectedPoint = properties
      this.showTimeSeriesChart = true
      
      this.$nextTick(() => {
        this.createChart()
      })
    },
    
    createChart() {
      if (!this.$refs.chartCanvas || !this.selectedPoint) return
      
      // 銷毀現有圖表
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
      
      // 提取時間序列數據
      const timeSeriesData = this.extractTimeSeriesData(this.selectedPoint)
      
      if (timeSeriesData.length === 0) {
        console.warn('[InSAR] 沒有時間序列數據')
        return
      }
      
      // 計算回歸線
      const regressionData = this.calculateRegression(timeSeriesData)
      
      // 創建圖表
      import('chart.js').then(({ Chart, registerables }) => {
        Chart.register(...registerables)
        
        const ctx = this.$refs.chartCanvas.getContext('2d')
        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: timeSeriesData.map(d => d.date),
            datasets: [
              {
                label: '形變量 (mm)',
                data: timeSeriesData.map(d => d.value),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2
              },
              {
                label: '回歸線',
                data: regressionData,
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              title: {
                display: true,
                text: `InSAR 時間序列 - 點位 ${this.selectedPoint.CODE}`,
                font: {
                  size: 16,
                  weight: 'bold'
                }
              },
              legend: {
                display: true,
                position: 'top',
                labels: {
                  filter: function(item, chart) {
                    // 不顯示回歸線的圖例
                    return item.text !== '回歸線'
                  }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (context) => {
                    const label = context.dataset.label || ''
                    const value = context.parsed.y.toFixed(2)
                    if (label === '回歸線') {
                      return `${label}: ${value} mm (趨勢)`
                    }
                    return `${label}: ${value} mm`
                  }
                }
              }
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: '日期'
                },
                ticks: {
                  maxRotation: 45,
                  minRotation: 45
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: '形變量 (mm)'
                }
              }
            }
          }
        })
      })
    },
    
    extractTimeSeriesData(properties) {
      const timeSeriesData = []
      
      // 遍歷所有屬性，找出 D 開頭的日期字段
      for (const key in properties) {
        if (key.startsWith('D') && key.length === 9) {
          // Dyyyymmdd 格式
          const dateStr = key.substring(1) // 去掉 D
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          const formattedDate = `${year}-${month}-${day}`
          
          const value = properties[key]
          if (value !== null && value !== undefined) {
            timeSeriesData.push({
              date: formattedDate,
              value: value,
              timestamp: new Date(formattedDate).getTime()
            })
          }
        }
      }
      
      // 按時間排序
      timeSeriesData.sort((a, b) => a.timestamp - b.timestamp)
      
      return timeSeriesData
    },
    
    // 計算線性回歸
    calculateRegression(timeSeriesData) {
      if (timeSeriesData.length < 2) return []
      
      const n = timeSeriesData.length
      let sumX = 0
      let sumY = 0
      let sumXY = 0
      let sumX2 = 0
      
      // 計算總和
      timeSeriesData.forEach((point, index) => {
        const x = index // 使用索引作為 x 值
        const y = point.value
        sumX += x
        sumY += y
        sumXY += x * y
        sumX2 += x * x
      })
      
      // 計算斜率 (m) 和截距 (b)
      // y = mx + b
      const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
      const b = (sumY - m * sumX) / n
      
      
      // 生成回歸線數據點
      const regressionData = timeSeriesData.map((point, index) => {
        return m * index + b
      })
      
      return regressionData
    },
    
    closeChart() {
      this.showTimeSeriesChart = false
      this.selectedPoint = null
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
    },
    
    removeLayer() {
      if (this.insarLayer && this.map) {
        this.map.removeLayer(this.insarLayer)
        this.insarLayer = null
      }
      this.closeChart()
    }
  }
}
</script>

<style scoped>
.insar-legend {
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 12px;
  max-width: 200px;
}

.legend-title {
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 4px;
  color: #333;
}

.legend-subtitle {
  font-size: 11px;
  color: #666;
  margin-bottom: 8px;
  font-style: italic;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 20px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #ccc;
}

.legend-label {
  font-size: 11px;
  color: #444;
  white-space: nowrap;
}

.insar-popup {
  font-size: 13px;
  line-height: 1.6;
}

.insar-popup strong {
  color: #333;
  font-weight: 600;
}
</style>

