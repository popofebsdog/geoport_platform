<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      @click.self="$emit('close')"
    >
      <div
        class="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        :class="isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 border-b"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <div>
            <h3 class="text-sm font-semibold">{{ categoryMeta.icon }} {{ categoryMeta.label }} API 設定</h3>
            <p class="text-xs mt-0.5" :class="isDarkMode ? 'text-slate-400' : 'text-gray-400'">
              端點網址可修改；路由路徑由設備規格固定
            </p>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-5">

          <!-- Base URL -->
          <div>
            <label class="block text-xs font-semibold mb-1.5"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
              端點網址 (Base URL)
            </label>
            <div class="flex gap-2">
              <input
                v-model="baseUrl"
                type="url"
                :placeholder="categoryMeta.defaultUrl"
                class="flex-1 text-sm px-3 py-2 rounded-lg border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500'
                  : 'bg-white border-gray-300 text-gray-800'"
              />
              <button
                @click="testUrl"
                :disabled="testing || !baseUrl"
                class="px-3 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40"
                :class="isDarkMode
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
              >
                {{ testing ? '測試中…' : '測試' }}
              </button>
            </div>
            <!-- 測試結果 -->
            <div v-if="testStatus" class="mt-1.5 text-xs flex items-center gap-1.5">
              <span v-if="testStatus === 'ok'" class="text-emerald-500">✓ 連線正常</span>
              <span v-else class="text-red-500">✗ {{ testError }}</span>
            </div>
          </div>

          <!-- 固定路由（read-only） -->
          <div>
            <label class="block text-xs font-semibold mb-2"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
              固定路由（設備規格）
            </label>
            <div class="rounded-lg border overflow-hidden"
                 :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
              <div
                v-for="(route, i) in categoryMeta.routes"
                :key="route.path"
                class="flex items-start gap-3 px-3 py-2.5 text-xs"
                :class="[
                  i < categoryMeta.routes.length - 1
                    ? (isDarkMode ? 'border-b border-slate-700' : 'border-b border-gray-100')
                    : '',
                  isDarkMode ? 'bg-slate-700/30' : 'bg-gray-50'
                ]"
              >
                <span
                  class="font-mono text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5 leading-relaxed"
                  style="word-break:break-all"
                >{{ route.path }}</span>
                <div class="flex-1 min-w-0">
                  <p :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">{{ route.label }}</p>
                </div>
                <span
                  class="flex-shrink-0 px-1.5 py-0.5 rounded text-xs"
                  :class="isDarkMode ? 'bg-slate-600 text-slate-400' : 'bg-gray-200 text-gray-500'"
                >{{ route.role }}</span>
              </div>
            </div>
            <p class="text-xs mt-1.5" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">
              路由路徑由設備硬體規格定義，無法修改。
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-end gap-2 px-5 py-3 border-t"
          :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'"
        >
          <button
            @click="$emit('close')"
            class="px-4 py-1.5 text-sm rounded-lg border transition-colors"
            :class="isDarkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
          >
            取消
          </button>
          <button
            @click="save"
            :disabled="saving || !baseUrl"
            class="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            {{ saving ? '儲存中…' : '儲存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import api from '@/services/api'
import { success as showSuccess, error as showError } from '@/utils/simpleAlertService'

const CATEGORY_META = {
  microseismic: {
    label: '微地動',
    icon: '📡',
    defaultUrl: 'http://140.113.21.54',
    routes: [
      { path: '/GeoSlop/a_flag.json',            label: '示警燈號（當前狀態）',   role: '告警'   },
      { path: '/GeoSlop/catalog/YYYYMMDD.csv',   label: '每日觸發事件目錄',       role: '時間序列' },
      { path: '/GeoSlop/YYYY-MM-DD-HH-MN-SS/',   label: '觸發事件資料庫',         role: '事件資料' },
    ],
  },
  rainfall: {
    label: '雨量',
    icon: '🌧️',
    defaultUrl: 'http://140.113.16.140',
    routes: [
      { path: '/rain/YYYY-MM-DD.txt', label: '每日降雨數值記錄', role: '時間序列' },
      { path: '/rain/YYYY-MM-DD.png', label: '每日降雨圖像',     role: '圖像'   },
    ],
  },
  earthquake: {
    label: '強地動',
    icon: '🌍',
    defaultUrl: 'http://140.113.16.140',
    routes: [
      { path: '/pgapgv/YYYYMMDDHHMNSSS.SS/DH3A.cwa.txt', label: '三軸強地動資料', role: '時間序列' },
      { path: '/pgapgv/YYYYMMDDHHMNSSS.SS/tmp.legend',   label: 'PGA / PGV 數值', role: '最新值'  },
    ],
  },
}

export default {
  name: 'ApiUrlConfigPanel',
  props: {
    category:   { type: String, required: true },  // 'microseismic' | 'rainfall' | 'earthquake'
    regionId:   { type: [String, Number], required: true },
    regionCode: { type: String, required: true },
    regionName: { type: String, default: '' },
    isDarkMode: { type: Boolean, default: false },
  },
  emits: ['close', 'saved'],
  data() {
    return {
      baseUrl:    '',
      saving:     false,
      testing:    false,
      testStatus: null,   // null | 'ok' | 'error'
      testError:  '',
      // 完整的 api_config（讀回後原樣保存，只改這個 category 的 baseUrl）
      fullApiConfig: null,
    }
  },
  computed: {
    categoryMeta() {
      return CATEGORY_META[this.category] || {}
    },
  },
  mounted() {
    this.fetchCurrentUrl()
  },
  methods: {
    async fetchCurrentUrl() {
      try {
        const res = await api.get(`/warning-regions/${encodeURIComponent(this.regionCode)}`)
        const region = res?.data
        if (!region) return
        const cfg = typeof region.api_config === 'string'
          ? JSON.parse(region.api_config)
          : (region.api_config || {})
        this.fullApiConfig = cfg
        const cat = cfg[this.category] || {}
        this.baseUrl = cat.baseUrl || cat.endpoint || ''
      } catch {
        // 保持空
      }
    },

    async testUrl() {
      if (!this.baseUrl) return
      this.testing = true
      this.testStatus = null
      try {
        // 用第一條 route 的固定 path 測試連通性（取非動態路徑）
        const firstStatic = this.categoryMeta.routes
          .find(r => !r.path.includes('YYYY') && !r.path.includes('SS'))
          || this.categoryMeta.routes[0]
        const url = this.baseUrl.replace(/\/$/, '') + firstStatic.path
        const res = await fetch('/api/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const json = await res.json()
        if (json.success) {
          this.testStatus = 'ok'
        } else {
          this.testStatus = 'error'
          this.testError = json.error || '連線失敗'
        }
      } catch (e) {
        this.testStatus = 'error'
        this.testError = e.message
      } finally {
        this.testing = false
      }
    },

    async save() {
      this.saving = true
      try {
        // 合併原有 api_config，只更新這個 category 的 baseUrl
        const base = this.fullApiConfig || {}
        const updated = {
          ...base,
          [this.category]: {
            ...(base[this.category] || {}),
            baseUrl:       this.baseUrl,
            endpoint:      this.baseUrl,  // 向後相容
            authType:      base[this.category]?.authType || 'none',
            authValue:     base[this.category]?.authValue || '',
            updateInterval: base[this.category]?.updateInterval ?? 10,
            routes:        this.categoryMeta.routes,  // 固定路由寫進 DB
          },
        }
        const res = await api.put(`/warning-regions/id/${this.regionId}`, {
          regionName: this.regionName,
          apiConfig:  updated,
        })
        if (res?.success) {
          await showSuccess('端點網址已儲存', '完成', this.isDarkMode)
          this.$emit('saved', { category: this.category, baseUrl: this.baseUrl })
          this.$emit('close')
        } else {
          throw new Error(res?.message || '儲存失敗')
        }
      } catch (e) {
        await showError(e.message || '儲存失敗', '錯誤', this.isDarkMode)
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
