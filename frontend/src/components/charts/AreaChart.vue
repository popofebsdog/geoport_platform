<template>
  <div class="area-chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
export default {
  name: 'AreaChart',
  props: {
    data: {
      type: Object,
      required: true
    },
    options: {
      type: Object,
      default: () => ({})
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      chart: null
    }
  },
  mounted() {
    this.createChart()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  watch: {
    data: {
      handler() {
        this.updateChart()
      },
      deep: true
    },
    options: {
      handler() {
        this.updateChart()
      },
      deep: true
    }
  },
  methods: {
    createChart() {
      const canvas = this.$refs.chartCanvas
      const ctx = canvas.getContext('2d')
      
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      
      this.drawChart(ctx, canvas.width, canvas.height)
    },
    
    drawChart(ctx, width, height) {
      ctx.clearRect(0, 0, width, height)
      
      if (!this.data || !this.data.labels || this.data.labels.length === 0) {
        return
      }
      
      const padding = 40
      const chartWidth = width - 2 * padding
      const chartHeight = height - 2 * padding
      
      // 繪製背景
      ctx.fillStyle = this.isDarkMode ? '#1e293b' : '#ffffff'
      ctx.fillRect(0, 0, width, height)
      
      // 繪製網格
      this.drawGrid(ctx, padding, chartWidth, chartHeight)
      
      // 繪製面積圖
      this.data.datasets.forEach((dataset, datasetIndex) => {
        this.drawArea(ctx, dataset, padding, chartWidth, chartHeight, datasetIndex)
      })
      
      // 繪製軸標籤
      this.drawAxes(ctx, padding, chartWidth, chartHeight)
    },
    
    drawGrid(ctx, padding, chartWidth, chartHeight) {
      ctx.strokeStyle = this.isDarkMode ? '#475569' : '#e5e7eb'
      ctx.lineWidth = 1
      
      // 垂直網格線
      for (let i = 0; i <= 10; i++) {
        const x = padding + (chartWidth * i) / 10
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, padding + chartHeight)
        ctx.stroke()
      }
      
      // 水平網格線
      for (let i = 0; i <= 10; i++) {
        const y = padding + (chartHeight * i) / 10
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(padding + chartWidth, y)
        ctx.stroke()
      }
    },
    
    drawArea(ctx, dataset, padding, chartWidth, chartHeight, datasetIndex) {
      if (!dataset.data || dataset.data.length === 0) return
      
      const validData = dataset.data.filter(value => value !== null && value !== undefined)
      if (validData.length === 0) return
      
      const minValue = Math.min(...validData)
      const maxValue = Math.max(...validData)
      const valueRange = maxValue - minValue || 1
      
      // 繪製面積
      ctx.fillStyle = dataset.backgroundColor || this.getColorForIndex(datasetIndex) + '40'
      ctx.beginPath()
      
      // 開始點（底部）
      const firstX = padding + (chartWidth * 0) / (dataset.data.length - 1)
      const firstY = padding + chartHeight
      ctx.moveTo(firstX, firstY)
      
      // 數據點
      dataset.data.forEach((value, index) => {
        if (value === null || value === undefined) return
        
        const x = padding + (chartWidth * index) / (dataset.data.length - 1)
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        ctx.lineTo(x, y)
      })
      
      // 結束點（底部）
      const lastX = padding + (chartWidth * (dataset.data.length - 1)) / (dataset.data.length - 1)
      const lastY = padding + chartHeight
      ctx.lineTo(lastX, lastY)
      
      // 閉合路徑並填充
      ctx.closePath()
      ctx.fill()
      
      // 繪製邊框線
      ctx.strokeStyle = dataset.borderColor || this.getColorForIndex(datasetIndex)
      ctx.lineWidth = 2
      ctx.beginPath()
      
      dataset.data.forEach((value, index) => {
        if (value === null || value === undefined) return
        
        const x = padding + (chartWidth * index) / (dataset.data.length - 1)
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      
      // 繪製數據點
      ctx.fillStyle = dataset.borderColor || this.getColorForIndex(datasetIndex)
      dataset.data.forEach((value, index) => {
        if (value === null || value === undefined) return
        
        const x = padding + (chartWidth * index) / (dataset.data.length - 1)
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight
        
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    },
    
    drawAxes(ctx, padding, chartWidth, chartHeight) {
      ctx.fillStyle = this.isDarkMode ? '#e2e8f0' : '#374151'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      
      // X 軸標籤
      if (this.data.labels) {
        this.data.labels.forEach((label, index) => {
          if (index % Math.ceil(this.data.labels.length / 10) === 0) {
            const x = padding + (chartWidth * index) / (this.data.labels.length - 1)
            ctx.fillText(label, x, padding + chartHeight + 20)
          }
        })
      }
      
      // Y 軸標籤
      ctx.textAlign = 'right'
      for (let i = 0; i <= 5; i++) {
        const y = padding + chartHeight - (chartHeight * i) / 5
        const value = this.getYAxisValue(i)
        ctx.fillText(value.toString(), padding - 10, y + 4)
      }
    },
    
    getYAxisValue(index) {
      if (!this.data.datasets || this.data.datasets.length === 0) return index
      
      const allValues = this.data.datasets.flatMap(dataset => 
        dataset.data.filter(value => value !== null && value !== undefined)
      )
      
      if (allValues.length === 0) return index
      
      const minValue = Math.min(...allValues)
      const maxValue = Math.max(...allValues)
      const range = maxValue - minValue
      
      return Math.round(minValue + (range * (5 - index)) / 5)
    },
    
    getColorForIndex(index) {
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
      ]
      return colors[index % colors.length]
    },
    
    updateChart() {
      if (this.chart) {
        this.createChart()
      }
    }
  }
}
</script>

<style scoped>
.area-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
