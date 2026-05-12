<template>
  <div class="h-16 flex items-center justify-between px-4 transition-colors duration-300"
       :class="isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'">
    
    <!-- 專案名稱 -->
    <div class="flex-1 flex items-center justify-start pl-6">
      <h2 class="text-base font-semibold transition-colors duration-300 leading-relaxed"
          :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'">
        <span v-if="showBackToParent" class="font-bold text-gray-500 mr-2">事件紀錄：</span>
        <span v-else class="font-bold text-gray-500 mr-2">專案名稱：</span>
        <span class="font-bold" :class="isDarkMode ? 'text-white' : 'text-gray-900'">{{ project?.name || '專案詳情' }}</span>
    </h2>
    </div>
    
    <!-- 右側按鈕組 -->
    <div class="flex items-center space-x-2">
      <!-- 母專案專用按鈕 -->
      <template v-if="!showBackToParent">
        <!-- 瀏覽照片按鈕 -->
        <button 
          @click="$emit('view-photos')" 
          class="icon-button"
          :class="isDarkMode ? 'icon-button-dark' : 'icon-button-light'"
          title="瀏覽所有子專案照片">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </button>
        
        <!-- 編輯母專案資訊按鈕 -->
        <button 
          @click="$emit('edit-project')" 
          class="icon-button"
          :class="isDarkMode ? 'icon-button-dark' : 'icon-button-light'"
          title="編輯專案資訊">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
      </template>
      
      <!-- 子專案專用按鈕 -->
      <template v-if="showBackToParent">
        <!-- 返回母專案按鈕 -->
        <button 
          @click="$emit('back-to-parent')" 
          class="icon-button"
          :class="isDarkMode ? 'icon-button-dark' : 'icon-button-light'"
          title="返回母專案">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
      </button>
      
      <!-- 編輯專案資訊按鈕 -->
        <button 
          @click="$emit('edit-project')" 
          class="icon-button"
          :class="isDarkMode ? 'icon-button-dark' : 'icon-button-light'"
              title="編輯專案資訊">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      </button>
      </template>
      
      <!-- 關閉按鈕（所有專案都顯示） -->
      <button 
        @click="$emit('close')" 
        class="icon-button"
        :class="isDarkMode ? 'icon-button-dark icon-button-close-dark' : 'icon-button-light icon-button-close-light'"
        title="關閉">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProjectTitleBar',
  props: {
    project: {
      type: Object,
      default: null
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    showBackToParent: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'locate-project', 'edit-project', 'show-project-info', 'back-to-parent', 'view-photos']
}
</script>

<style scoped>
/* Icon 按鈕基礎樣式 */
.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 2px;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  border: 1px solid transparent;
}

.icon-button-light {
  color: #6b7280;
  border-color: #e5e7eb;
}
.icon-button-light:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.icon-button-dark {
  color: #9ca3af;
  border-color: #475569;
}
.icon-button-dark:hover {
  background-color: #1e293b;
  color: #e2e8f0;
}

.icon-button-close-light:hover {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}
.icon-button-close-dark:hover {
  background-color: rgba(127, 29, 29, 0.3);
  border-color: #991b1b;
  color: #f87171;
}
</style>
