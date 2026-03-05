// 紅綠燈標記HTML生成工具函數
export function generateWarningLightHTML(lightData, zoom = 16) {
  const { routeName, currentLevel, currentLevelName, isRedLightOn, showSpecialAlert, specialAlertCountdown } = lightData
  
  // 根據縮放層級計算縮放比例（16層級為基準1.0，每增加1層級放大1.2倍）
  // 整體縮小20%（乘以0.8）
  const scaleFactor = Math.pow(1.2, zoom - 16) * 0.8
  
  // 基礎尺寸
  const baseLightSize = 12
  const baseFontSize = 10
  const basePadding = 6
  
  // 根據縮放層級調整尺寸
  const lightSize = Math.round(baseLightSize * scaleFactor)
  const fontSize = Math.max(8, Math.round(baseFontSize * scaleFactor))
  const padding = Math.round(basePadding * scaleFactor)
  const containerMinWidth = Math.round(70 * scaleFactor)
  const containerMaxWidth = Math.round(90 * scaleFactor)
  
  return `
    <div class="warning-light-marker-container" style="pointer-events: none; position: relative;">
      <div style="background-color: transparent; border-radius: 0.5rem; padding: ${padding}px; text-align: center; min-width: ${containerMinWidth}px; max-width: ${containerMaxWidth}px; position: relative; cursor: pointer;">
        <!-- 路線資訊 -->
        <h4 style="color: #000; font-weight: 500; font-size: ${fontSize}px; line-height: 1.2; margin-bottom: ${Math.round(4 * scaleFactor)}px; margin: 0;">${routeName || ''}</h4>
        
        <!-- 紅綠燈顯示 -->
        <div style="display: flex; justify-content: center; margin-bottom: ${Math.round(4 * scaleFactor)}px;">
          <div 
            style="background-color: rgba(31, 41, 55, 0.8); border-radius: 0.5rem; padding: ${Math.round(4 * scaleFactor)}px; border: ${Math.round(2 * scaleFactor)}px solid ${showSpecialAlert ? '#ef4444' : '#4b5563'}; ${showSpecialAlert ? 'box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);' : ''}"
          >
            <!-- 紅燈 (上) -->
            <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
              <div 
                style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${(currentLevel === 'red' || isRedLightOn) ? 'background-color: #ef4444; border-color: #fca5a5; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
              ></div>
            </div>
            
            <!-- 黃燈 (中) -->
            <div style="margin-bottom: ${Math.round(2 * scaleFactor)}px;">
              <div 
                style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${currentLevel === 'yellow' ? 'background-color: #facc15; border-color: #fde047; box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
              ></div>
            </div>
            
            <!-- 綠燈 (下) -->
            <div>
              <div 
                style="width: ${lightSize}px; height: ${lightSize}px; border-radius: 50%; border: ${Math.round(1 * scaleFactor)}px solid; ${currentLevel === 'green' ? 'background-color: #22c55e; border-color: #86efac; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);' : 'background-color: rgba(31, 41, 55, 0.6); border-color: #374151;'}"
              ></div>
            </div>
          </div>
        </div>
        
        <!-- 燈號說明文字 -->
        <div style="margin-top: ${Math.round(4 * scaleFactor)}px;">
          ${getLevelDescription(currentLevel, scaleFactor)}
        </div>
        
        <!-- 特殊告警倒計時（僅在告警時顯示） -->
        ${showSpecialAlert ? `<div style="font-size: ${Math.max(6, Math.round(7 * scaleFactor))}px; color: #f87171; margin-top: ${Math.round(2 * scaleFactor)}px; font-weight: 500; text-align: center;">(${specialAlertCountdown}s)</div>` : ''}
      </div>
    </div>
  `
}

// 獲取燈號說明文字
function getLevelDescription(currentLevel, scaleFactor) {
  const fontSize = Math.max(9, Math.round(10 * scaleFactor))
  let text = ''
  let color = '#000'
  
  switch(currentLevel) {
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
      text = ''
  }
  
  if (!text) return ''
  
  return `<div style="font-size: ${fontSize}px; font-weight: 500; color: ${color}; text-align: center; line-height: 1.2;">${text}</div>`
}

