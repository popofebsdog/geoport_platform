<template>
  <!-- 這是一個功能組件，不渲染任何內容 -->
</template>

<script>
export default {
  name: 'DisasterPointBrowse',
  props: {
    map: {
      type: Object,
      default: null
    },
    markers: {
      type: Array,
      default: () => []
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['show-disaster-point', 'update:current-index'],
  data() {
    return {
      currentIndex: -1,
      isAnimating: false
    }
  },
  watch: {
    isActive(newVal) {
      if (newVal) {
        // 啟動瀏覽模式時，從第一個開始
        this.currentIndex = 0
        this.showCurrentDisasterPoint()
      }
    },
    markers: {
      handler() {
        // 如果標記變化，調整索引
        if (this.isActive && this.markers.length > 0) {
          if (this.currentIndex >= this.markers.length) {
            this.currentIndex = 0
          }
        }
      },
      deep: true
    }
  },
  beforeUnmount() {
    // 清理動畫狀態
    if (this.map) {
      try {
        // 檢查地圖是否仍然有效（沒有被銷毀）
        if (this.map._container && this.map._container.parentNode) {
          this.map.stop()
          this.map.off('zoomend')
        }
      } catch (error) {
        // 地圖可能已經被銷毀，忽略錯誤
        console.warn('清理地圖動畫時發生錯誤（地圖可能已銷毀）:', error)
      }
    }
    this.isAnimating = false
  },
  methods: {
    // 顯示當前災點
    showCurrentDisasterPoint() {
      if (this.currentIndex < 0 || this.currentIndex >= this.markers.length) {
        return
      }
      
      const marker = this.markers[this.currentIndex]
      if (!marker || !marker.disasterPointData) {
        return
      }
      
      // 觸發顯示災點詳情事件
      this.$emit('show-disaster-point', marker.disasterPointData)
      this.$emit('update:current-index', this.currentIndex)
      
      // 聚焦到當前災點並執行縮放動畫
      this.focusAndAnimate(marker)
    },
    
    // 聚焦到災點並執行縮放動畫
    focusAndAnimate(marker) {
      if (!this.map || !marker || !marker.getLatLng) {
        this.isAnimating = false
        return
      }
      
      const latlng = marker.getLatLng()
      
      // 如果正在動畫中，先停止
      if (this.isAnimating) {
        this.map.stop()
        this.isAnimating = false
      }
      
      this.isAnimating = true
      
      // 獲取當前縮放級別
      const currentZoom = this.map.getZoom()
      
      // 如果當前縮放級別已經接近目標，直接開始動畫
      // 第一步：上升到層級16
      const targetZoom1 = 16
      this.map.setView(latlng, targetZoom1, {
        animate: true,
        duration: 0.8
      })
      
      // 監聽第一次縮放完成事件
      const onZoomEnd1 = () => {
        if (!this.map || !this.isAnimating) {
          this.isAnimating = false
          return
        }
        
        // 第二步：下降到層級18
        const targetZoom2 = 18
        this.map.setView(latlng, targetZoom2, {
          animate: true,
          duration: 0.8
        })
        
        // 監聽第二次縮放完成事件
        const onZoomEnd2 = () => {
          this.isAnimating = false
          if (this.map) {
            this.map.off('zoomend', onZoomEnd2)
          }
        }
        
        this.map.once('zoomend', onZoomEnd2)
        this.map.off('zoomend', onZoomEnd1)
      }
      
      this.map.once('zoomend', onZoomEnd1)
    },
    
    // 下一步
    next() {
      if (this.markers.length === 0) return
      
      this.currentIndex = (this.currentIndex + 1) % this.markers.length
      this.showCurrentDisasterPoint()
    },
    
    // 上一步
    previous() {
      if (this.markers.length === 0) return
      
      this.currentIndex = this.currentIndex <= 0 
        ? this.markers.length - 1 
        : this.currentIndex - 1
      this.showCurrentDisasterPoint()
    },
    
  },
}
</script>

