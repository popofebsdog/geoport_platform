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
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  border-width: 1px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* 淺色模式 */
.icon-button-light {
  background-color: rgb(255, 255, 255);
  border-color: rgb(229, 231, 235);
  color: rgb(75, 85, 99);
}

.icon-button-light:hover {
  background-color: rgb(249, 250, 251);
  border-color: rgb(209, 213, 219);
  color: rgb(31, 41, 55);
}

.icon-button-light:active {
  transform: scale(0.95);
}

/* 深色模式 */
.icon-button-dark {
  background-color: rgb(51, 65, 85);
  border-color: rgb(71, 85, 105);
  color: rgb(209, 213, 219);
}

.icon-button-dark:hover {
  background-color: rgb(71, 85, 105);
  border-color: rgb(100, 116, 139);
  color: rgb(255, 255, 255);
}

.icon-button-dark:active {
  transform: scale(0.95);
}

/* 關閉按鈕特殊樣式 */
.icon-button-close-light:hover {
  background-color: rgb(254, 242, 242);
  border-color: rgb(254, 202, 202);
  color: rgb(220, 38, 38);
}

.icon-button-close-dark:hover {
  background-color: rgba(127, 29, 29, 0.3);
  border-color: rgb(153, 27, 27);
  color: rgb(248, 113, 113);
}
</style>
