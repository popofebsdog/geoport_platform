<template>
  <div class="geological-map-selector">
    <!-- 地質圖卡片 -->
    <div class="p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg backdrop-blur-sm"
         :class="[
           isDarkMode ? 'bg-slate-700/80 border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500' : 'bg-white/90 border-gray-200/60 hover:bg-white hover:border-gray-300',
           isActive ? (isDarkMode ? 'ring-2 ring-blue-400/60 shadow-blue-400/20' : 'ring-2 ring-blue-500/60 shadow-blue-500/20') : ''
         ]">
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <h4 class="text-sm font-medium transition-colors duration-300 truncate"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              1/50,000 臺灣地質圖-地層
            </h4>
          </div>
          <p class="text-xs mt-1 transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
            包含圖層：地層、地層名稱
          </p>
        </div>
        
        <div class="flex items-center space-x-1 ml-2">
          <!-- 眼睛按鈕（顯示/隱藏） -->
          <button @click="toggleGeologicalMap"
                  class="p-1.5 rounded-lg transition-all duration-300 hover:scale-110"
                  :class="isActive 
                    ? (isDarkMode ? 'text-blue-400 bg-blue-400/10' : 'text-blue-600 bg-blue-50')
                    : (isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50')"
                  :disabled="loading"
                  title="顯示/隱藏地質圖層">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-if="error" class="mt-2 p-2 text-xs rounded-md transition-colors duration-300"
         :class="isDarkMode ? 'bg-red-900/20 border border-red-800 text-red-400' : 'text-red-600 bg-red-50 border border-red-200'">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'GeologicalMapSelector',
  props: {
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-geological-map'],
  setup(props, { emit }) {
    const loading = ref(false)
    const error = ref('')
    const isActive = ref(false)

    // 固定選中的圖層（只開啟地層和地層名稱）
    const selectedLayers = ref({
      strata: true,        // 地層
      strataLabel: true,   // 地層名稱
      strataBoundary: false // 地層界線（不開啟）
    })

    // WMS 服務配置
    const wmsConfigs = {
      strata: {
        url: 'https://geomap.gsmma.gov.tw/mapguide/mapagent/mapagent.fcgi?',
        layer: 'WMS/50K_Geomap_strata',
        title: '1/50,000_臺灣地質圖-地層',
        format: 'image/png',
        version: '1.0.0',
        crs: 'EPSG:4326',
        transparent: true,
        opacity: 0.8
      },
      strataLabel: {
        url: 'https://geomap.gsmma.gov.tw/mapguide/mapagent/mapagent.fcgi?',
        layer: 'WMS/50K_Geomap_lable',
        title: '1/50,000_臺灣地質圖-地層名稱',
        format: 'image/png',
        version: '1.0.0',
        crs: 'EPSG:4326',
        transparent: true,
        opacity: 0.9,
        // 地層名稱只在 13 級以上顯示
        minZoom: 13,
        maxZoom: 16
      },
      strataBoundary: {
        url: 'https://geomap.gsmma.gov.tw/mapguide/mapagent/mapagent.fcgi?',
        layer: 'WMS/50K_Geomap_strata_boundary',
        title: '1/50,000_臺灣地質圖-地層界線',
        format: 'image/png',
        version: '1.0.0',
        crs: 'EPSG:4326',
        transparent: true,
        opacity: 0.9,
        // 地層界線只在 13 級以上顯示
        minZoom: 13,
        maxZoom: 17
      }
    }

    // 切換地質圖層
    const toggleGeologicalMap = async () => {
      loading.value = true
      error.value = ''

      try {
        // 切換狀態
        isActive.value = !isActive.value
        
        // 發送切換事件給父組件
        emit('toggle-geological-map', {
          active: isActive.value,
          configs: wmsConfigs,
          selectedLayers: selectedLayers.value
        })
        
      } catch (err) {
        console.error('地質圖層切換錯誤:', err)
        error.value = '切換地質圖層失敗'
      } finally {
        loading.value = false
      }
    }


    return {
      loading,
      error,
      isActive,
      selectedLayers,
      toggleGeologicalMap,
      wmsConfigs
    }
  }
}
</script>

<style scoped>
.geological-map-selector {
  /* 組件樣式 */
  padding: 0;
}
</style>
