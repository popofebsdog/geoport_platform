<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        @click.self="handleCancel"
      >
        <!-- 霧面背景 -->
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"></div>
        
        <!-- 模態框內容 -->
        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full z-10">
          <!-- 標題欄 -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <!-- 警告圖標 -->
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">確認刪除</h3>
            </div>
            <button 
              @click="handleCancel"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- 內容區域 -->
          <div class="p-6">
            <p class="text-gray-700 dark:text-gray-300 mb-2">
              確定要刪除「<span class="font-semibold text-gray-900 dark:text-gray-100">{{ regionName }}</span>」這個監測地區專案嗎？
            </p>
            <p class="text-sm text-red-600 dark:text-red-400 font-medium">
              此操作無法復原，請謹慎操作。
            </p>
          </div>
          
          <!-- 按鈕區域 -->
          <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              確認刪除
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'DeleteConfirmModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    regionName: {
      type: String,
      default: ''
    }
  },
  emits: ['confirm', 'cancel', 'close'],
  methods: {
    handleConfirm() {
      this.$emit('confirm');
    },
    handleCancel() {
      this.$emit('cancel');
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* 模態框動畫 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>

