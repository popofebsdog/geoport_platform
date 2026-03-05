<template>
  <!-- 母專案卡片 - 資料夾樣式 -->
  <div class="parent-project-card" :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
    <!-- 母專案標題區域 -->
    <div 
      class="parent-header"
      :class="isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-gray-50'"
    >
      <!-- 左側：資料夾圖標和資訊 -->
      <div class="flex items-center flex-1 space-x-4">
        <!-- 資料夾圖標 -->
        <div class="folder-icon open">
          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-8l-2-2H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
          </svg>
        </div>
        
        <!-- 專案資訊 -->
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold truncate transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ parentProject.name }}
          </h3>
          
          <div class="flex items-center space-x-4 mt-1 text-sm"
               :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
            <!-- 道路資訊 -->
            <div v-if="parentProject.road_number" class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <span>{{ parentProject.road_number }}</span>
            </div>
            
            <!-- 子專案數量 -->
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ parentProject.child_count || 0 }}次事件調查專案</span>
            </div>

            <!-- 報告連結數量 -->
            <div v-if="reportLinks.length > 0" class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <span>{{ reportLinks.length }} 個報告</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右側：操作按鈕（兩列） -->
      <div class="flex flex-col items-end space-y-1.5" @click.stop>
        <!-- 第一列：主要操作 -->
        <div class="flex items-center space-x-2">
          <!-- 新增紀錄 -->
          <button
            @click="$emit('add-child', parentProject)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center space-x-1"
            :class="isDarkMode ? 'text-gray-300 bg-blue-600 hover:bg-blue-700' : 'text-white bg-blue-500 hover:bg-blue-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>新增紀錄</span>
          </button>
          
          <!-- 進入專案 -->
          <button
            @click="$emit('open', parentProject)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center space-x-1"
            :class="isDarkMode ? 'text-gray-300 bg-blue-600 hover:bg-blue-700' : 'text-white bg-blue-500 hover:bg-blue-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span>進入專案</span>
          </button>
          
          <!-- 編輯 -->
          <button
            @click="$emit('edit', parentProject)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center space-x-1"
            :class="isDarkMode ? 'text-gray-300 bg-blue-600 hover:bg-blue-700' : 'text-white bg-blue-500 hover:bg-blue-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <span>編輯</span>
          </button>
          
          <!-- 刪除 -->
          <button
            @click="$emit('delete', parentProject)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center space-x-1"
            :class="isDarkMode ? 'text-gray-300 bg-red-600 hover:bg-red-700' : 'text-white bg-red-500 hover:bg-red-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>刪除</span>
          </button>
        </div>

        <!-- 第二列：報告連結 -->
        <div class="flex items-center">
          <button
            @click="$emit('add-report-link', parentProject)"
            class="px-3 py-1 text-xs font-medium rounded-lg transition-all duration-300 flex items-center space-x-1 border"
            :class="isDarkMode
              ? 'text-purple-300 border-purple-500 hover:bg-purple-900 hover:border-purple-400'
              : 'text-purple-600 border-purple-400 hover:bg-purple-50 hover:border-purple-500'"
            title="管理報告連結"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            <span>報告連結</span>
            <span v-if="reportLinks.length > 0"
                  class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="isDarkMode ? 'bg-purple-700 text-purple-200' : 'bg-purple-100 text-purple-700'">
              {{ reportLinks.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 報告連結列表 -->
    <div v-if="reportLinks.length > 0"
         class="px-4 py-2 border-t transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-100'">
      <div class="flex items-center space-x-2 mb-2">
        <svg class="w-3.5 h-3.5" :class="isDarkMode ? 'text-purple-400' : 'text-purple-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
        </svg>
        <span class="text-xs font-medium transition-colors duration-300"
              :class="isDarkMode ? 'text-purple-400' : 'text-purple-600'">相關報告</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          v-for="link in reportLinks"
          :key="link.id"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:opacity-80"
          :class="isDarkMode ? 'bg-purple-900 text-purple-300 hover:bg-purple-800' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'"
          :title="link.url"
        >
          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  @apply mb-4 rounded-xl border transition-all duration-300 overflow-hidden;
  @apply shadow-sm hover:shadow-lg;
}

.parent-header {
  @apply flex items-start p-4 transition-all duration-300;
}

.folder-icon {
  @apply text-yellow-500 transition-colors duration-300;
}

.folder-icon.open {
  @apply text-yellow-400;
}
</style>
