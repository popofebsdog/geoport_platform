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
              <!-- 提示圖標 -->
              <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ isDeleting ? '取消告警燈號設置' : '設置告警燈號位置' }}</h3>
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
            <p class="text-gray-700 dark:text-gray-300 mb-2" v-if="!isDeleting">
              確定要在以下位置設置告警燈號嗎？
            </p>
            <p class="text-gray-700 dark:text-gray-300 mb-2" v-else>
              確定要取消以下位置的告警燈號設置嗎？
            </p>
            <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                <span class="font-semibold">路線：</span>{{ pointInfo?.roadSection || '-' }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span class="font-semibold">里程數：</span>{{ pointInfo?.mileage || '-' }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span class="font-semibold">位置：</span>{{ pointInfo?.location || '-' }}
              </p>
            </div>
            <p class="text-sm text-blue-600 dark:text-blue-400 font-medium mt-4" v-if="!isDeleting">
              設置後，將在該里程點上方顯示告警燈號視覺組件。
            </p>
            <p class="text-sm text-red-600 dark:text-red-400 font-medium mt-4" v-else>
              取消後，該里程點上方的告警燈號視覺組件將被移除。
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
              :class="isDeleting ? 
                'px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors' :
                'px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors'"
            >
              {{ isDeleting ? '確定取消' : '確定設置' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'AlertLightConfirmModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    pointInfo: {
      type: Object,
      default: () => ({})
    },
    isDeleting: {
      type: Boolean,
      default: false
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

