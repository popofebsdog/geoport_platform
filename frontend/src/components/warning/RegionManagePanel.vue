<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center">
    <!-- 背景遮罩 -->
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

    <!-- 面板主體 -->
    <div
      class="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
      :class="isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <div>
          <h2 class="text-base font-semibold">地區資料管理</h2>
          <p class="text-xs mt-0.5" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
            {{ regionName }} · {{ regionCode }}
          </p>
        </div>
        <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b px-5"
           :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
        <button
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="activeTab === tab.key
            ? (isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600')
            : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700')"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 內容區（可捲動） -->
      <div class="flex-1 overflow-y-auto px-5 py-4">

        <!-- ── Tab 1: 監測圖資 ── -->
        <div v-if="activeTab === 'layers'" class="space-y-4">
          <div v-if="loadingLayers" class="text-center py-10 text-sm"
               :class="isDarkMode ? 'text-slate-400' : 'text-gray-400'">
            載入中…
          </div>
          <template v-else>
            <!-- 三個固定分類 -->
            <div
              v-for="cat in layerCategories" :key="cat.key"
              class="rounded-lg border overflow-hidden"
              :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
            >
              <!-- 分類標題列 -->
              <div class="flex items-center justify-between px-4 py-3"
                   :class="isDarkMode ? 'bg-slate-700/60' : 'bg-gray-50'">
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ cat.icon }}</span>
                  <span class="text-sm font-semibold">{{ cat.label }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        :class="layersByType(cat.key).length > 0
                          ? (isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600')
                          : (isDarkMode ? 'bg-slate-600 text-slate-400' : 'bg-gray-200 text-gray-500')">
                    {{ layersByType(cat.key).length }}
                  </span>
                </div>
                <!-- 上傳按鈕 -->
                <button
                  @click="toggleUploadForm(cat.key)"
                  class="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors"
                  :class="expandedUpload === cat.key
                    ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                    : (isDarkMode ? 'border border-slate-600 text-slate-300 hover:bg-slate-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-100')"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  上傳
                </button>
              </div>

              <!-- 圖資列表 -->
              <div class="px-4 py-2">
                <div v-if="layersByType(cat.key).length === 0 && expandedUpload !== cat.key"
                     class="py-3 text-xs text-center"
                     :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">
                  尚未設定任何資料
                </div>
                <div v-else class="space-y-1.5 py-1">
                  <div
                    v-for="layer in layersByType(cat.key)" :key="layer.layer_id"
                    class="flex items-center justify-between px-3 py-2 rounded-lg"
                    :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'"
                  >
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ layer.layer_name }}</p>
                      <p class="text-xs truncate mt-0.5" :class="isDarkMode ? 'text-slate-400' : 'text-gray-400'">
                        {{ layer.storage_path.split('/').pop() }}
                      </p>
                    </div>
                    <button
                      @click="deleteLayer(layer)"
                      class="ml-3 px-2.5 py-1 text-xs rounded-md text-red-500 border border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                    >
                      移除
                    </button>
                  </div>
                </div>

                <!-- 內嵌上傳表單 -->
                <div v-if="expandedUpload === cat.key"
                     class="mt-2 mb-2 rounded-lg border p-3 space-y-2"
                     :class="isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-blue-200 bg-blue-50/50'">
                  <div>
                    <label class="block text-xs mb-1" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">圖資名稱</label>
                    <input v-model="uploadForms[cat.key].layer_name" type="text"
                      :placeholder="`例：${cat.namePlaceholder}`"
                      class="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-800'"
                    />
                  </div>
                  <div>
                    <label class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                           :class="isDarkMode ? 'border-slate-600' : 'border-gray-300'">
                      <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      <span class="text-sm" :class="uploadForms[cat.key].file ? 'text-blue-500' : (isDarkMode ? 'text-slate-400' : 'text-gray-400')">
                        {{ uploadForms[cat.key].file ? uploadForms[cat.key].file.name : '選擇檔案（GeoJSON / GeoTIFF）' }}
                      </span>
                      <input type="file" class="hidden" accept=".geojson,.json,.tif,.tiff,.shp,.zip"
                             @change="e => onFileSelect(e, cat.key)" />
                    </label>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="uploadLayer(cat.key)"
                      :disabled="uploading === cat.key || !uploadForms[cat.key].file || !uploadForms[cat.key].layer_name"
                      class="flex-1 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {{ uploading === cat.key ? '上傳中…' : '確認上傳' }}
                    </button>
                    <button
                      @click="expandedUpload = null"
                      class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                      :class="isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ── Tab 2: API 設定 ── -->
        <div v-if="activeTab === 'api'" class="space-y-4">
          <!-- 類別 Tabs -->
          <div class="flex gap-0 border-b" :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
            <button
              v-for="cat in apiCategories" :key="cat.key"
              @click="selectedApiCategory = cat.key"
              class="px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors"
              :class="selectedApiCategory === cat.key
                ? (isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600')
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700')"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>

          <!-- 當前類別的 ApiRouteConfigurator -->
          <ApiRouteConfigurator
            :model-value="apiConfig[selectedApiCategory]"
            :is-dark-mode="isDarkMode"
            @update:model-value="apiConfig[selectedApiCategory] = $event"
          />

          <button
            @click="saveApiConfig"
            :disabled="savingApi"
            class="w-full py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ savingApi ? '儲存中…' : '儲存 API 設定' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import api from '@/services/api'
import { success as showSuccess, error as showError, alert as showAlert } from '@/utils/simpleAlertService'
import ApiRouteConfigurator from '@/components/common/ApiRouteConfigurator.vue'

export default {
  name: 'RegionManagePanel',
  components: { ApiRouteConfigurator },
  inject: ['isDarkMode'],
  props: {
    regionId:   { type: String, required: true },
    regionCode: { type: String, required: true },
    regionName: { type: String, default: '' }
  },
  emits: ['close', 'layers-updated'],
  data() {
    return {
      activeTab: 'layers',
      tabs: [
        { key: 'layers', label: '監測圖資' },
        { key: 'api',    label: 'API 設定' }
      ],
      layerCategories: [
        { key: 'numerical', label: '數值模擬', icon: '📊', namePlaceholder: '數值模擬資料' },
        { key: 'insar',     label: 'InSAR監測', icon: '🛰️', namePlaceholder: 'ATS-InSAR 地表形變' },
        { key: 'disaster',  label: '災點熱區', icon: '🔥', namePlaceholder: '災害熱點分布' }
      ],
      // layers
      layers: [],
      loadingLayers: false,
      expandedUpload: null,
      uploadForms: {
        numerical: { layer_name: '', file: null },
        insar:     { layer_name: '', file: null },
        disaster:  { layer_name: '', file: null }
      },
      uploading: null, // key of the category being uploaded
      // api config
      selectedApiCategory: 'microseismic',
      apiConfig: {
        microseismic: { baseUrl: '', authType: 'none', authValue: '', updateInterval: 10, routes: [] },
        rainfall:     { baseUrl: '', authType: 'none', authValue: '', updateInterval: 10, routes: [] },
        earthquake:   { baseUrl: '', authType: 'none', authValue: '', updateInterval: 10, routes: [] }
      },
      savingApi: false,
      apiCategories: [
        { key: 'microseismic', label: '微地動', icon: '📡' },
        { key: 'rainfall',     label: '雨量',   icon: '🌧️' },
        { key: 'earthquake',   label: '地震',   icon: '🌍' }
      ]
    }
  },
  mounted() {
    this.fetchLayers()
    this.fetchApiConfig()
  },
  methods: {
    layersByType(type) {
      return this.layers.filter(l => l.layer_type === type)
    },

    toggleUploadForm(catKey) {
      this.expandedUpload = this.expandedUpload === catKey ? null : catKey
    },

    async fetchLayers() {
      this.loadingLayers = true
      try {
        const res = await fetch(`/api/warning-regions/${encodeURIComponent(this.regionCode)}/layers`)
        const json = await res.json()
        this.layers = json.success ? json.data : []
      } catch {
        this.layers = []
      } finally {
        this.loadingLayers = false
      }
    },

    onFileSelect(e, catKey) {
      this.uploadForms[catKey].file = e.target.files[0] || null
    },

    async uploadLayer(catKey) {
      const form = this.uploadForms[catKey]
      if (!form.file || !form.layer_name) return
      this.uploading = catKey
      try {
        const fd = new FormData()
        fd.append('file', form.file)
        fd.append('layer_type', catKey)
        fd.append('layer_name', form.layer_name)
        const res = await api.post(`/warning-regions/${encodeURIComponent(this.regionCode)}/layers`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res?.success) {
          await showSuccess('圖資上傳成功', '完成', this.isDarkMode)
          this.uploadForms[catKey] = { layer_name: '', file: null }
          this.expandedUpload = null
          await this.fetchLayers()
          this.$emit('layers-updated')
        } else {
          throw new Error(res?.message || '上傳失敗')
        }
      } catch (e) {
        await showError(e.message || '上傳失敗', '錯誤', this.isDarkMode)
      } finally {
        this.uploading = null
      }
    },

    async deleteLayer(layer) {
      await showAlert(
        `確定要移除「${layer.layer_name}」嗎？`,
        '確認移除', this.isDarkMode
      )
      try {
        const res = await api.delete(`/warning-regions/layers/${layer.layer_id}`)
        if (res?.success) {
          await showSuccess('已移除圖資', '完成', this.isDarkMode)
          await this.fetchLayers()
          this.$emit('layers-updated')
        } else {
          throw new Error(res?.message || '刪除失敗')
        }
      } catch (e) {
        await showError(e.message || '刪除失敗', '錯誤', this.isDarkMode)
      }
    },

    async fetchApiConfig() {
      try {
        const res = await api.get(`/warning-regions/${encodeURIComponent(this.regionCode)}`)
        const region = res?.data
        if (!region) return
        const cfg = typeof region.api_config === 'string'
          ? JSON.parse(region.api_config)
          : region.api_config
        if (cfg && typeof cfg === 'object') {
          for (const key of ['microseismic', 'rainfall', 'earthquake']) {
            if (cfg[key]) {
              const src = cfg[key]
              this.apiConfig[key] = {
                baseUrl:       src.baseUrl || src.endpoint || '',
                authType:      src.authType || 'none',
                authValue:     src.authValue || '',
                updateInterval: src.updateInterval ?? 10,
                routes:        Array.isArray(src.routes) ? src.routes : [],
              }
            }
          }
        }
      } catch {
        // 保持預設值
      }
    },

    async saveApiConfig() {
      this.savingApi = true
      try {
        const res = await api.put(`/warning-regions/id/${this.regionId}`, {
          regionName: this.regionName,
          apiConfig: this.apiConfig
        })
        // api 攔截器已 unwrap，res = { success, data/message }
        if (res?.success) {
          await showSuccess('API 設定已儲存', '完成', this.isDarkMode)
        } else {
          throw new Error(res.data?.message || '儲存失敗')
        }
      } catch (e) {
        await showError(e.message || '儲存失敗', '錯誤', this.isDarkMode)
      } finally {
        this.savingApi = false
      }
    }
  }
}
</script>
