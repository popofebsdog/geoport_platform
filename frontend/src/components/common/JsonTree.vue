<template>
  <div>
    <div
      v-for="(val, key) in displayItems"
      :key="String(key)"
      class="group"
    >
      <!-- 節點列 -->
      <div
        class="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
        :class="{ 'bg-blue-100 dark:bg-blue-900/40': isSelected(buildPath(key)) }"
        @click="handleClick(key, val)"
      >
        <!-- 展開箭頭 -->
        <button
          v-if="isExpandable(val)"
          class="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 flex-shrink-0 text-xs"
          @click.stop="toggleExpand(key)"
        >
          {{ expanded[key] ? '▾' : '▸' }}
        </button>
        <span v-else class="w-4 flex-shrink-0" />

        <!-- key 名稱 -->
        <span
          class="font-mono text-xs font-medium select-none"
          :class="isSelected(buildPath(key))
            ? 'text-blue-600 dark:text-blue-400'
            : isArray(val)
              ? 'text-purple-600 dark:text-purple-400'
              : isObject(val)
                ? 'text-sky-700 dark:text-sky-400'
                : 'text-slate-700 dark:text-slate-300'"
        >
          {{ isArrayParent ? `[${key}]` : key }}
        </span>

        <!-- 類型 / 值 預覽 -->
        <span class="text-xs text-slate-400 flex-1 truncate">
          <template v-if="isArray(val)">
            <span class="text-purple-400">[ {{ val.length }} 筆 ]</span>
          </template>
          <template v-else-if="isObject(val)">
            <span class="text-sky-400">{ {{ Object.keys(val).length }} 個欄位 }</span>
          </template>
          <template v-else>
            : <span :class="primitiveClass(val)">{{ formatVal(val) }}</span>
          </template>
        </span>

        <!-- 選擇按鈕（hover 顯示，對 expandable 節點才出現） -->
        <button
          v-if="isExpandable(val)"
          class="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          @click.stop="$emit('select', buildPath(key))"
        >
          選
        </button>
      </div>

      <!-- 展開的子節點 -->
      <div
        v-if="isExpandable(val) && expanded[key]"
        class="ml-5 border-l border-slate-200 dark:border-slate-600 pl-1"
      >
        <!-- 陣列：顯示第一筆結構 -->
        <JsonTree
          v-if="isArray(val) && val.length > 0"
          :data="val[0]"
          :parent-path="buildPath(key)"
          :is-array-parent="true"
          :selected-path="selectedPath"
          @select="$emit('select', $event)"
        />
        <!-- 物件 -->
        <JsonTree
          v-else-if="isObject(val)"
          :data="val"
          :parent-path="buildPath(key)"
          :is-array-parent="false"
          :selected-path="selectedPath"
          @select="$emit('select', $event)"
        />
        <div v-else class="text-xs text-slate-400 py-1 px-2">（空陣列）</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonTree',
  props: {
    data:         { type: [Object, Array], default: () => ({}) },
    parentPath:   { type: String,  default: '' },
    isArrayParent:{ type: Boolean, default: false },
    selectedPath: { type: String,  default: '' },
  },
  emits: ['select'],
  data() {
    return { expanded: {} }
  },
  computed: {
    displayItems() {
      return this.data ?? {}
    },
  },
  methods: {
    isArray(v)      { return Array.isArray(v) },
    isObject(v)     { return v !== null && typeof v === 'object' && !Array.isArray(v) },
    isExpandable(v) { return this.isArray(v) || this.isObject(v) },

    buildPath(key) {
      const segment = this.isArrayParent ? `[${key}]` : String(key)
      return this.parentPath ? `${this.parentPath}.${segment}` : segment
    },

    isSelected(path) {
      return this.selectedPath === path
    },

    toggleExpand(key) {
      this.expanded[key] = !this.expanded[key]
    },

    handleClick(key, val) {
      if (this.isExpandable(val)) {
        this.toggleExpand(key)
        this.$emit('select', this.buildPath(key))
      } else {
        this.$emit('select', this.buildPath(key))
      }
    },

    formatVal(v) {
      if (v === null)      return 'null'
      if (v === undefined) return 'undefined'
      if (typeof v === 'string') return `"${v.slice(0, 40)}${v.length > 40 ? '…' : ''}"`
      return String(v)
    },

    primitiveClass(v) {
      if (typeof v === 'string')  return 'text-emerald-600 dark:text-emerald-400'
      if (typeof v === 'number')  return 'text-orange-500 dark:text-orange-400'
      if (typeof v === 'boolean') return 'text-blue-500'
      return 'text-slate-400'
    },
  },
}
</script>
