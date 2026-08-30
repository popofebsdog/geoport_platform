import L from 'leaflet'

const iconButtonStyle = (isDarkMode) => `
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  border-width: 1px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  cursor: pointer;
  padding: 0;
  background-color: ${isDarkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'};
  border-color: ${isDarkMode ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'};
  color: ${isDarkMode ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'};
`

const locationIcon = `
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
  </svg>
`

const labelOnIcon = `
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
  </svg>
`

const labelOffIcon = `
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
  </svg>
`

const setupPressFeedback = (button) => {
  button.addEventListener('mousedown', () => {
    button.style.transform = 'scale(0.95)'
  })
  button.addEventListener('mouseup', () => {
    button.style.transform = 'scale(1)'
  })
}

export const createHighwayMileageControl = ({ isDarkMode, isVisible, onToggle, log }) => {
  const HighwayMileageControl = L.Control.extend({
    onAdd(map) {
      const container = L.DomUtil.create('div', 'highway-mileage-control')
      container.style.marginTop = '10px'

      const button = L.DomUtil.create('button', 'icon-button', container)
      button.type = 'button'
      button.style.cssText = iconButtonStyle(isDarkMode())

      const updateButtonStyle = () => {
        const visible = isVisible()
        button.title = visible ? '隱藏省道里程樁號' : '顯示省道里程樁號'
        button.innerHTML = locationIcon

        if (visible) {
          button.style.backgroundColor = isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
          button.style.borderColor = isDarkMode() ? 'rgb(100, 116, 139)' : 'rgb(209, 213, 219)'
          button.style.color = isDarkMode() ? 'rgb(255, 255, 255)' : 'rgb(31, 41, 55)'
        } else {
          button.style.backgroundColor = isDarkMode() ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
          button.style.borderColor = isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'
          button.style.color = isDarkMode() ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
        }
      }

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = isVisible()
          ? (isDarkMode() ? 'rgb(100, 116, 139)' : 'rgb(229, 231, 235)')
          : (isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)')
      })
      button.addEventListener('mouseleave', updateButtonStyle)
      setupPressFeedback(button)
      updateButtonStyle()

      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        log?.log('[ProjectMap] 省道里程樁號按鈕被點擊')
        onToggle()
      })

      map.on('highway-mileage-visibility-changed', updateButtonStyle)
      this.updateButtonStyle = updateButtonStyle
      L.DomEvent.disableClickPropagation(container)
      return container
    }
  })

  return new HighwayMileageControl({ position: 'topright' })
}

export const createWarningLightControl = ({ isDarkMode, onOpen }) => {
  const WarningLightControl = L.Control.extend({
    onAdd() {
      const container = L.DomUtil.create('div', 'warning-light-control')
      container.style.marginTop = '10px'

      const button = L.DomUtil.create('button', 'icon-button', container)
      button.type = 'button'
      button.title = '選擇里程點設置'
      button.style.cssText = iconButtonStyle(isDarkMode())
      button.innerHTML = locationIcon

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)'
        button.style.transform = 'scale(1.05)'
      })
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = isDarkMode() ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
        button.style.transform = 'scale(1)'
      })
      setupPressFeedback(button)

      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        onOpen()
      })

      L.DomEvent.disableClickPropagation(container)
      return container
    }
  })

  return new WarningLightControl({ position: 'topright' })
}

export const createMileageLabelControl = ({ isDarkMode, isVisible, onToggle }) => {
  const MileageLabelControl = L.Control.extend({
    onAdd(map) {
      const container = L.DomUtil.create('div', 'mileage-label-control')
      container.style.marginTop = '10px'

      const button = L.DomUtil.create('button', 'icon-button', container)
      button.type = 'button'
      button.style.cssText = iconButtonStyle(isDarkMode())

      const updateButtonStyle = () => {
        const visible = isVisible()
        button.title = `里程數字：${visible ? '開啟' : '關閉'}`
        button.innerHTML = visible ? labelOnIcon : labelOffIcon

        if (visible) {
          button.style.backgroundColor = 'rgb(37, 99, 235)'
          button.style.borderColor = 'rgb(59, 130, 246)'
          button.style.color = 'rgb(255, 255, 255)'
        } else {
          button.style.backgroundColor = isDarkMode() ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)'
          button.style.borderColor = isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(229, 231, 235)'
          button.style.color = isDarkMode() ? 'rgb(209, 213, 219)' : 'rgb(75, 85, 99)'
        }
      }

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = isVisible()
          ? (isDarkMode() ? 'rgb(59, 130, 246)' : 'rgb(29, 78, 216)')
          : (isDarkMode() ? 'rgb(71, 85, 105)' : 'rgb(249, 250, 251)')
        button.style.transform = 'scale(1.05)'
      })
      button.addEventListener('mouseleave', () => {
        updateButtonStyle()
        button.style.transform = 'scale(1)'
      })
      setupPressFeedback(button)
      updateButtonStyle()

      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        onToggle()
      })

      map.on('mileage-label-visibility-changed', updateButtonStyle)
      this.updateButtonStyle = updateButtonStyle
      L.DomEvent.disableClickPropagation(container)
      return container
    }
  })

  return new MileageLabelControl({ position: 'topright' })
}

export const createZoomLevelControl = ({ isDarkMode }) => {
  const ZoomLevelControl = L.Control.extend({
    onAdd(map) {
      const container = L.DomUtil.create('div', 'leaflet-control-zoom-level')
      container.style.background = isDarkMode() ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'
      container.style.border = '1px solid rgba(0,0,0,0.2)'
      container.style.borderRadius = '4px'
      container.style.padding = '8px 12px'
      container.style.minWidth = '220px'
      container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)'
      container.style.userSelect = 'none'

      const label = L.DomUtil.create('div', 'zoom-level-label', container)
      label.style.fontSize = '11px'
      label.style.fontWeight = 'bold'
      label.style.color = isDarkMode() ? '#e2e8f0' : '#333'
      label.style.marginBottom = '6px'
      label.style.textAlign = 'center'

      const sliderContainer = L.DomUtil.create('div', 'zoom-slider-container', container)
      sliderContainer.style.display = 'flex'
      sliderContainer.style.alignItems = 'center'
      sliderContainer.style.gap = '8px'

      const minusBtn = createZoomButton('−', sliderContainer, isDarkMode)
      const sliderWrapper = L.DomUtil.create('div', 'zoom-slider-wrapper', sliderContainer)
      sliderWrapper.style.flex = '1'
      sliderWrapper.style.position = 'relative'
      sliderWrapper.style.display = 'flex'
      sliderWrapper.style.alignItems = 'center'

      const slider = L.DomUtil.create('input', 'zoom-level-slider', sliderWrapper)
      slider.type = 'range'
      slider.min = '1'
      slider.max = '20'
      slider.value = map.getZoom()
      slider.style.cssText = 'width:100%;height:6px;border-radius:3px;outline:none;cursor:pointer;background:transparent;margin:0;padding:0;'
      slider.style.webkitAppearance = 'none'
      slider.style.appearance = 'none'
      ensureZoomSliderStyle(isDarkMode())

      const plusBtn = createZoomButton('+', sliderContainer, isDarkMode)
      const updateLabel = (zoom) => {
        label.textContent = `縮放: ${zoom}`
      }
      const updateZoom = (delta) => {
        const newZoom = Math.max(1, Math.min(20, Math.round(map.getZoom() + delta)))
        map.setZoom(newZoom)
        slider.value = newZoom
        updateLabel(newZoom)
      }

      L.DomEvent.on(minusBtn, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        updateZoom(-1)
      })
      L.DomEvent.on(plusBtn, 'click', (e) => {
        L.DomEvent.stopPropagation(e)
        L.DomEvent.preventDefault(e)
        updateZoom(1)
      })
      L.DomEvent.on(slider, 'input', (e) => {
        const zoom = parseInt(e.target.value)
        updateLabel(zoom)
        map.setZoom(zoom)
      })
      map.on('zoomend', () => {
        const clampedZoom = Math.max(1, Math.min(20, Math.round(map.getZoom())))
        if (slider.value != clampedZoom) {
          slider.value = clampedZoom
          updateLabel(clampedZoom)
        }
      })

      L.DomEvent.disableClickPropagation(container)
      L.DomEvent.disableScrollPropagation(container)
      updateLabel(map.getZoom())
      return container
    }
  })

  return new ZoomLevelControl({ position: 'bottomright' })
}

const createZoomButton = (text, parent, isDarkMode) => {
  const button = L.DomUtil.create('button', '', parent)
  button.textContent = text
  button.style.width = '28px'
  button.style.height = '28px'
  button.style.borderRadius = '4px'
  button.style.border = '1px solid rgba(0,0,0,0.2)'
  button.style.background = isDarkMode() ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
  button.style.color = isDarkMode() ? '#e2e8f0' : '#333'
  button.style.fontSize = text === '+' ? '18px' : '18px'
  button.style.fontWeight = 'bold'
  button.style.cursor = 'pointer'
  button.style.display = 'flex'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.outline = 'none'
  button.style.transition = 'all 0.2s'
  button.addEventListener('mouseenter', () => {
    button.style.background = isDarkMode() ? 'rgba(100, 116, 139, 0.8)' : 'rgba(209, 213, 219, 0.8)'
  })
  button.addEventListener('mouseleave', () => {
    button.style.background = isDarkMode() ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 0.8)'
  })
  return button
}

const ensureZoomSliderStyle = (isDarkMode) => {
  if (document.getElementById('project-map-zoom-slider-style')) return

  const style = document.createElement('style')
  style.id = 'project-map-zoom-slider-style'
  style.textContent = `
    .zoom-level-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 8px;
      height: 18px;
      border-radius: 2px;
      background: ${isDarkMode ? '#3b82f6' : '#2563eb'};
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      margin-top: -6px;
    }
    .zoom-level-slider::-moz-range-thumb {
      width: 8px;
      height: 18px;
      border-radius: 2px;
      background: ${isDarkMode ? '#3b82f6' : '#2563eb'};
      cursor: pointer;
      border: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .zoom-level-slider::-webkit-slider-runnable-track {
      height: 6px;
      background: ${isDarkMode ? '#475569' : '#e2e8f0'};
      border-radius: 3px;
    }
    .zoom-level-slider::-moz-range-track {
      height: 6px;
      background: ${isDarkMode ? '#475569' : '#e2e8f0'};
      border-radius: 3px;
    }
  `
  document.head.appendChild(style)
}
