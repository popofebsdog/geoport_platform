<template>
  <div class="space-y-4">

    <!-- ── Base URL + Auth ── -->
    <div class="space-y-3">
      <div>
        <label class="block text-xs font-medium mb-1"
               :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
          Base URL
        </label>
        <input
          v-model="local.baseUrl"
          type="url"
          placeholder="http://140.113.21.54"
          class="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
          :class="inputClass"
          @input="emit()"
        />
      </div>

      <div class="flex gap-3">
        <div class="w-36 flex-shrink-0">
          <label class="block text-xs font-medium mb-1"
                 :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
            認證方式
          </label>
          <select v-model="local.authType" class="w-full text-sm px-2 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="inputClass" @change="emit()">
            <option value="none">無認證</option>
            <option value="api_key">API Key</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
          </select>
        </div>

        <div v-if="local.authType !== 'none'" class="flex-1">
          <label class="block text-xs font-medium mb-1"
                 :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
            憑證
          </label>
          <input v-model="local.authValue" type="password" placeholder="輸入憑證"
                 class="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                 :class="inputClass" @input="emit()" />
        </div>

        <div class="w-36 flex-shrink-0">
          <label class="block text-xs font-medium mb-1"
                 :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
            更新頻率（分鐘）
          </label>
          <input v-model.number="local.updateInterval" type="number" min="1" placeholder="10"
                 class="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                 :class="inputClass" @input="emit()" />
        </div>
      </div>
    </div>

    <!-- ── 已設定路由 ── -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold"
              :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
          已設定路由
          <span class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-normal"
                :class="isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-500'">
            {{ local.routes.length }}
          </span>
        </span>
        <button
          @click="toggleAddForm"
          class="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
          :class="showAddForm
            ? (isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700')
            : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ showAddForm ? '收起' : '+ 新增路由' }}
        </button>
      </div>

      <!-- 路由清單 -->
      <div v-if="local.routes.length === 0 && !showAddForm"
           class="text-center py-4 text-xs rounded-lg border border-dashed"
           :class="isDarkMode ? 'border-slate-600 text-slate-500' : 'border-gray-300 text-gray-400'">
        尚未設定任何路由，點「新增路由」開始探索
      </div>
      <div v-else class="space-y-1.5">
        <div
          v-for="route in local.routes" :key="route.id"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          :class="isDarkMode ? 'bg-slate-700/50' : 'bg-gray-50'"
        >
          <span class="font-mono text-blue-500 flex-shrink-0">{{ route.path }}</span>
          <span class="text-slate-400">→</span>
          <span class="font-mono text-emerald-600 dark:text-emerald-400 flex-shrink-0">{{ route.dataPath }}</span>
          <span class="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                :class="isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'">
            {{ roleLabelMap[route.role] || route.role }}
          </span>
          <span class="flex-1 truncate text-slate-400">{{ route.label }}</span>
          <button @click="removeRoute(route.id)"
                  class="text-red-400 hover:text-red-600 flex-shrink-0 text-sm leading-none transition-colors">
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- ── 新增路由面板 ── -->
    <div
      v-if="showAddForm"
      class="rounded-lg border p-4 space-y-3"
      :class="isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-blue-200 bg-blue-50/50'"
    >
      <p class="text-xs font-semibold"
         :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">探索端點</p>

      <!-- Path + 探索按鈕 -->
      <div class="flex gap-2">
        <div class="flex-1">
          <label class="block text-xs mb-1" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">路由 Path（附加在 Base URL 後）</label>
          <input
            v-model="newRoute.path"
            type="text"
            placeholder="/warningflag"
            class="w-full text-sm px-3 py-2 rounded-lg border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="inputClass"
            @keyup.enter="probeRoute"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="probeRoute"
            :disabled="probing || !local.baseUrl || !newRoute.path"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ probing ? '探索中…' : '探索' }}
          </button>
        </div>
      </div>

      <!-- 錯誤 -->
      <div v-if="probeError" class="text-xs px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
        ❌ {{ probeError }}
      </div>

      <!-- JSON Tree -->
      <div v-if="probeResult !== null" class="space-y-2">
        <p class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
          點擊欄位選擇要取用的資料路徑：
        </p>
        <div class="rounded-lg border overflow-auto max-h-60 p-3"
             :class="isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-white'">
          <JsonTree
            :data="probeResult"
            :selected-path="newRoute.dataPath"
            @select="newRoute.dataPath = $event"
          />
        </div>

        <!-- 路由 meta -->
        <div class="grid grid-cols-3 gap-2 pt-1">
          <div>
            <label class="block text-xs mb-1" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">已選路徑</label>
            <input
              v-model="newRoute.dataPath"
              type="text"
              placeholder="warnings"
              class="w-full text-sm px-3 py-2 rounded-lg border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="inputClass"
            />
          </div>
          <div>
            <label class="block text-xs mb-1" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">標籤名稱</label>
            <input
              v-model="newRoute.label"
              type="text"
              placeholder="告警旗標"
              class="w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="inputClass"
            />
          </div>
          <div>
            <label class="block text-xs mb-1" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">資料用途</label>
            <select v-model="newRoute.role"
                    class="w-full text-sm px-2 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :class="inputClass">
              <option value="alert">告警</option>
              <option value="timeseries">時間序列</option>
              <option value="latest">最新值</option>
              <option value="catalog">目錄清單</option>
            </select>
          </div>
        </div>

        <!-- 確認 / 取消 -->
        <div class="flex gap-2 justify-end pt-1">
          <button
            @click="cancelAdd"
            class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
            :class="isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
          >
            取消
          </button>
          <button
            @click="confirmAdd"
            :disabled="!newRoute.dataPath || !newRoute.label"
            class="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓ 確認新增
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import api from '@/services/api'
import JsonTree from './JsonTree.vue'

function emptyCategory() {
  return { baseUrl: '', authType: 'none', authValue: '', updateInterval: 10, routes: [] }
}

function newRouteDefault() {
  return { path: '', dataPath: '', label: '', role: 'timeseries' }
}

export default {
  name: 'ApiRouteConfigurator',
  components: { JsonTree },
  props: {
    modelValue: { type: Object, default: () => emptyCategory() },
    isDarkMode:  { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      local:     this.cloneValue(),
      showAddForm: false,
      probing:   false,
      probeResult: null,
      probeError:  null,
      newRoute:  newRouteDefault(),
      roleLabelMap: {
        alert:      '告警',
        timeseries: '時間序列',
        latest:     '最新值',
        catalog:    '目錄清單',
      },
    }
  },
  computed: {
    inputClass() {
      return this.isDarkMode
        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
        : 'bg-white border-gray-300 text-gray-800'
    },
  },
  watch: {
    modelValue: {
      deep: true,
      handler() {
        // 外部 prop 更新時同步 local（避免 infinite loop 要比較）
        const a = JSON.stringify(this.local)
        const b = JSON.stringify(this.cloneValue())
        if (a !== b) this.local = this.cloneValue()
      },
    },
  },
  methods: {
    cloneValue() {
      const v = this.modelValue ?? {}
      return {
        baseUrl:        v.baseUrl || v.endpoint || '',
        authType:       v.authType || 'none',
        authValue:      v.authValue || '',
        updateInterval: v.updateInterval ?? 10,
        routes:         Array.isArray(v.routes) ? JSON.parse(JSON.stringify(v.routes)) : [],
      }
    },

    emit() {
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.local)))
    },

    toggleAddForm() {
      this.showAddForm = !this.showAddForm
      if (!this.showAddForm) this.resetAddForm()
    },

    async probeRoute() {
      if (!this.local.baseUrl || !this.newRoute.path) return
      this.probing = true
      this.probeResult = null
      this.probeError = null
      try {
        const url = this.local.baseUrl.replace(/\/$/, '') + '/' + this.newRoute.path.replace(/^\//, '')
        const res = await api.post('/probe', {
          url,
          authType:  this.local.authType,
          authValue: this.local.authValue,
        })
        if (res?.success) {
          this.probeResult = res.data
        } else {
          this.probeError = res?.error || '探索失敗'
        }
      } catch (e) {
        this.probeError = e.message || '探索失敗'
      } finally {
        this.probing = false
      }
    },

    confirmAdd() {
      if (!this.newRoute.dataPath || !this.newRoute.label) return
      const route = {
        id:       crypto.randomUUID(),
        path:     this.newRoute.path,
        dataPath: this.newRoute.dataPath,
        label:    this.newRoute.label,
        role:     this.newRoute.role,
      }
      this.local.routes.push(route)
      this.emit()
      this.resetAddForm()
    },

    removeRoute(id) {
      this.local.routes = this.local.routes.filter(r => r.id !== id)
      this.emit()
    },

    cancelAdd() {
      this.resetAddForm()
      this.showAddForm = false
    },

    resetAddForm() {
      this.newRoute   = newRouteDefault()
      this.probeResult = null
      this.probeError  = null
    },
  },
}
</script>
