<template>
  <!-- 母專案卡片 -->
  <div class="parent-project-card" :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
    <!-- 母專案標題區域 -->
    <div
      class="parent-header"
      :class="isDarkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-gray-50'"
    >
      <!-- 左側：圖標和資訊 -->
      <div class="flex items-center flex-1 min-w-0 space-x-3">
        <!-- 資料夾圖標（中性色） -->
        <div class="folder-icon flex-shrink-0">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-8l-2-2H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
          </svg>
        </div>

        <!-- 專案資訊 -->
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold truncate transition-colors duration-150"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ parentProject.name }}
          </h3>

          <div class="flex items-center flex-wrap gap-x-3 mt-0.5 text-xs"
               :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
            <span v-if="parentProject.road_number">{{ parentProject.road_number }}</span>
            <span>{{ parentProject.child_count || 0 }} 次調查</span>
            <span v-if="reportLinks.length > 0">{{ reportLinks.length }} 個報告</span>
          </div>
        </div>
      </div>

      <!-- 右側：操作按鈕 -->
      <div class="flex items-center space-x-1 flex-shrink-0 ml-3" @click.stop>
        <!-- 新增紀錄 -->
        <button
          @click="$emit('add-child', parentProject)"
          class="card-btn card-btn-ghost"
          :class="isDarkMode ? 'card-btn-dark' : 'card-btn-light'"
          title="新增紀錄"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>新增</span>
        </button>

        <!-- 進入專案（主按鈕） -->
        <button
          @click="$emit('open', parentProject)"
          class="card-btn card-btn-primary"
          title="進入專案"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <span>進入</span>
        </button>

        <!-- 分隔 -->
        <div class="w-px h-4 mx-0.5 transition-colors duration-150"
             :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-200'"></div>

        <!-- 報告連結 -->
        <button
          @click="$emit('add-report-link', parentProject)"
          class="card-icon-btn"
          :class="isDarkMode ? 'card-icon-btn-dark' : 'card-icon-btn-light'"
          title="管理報告連結"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
          </svg>
        </button>

        <!-- 編輯 -->
        <button
          @click="$emit('edit', parentProject)"
          class="card-icon-btn"
          :class="isDarkMode ? 'card-icon-btn-dark' : 'card-icon-btn-light'"
          title="編輯"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>

        <!-- 刪除 -->
        <button
          @click="$emit('delete', parentProject)"
          class="card-icon-btn card-icon-btn-danger"
          :class="isDarkMode ? 'card-icon-btn-danger-dark' : 'card-icon-btn-danger-light'"
          title="刪除"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- 報告連結列表 -->
    <div v-if="reportLinks.length > 0"
         class="px-4 py-2 border-t transition-colors duration-150"
         :class="isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-100'">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[10px] font-semibold uppercase tracking-widest mr-1"
              :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">報告</span>
        <a
          v-for="link in reportLinks"
          :key="link.id"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs border transition-colors duration-150"
          :class="isDarkMode
            ? 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
            : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'"
          :title="link.url"
        >
          <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
          <span>{{ link.title || link.url }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ParentProjectCard',
  props: {
    parentProject: {
      type: Object,
      required: true
    },
    childProjects: {
      type: Array,
      default: () => []
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'add-child',
    'open',
    'edit',
    'delete',
    'add-report-link'
  ],
  computed: {
    reportLinks() {
      return this.parentProject?.metadata?.reportLinks || []
    }
  }
}
</script>

<style scoped>
.parent-project-card {
  @apply mb-3 rounded border overflow-hidden;
  transition: border-color 0.15s;
}

.parent-header {
  @apply flex items-center px-3 py-2.5 transition-colors duration-150;
}

.folder-icon {
  color: #9ca3af;
}

/* ── 帶文字按鈕 ───────────── */
.card-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 2px;
  border: 1px solid transparent;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

/* ghost 輪廓樣式 */
.card-btn-light {
  color: #374151;
  border-color: #d1d5db;
  background: transparent;
}
.card-btn-light:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}
.card-btn-dark {
  color: #d1d5db;
  border-color: #475569;
  background: transparent;
}
.card-btn-dark:hover {
  background-color: #1e293b;
  border-color: #64748b;
}

/* primary 實心 */
.card-btn-primary {
  color: #fff;
  background-color: #1e5c8a;
  border-color: #1e5c8a;
}
.card-btn-primary:hover {
  background-color: #174d77;
  border-color: #174d77;
}

/* ── 純圖標按鈕 ───────────── */
.card-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 2px;
  border: 1px solid transparent;
  transition: background-color 0.15s, color 0.15s;
}
.card-icon-btn-light {
  color: #6b7280;
}
.card-icon-btn-light:hover {
  background-color: #f3f4f6;
  color: #374151;
}
.card-icon-btn-dark {
  color: #9ca3af;
}
.card-icon-btn-dark:hover {
  background-color: #1e293b;
  color: #e2e8f0;
}
.card-icon-btn-danger-light:hover {
  background-color: #fef2f2;
  color: #dc2626;
}
.card-icon-btn-danger-dark:hover {
  background-color: rgba(127,29,29,0.3);
  color: #f87171;
}
</style>
