<template>
  <div class="warning-light-marker-container" style="pointer-events: none; position: relative;">
    <div 
      :style="containerStyle"
      @click="handleClick"
      style="cursor: pointer;"
    >
      <!-- 路線資訊 -->
      <h4 :style="routeNameStyle">{{ routeName || '' }}</h4>
      
      <!-- 紅綠燈顯示 -->
      <div :style="lightContainerStyle">
        <div :style="lightBoxStyle">
          <!-- 紅燈 (上) -->
          <div :style="lightItemStyle">
            <div :style="getLightStyle('red')"></div>
          </div>
          
          <!-- 黃燈 (中) -->
          <div :style="lightItemStyle">
            <div :style="getLightStyle('yellow')"></div>
          </div>
          
          <!-- 綠燈 (下) -->
          <div>
            <div :style="getLightStyle('green')"></div>
          </div>
        </div>
      </div>
      
      <!-- 燈號說明文字 -->
      <div :style="levelDescriptionStyle">
        {{ levelDescriptionText }}
      </div>
      
      <!-- 特殊告警倒計時（僅在告警時顯示） -->
      <div v-if="showSpecialAlert" :style="alertCountdownStyle">
        ({{ specialAlertCountdown }}s)
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WarningLightMarker',
  props: {
    routeName: {
      type: String,
      required: true
    },
    currentLevel: {
      type: String,
      default: 'green'
    },
    currentLevelName: {
      type: String,
      default: ''
    },
    isRedLightOn: {
      type: Boolean,
      default: false
    },
    showSpecialAlert: {
      type: Boolean,
      default: false
    },
    specialAlertCountdown: {
      type: Number,
      default: 0
    },
    zoom: {
      type: Number,
      default: 16
    }
  },
  emits: ['click'],
  computed: {
    // 根據縮放層級計算縮放比例（16層級為基準1.0，每增加1層級放大1.2倍）
    // 整體縮小20%（乘以0.8）
    scaleFactor() {
      return Math.pow(1.2, this.zoom - 16) * 0.8
    },
    
    // 基礎尺寸
    baseLightSize() {
      return 12
    },
    
    baseFontSize() {
      return 10
    },
    
    basePadding() {
      return 6
    },
    
    // 根據縮放層級調整尺寸
    lightSize() {
      return Math.round(this.baseLightSize * this.scaleFactor)
    },
    
    fontSize() {
      return Math.max(8, Math.round(this.baseFontSize * this.scaleFactor))
    },
    
    padding() {
      return Math.round(this.basePadding * this.scaleFactor)
    },
    
    containerMinWidth() {
      return Math.round(70 * this.scaleFactor)
    },
    
    containerMaxWidth() {
      return Math.round(90 * this.scaleFactor)
    },
    
    containerStyle() {
      return {
        backgroundColor: 'transparent',
        borderRadius: '0.5rem',
        padding: `${this.padding}px`,
        textAlign: 'center',
        minWidth: `${this.containerMinWidth}px`,
        maxWidth: `${this.containerMaxWidth}px`,
        position: 'relative'
      }
    },
    
    routeNameStyle() {
      return {
        color: '#000',
        fontWeight: '500',
        fontSize: `${this.fontSize}px`,
        lineHeight: '1.2',
        marginBottom: `${Math.round(4 * this.scaleFactor)}px`,
        margin: 0
      }
    },
    
    lightContainerStyle() {
      return {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: `${Math.round(4 * this.scaleFactor)}px`
      }
    },
    
    lightBoxStyle() {
      return {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: '0.5rem',
        padding: `${Math.round(4 * this.scaleFactor)}px`,
        border: `${Math.round(2 * this.scaleFactor)}px solid ${this.showSpecialAlert ? '#ef4444' : '#4b5563'}`,
        boxShadow: this.showSpecialAlert ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
      }
    },
    
    lightItemStyle() {
      return {
        marginBottom: `${Math.round(2 * this.scaleFactor)}px`
      }
    },
    
    alertCountdownStyle() {
      return {
        fontSize: `${Math.max(6, Math.round(7 * this.scaleFactor))}px`,
        color: '#f87171',
        marginTop: `${Math.round(2 * this.scaleFactor)}px`,
        fontWeight: '500',
        textAlign: 'center'
      }
    },
    
    levelDescriptionText() {
      switch(this.currentLevel) {
        case 'green':
          return '低機率發生落石'
        case 'yellow':
          return '中機率發生落石，小心通行'
        case 'red':
          return '高機率發生落石，不建議通行'
        default:
          return ''
      }
    },
    
    levelDescriptionStyle() {
      const fontSize = Math.max(9, Math.round(10 * this.scaleFactor))
      let color = '#000'
      
      switch(this.currentLevel) {
        case 'green':
          color = '#22c55e'
          break
        case 'yellow':
          color = '#facc15'
          break
        case 'red':
          color = '#ef4444'
          break
      }
      
      return {
        fontSize: `${fontSize}px`,
        fontWeight: '500',
        color: color,
        textAlign: 'center',
        lineHeight: '1.2',
        marginTop: `${Math.round(4 * this.scaleFactor)}px`
      }
    }
  },
  methods: {
    getLightStyle(lightType) {
      const baseStyle = {
        width: `${this.lightSize}px`,
        height: `${this.lightSize}px`,
        borderRadius: '50%',
        border: `${Math.round(1 * this.scaleFactor)}px solid`,
        transition: 'all 0.3s'
      }
      
      let isOn = false
      let color = ''
      let borderColor = ''
      let shadow = ''
      
      if (lightType === 'red') {
        // 紅燈在 currentLevel === 'red' 或 isRedLightOn === true 時亮起
        isOn = this.currentLevel === 'red' || this.isRedLightOn
        if (isOn) {
          color = '#ef4444'
          borderColor = '#fca5a5'
          shadow = '0 0 8px rgba(239, 68, 68, 0.5)'
        } else {
          color = 'rgba(31, 41, 55, 0.6)'
          borderColor = '#374151'
        }
      } else if (lightType === 'yellow') {
        isOn = this.currentLevel === 'yellow'
        if (isOn) {
          color = '#facc15'
          borderColor = '#fde047'
          shadow = '0 0 8px rgba(250, 204, 21, 0.5)'
        } else {
          color = 'rgba(31, 41, 55, 0.6)'
          borderColor = '#374151'
        }
      } else if (lightType === 'green') {
        isOn = this.currentLevel === 'green'
        if (isOn) {
          color = '#22c55e'
          borderColor = '#86efac'
          shadow = '0 0 8px rgba(34, 197, 94, 0.5)'
        } else {
          color = 'rgba(31, 41, 55, 0.6)'
          borderColor = '#374151'
        }
      }
      
      return {
        ...baseStyle,
        backgroundColor: color,
        borderColor: borderColor,
        boxShadow: shadow
      }
    },
    
    handleClick(event) {
      event.stopPropagation()
      this.$emit('click', {
        routeName: this.routeName,
        currentLevel: this.currentLevel,
        currentLevelName: this.currentLevelName,
        isRedLightOn: this.isRedLightOn,
        showSpecialAlert: this.showSpecialAlert
      })
    },
    
    getLevelDescriptionHTML(scaleFactor) {
      const fontSize = Math.max(9, Math.round(10 * scaleFactor))
      let text = ''
      let color = '#000'
      
      switch(this.currentLevel) {
        case 'green':
          text = '低機率發生落石'
          color = '#22c55e'
          break
        case 'yellow':
          text = '中機率發生落石，小心通行'
          color = '#facc15'
          break
        case 'red':
          text = '高機率發生落石，不建議通行'
          color = '#ef4444'
          break
        default:
          return ''
      }
      
      if (!text) return ''
      
      return `<div style="font-size: ${fontSize}px; font-weight: 500; color: ${color}; text-align: center; line-height: 1.2; margin-top: ${Math.round(4 * scaleFactor)}px;">${text}</div>`
    }
  },
  
  // 生成HTML字符串的方法（用於Leaflet divIcon）
  generateHTML() {
    const scaleFactor = this.scaleFactor
    const lightSize = this.lightSize
    const fontSize = this.fontSize
    const padding = this.padding
    const containerMinWidth = this.containerMinWidth
    const containerMaxWidth = this.containerMaxWidth
    
    return `
      <div class="warning-light-marker-container" style="pointer-events: none; position: relative;">
        <div style="background-color: transparent; border-radius: 0.5rem; padding: ${padding}px; text-align: center; min-width: ${containerMinWidth}px; max-width: ${containerMaxWidth}px; position: relative; cursor: pointer;" onclick="window.dispatchEvent(new CustomEvent('warning-light-click', {detail: {routeName: '${this.routeName}', currentLevel: '${this.currentLevel}', currentLevelName: '${this.currentLevelName}'}}))">
          <!-- 路線資訊 -->
          <h4 style="color: #000; font-weight: 500; font-size: ${fontSize}px; line-height: 1.2; margin-bottom: ${Math.round(4 * scaleFactor)}px; margin: 0;">${this.routeName || ''}</h4>
          
          <!-- 紅綠燈顯示 -->
          <div style="display: flex; justify-content: center; margin-bottom: ${Math.round(4 * scaleFactor)}px;">
            <div 
              style="background-color: rgba(31, 41, 55, 0.8); border-radius: 0.5rem; padding: ${Math.round(4 * scaleFactor)}px; border: ${Math.round(2 * scaleFactor)}px solid ${this.showSpecialAlert ? '#ef4444' : '#4b5563'}; ${this.showSpecialAlert ? 'box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);' : ''}"
            >
              <!-- 紅燈 (上) -->
              <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
                <div 
                  style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${(this.currentLevel === 'red' || this.isRedLightOn) ? 'background-color: #ef4444; border-color: #fca5a5; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                ></div>
              </div>
              
              <!-- 黃燈 (中) -->
              <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
                <div 
                  style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${this.currentLevel === 'yellow' ? 'background-color: #facc15; border-color: #fde047; box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                ></div>
              </div>
              
              <!-- 綠燈 (下) -->
              <div>
                <div 
                  style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${this.currentLevel === 'green' ? 'background-color: #22c55e; border-color: #86efac; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
                ></div>
              </div>
            </div>
          </div>
          
          <!-- 燈號說明文字 -->
          ${this.getLevelDescriptionHTML(scaleFactor)}
          
          <!-- 特殊告警倒計時（僅在告警時顯示） -->
          ${this.showSpecialAlert ? `<div style="font-size: ${Math.max(6, Math.round(7 * scaleFactor))}px; color: #f87171; margin-top: ${Math.round(2 * scaleFactor)}px; font-weight: 500; text-align: center;">(${this.specialAlertCountdown}s)</div>` : ''}
        </div>
      </div>
    `
  }
}
</script>

<style scoped>
.warning-light-marker-container {
  pointer-events: none;
  position: relative;
}
</style>
