<template>
  <!-- 这是一个功能组件，不渲染任何内容 -->
</template>

<script>
export default {
  name: 'DisasterPointMapFocus',
  props: {
    map: {
      type: Object,
      default: null
    },
    markers: {
      type: Array,
      default: () => []
    },
    shouldFocus: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    shouldFocus(newVal) {
      if (newVal && this.map && this.markers && this.markers.length > 0) {
        this.focusDisasterPointsArea()
      }
    },
    markers: {
      handler(newMarkers) {
        if (this.shouldFocus && this.map && newMarkers && newMarkers.length > 0) {
          // 延迟执行，确保标记已添加到地图
          this.$nextTick(() => {
            this.focusDisasterPointsArea()
          })
        }
      },
      deep: true
    }
  },
  methods: {
    // 聚焦到所有災點區域（保持當前縮放級別）
    focusDisasterPointsArea() {
      if (!this.map || this.markers.length === 0) {
        return
      }
      
      // 計算所有災點的邊界框
      let minLat = Infinity
      let maxLat = -Infinity
      let minLng = Infinity
      let maxLng = -Infinity
      
      this.markers.forEach(marker => {
        if (marker && marker.getLatLng) {
          const latlng = marker.getLatLng()
          minLat = Math.min(minLat, latlng.lat)
          maxLat = Math.max(maxLat, latlng.lat)
          minLng = Math.min(minLng, latlng.lng)
          maxLng = Math.max(maxLng, latlng.lng)
        }
      })
      
      // 如果沒有有效的邊界，直接返回
      if (minLat === Infinity || maxLat === -Infinity || minLng === Infinity || maxLng === -Infinity) {
        return
      }
      
      // 計算中心點
      const centerLat = (minLat + maxLat) / 2
      const centerLng = (minLng + maxLng) / 2
      
      // 獲取當前縮放級別
      const currentZoom = this.map.getZoom()
      
      // 使用當前縮放級別，只調整中心點
      this.map.setView([centerLat, centerLng], currentZoom, {
        animate: true,
        duration: 0.5
      })
    }
  }
}
</script>

