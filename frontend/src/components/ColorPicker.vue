<template>
  <div class="color-picker">
    <label v-if="label" class="block text-sm font-medium mb-2 transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
      {{ label }}
    </label>
    
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="color in colorOptions"
        :key="color"
        @click="selectColor(color)"
        type="button"
        class="w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        :class="[
          selectedColor === color 
            ? 'border-gray-800 ring-2 ring-offset-2 ring-blue-500' 
            : 'border-gray-300 hover:border-gray-400',
          isDarkMode ? 'focus:ring-blue-400' : 'focus:ring-blue-500'
        ]"
        :style="{ backgroundColor: color }"
        :title="color"
      >
        <div v-if="selectedColor === color" class="w-full h-full flex items-center justify-center">
          <svg class="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
      </button>
    </div>
    
    <div v-if="showColorCode" class="mt-2 text-xs transition-colors duration-300"
         :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
      已選擇顏色: {{ selectedColor }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ColorPicker',
  props: {
    modelValue: {
      type: String,
      default: '#3388ff'
    },
    // 向後兼容舊的 value prop
    value: {
      type: String,
      default: null
    },
    label: {
      type: String,
      default: '圖層顏色'
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    showColorCode: {
      type: Boolean,
      default: true
    },
    colors: {
      type: Array,
      default: null
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      // 預設的9種顏色選項 (3x3方格)
      defaultColorOptions: [
        '#3388ff', // 藍色
        '#ff6b6b', // 紅色
        '#51cf66', // 綠色
        '#ffd43b', // 黃色
        '#9775fa', // 紫色
        '#ff8cc8', // 粉色
        '#20c997', // 青色
        '#fd7e14', // 橙色
        '#6c757d'  // 灰色
      ]
    }
  },
  computed: {
    selectedColor: {
      get() {
        // 優先使用 modelValue，向後兼容 value
        const currentValue = this.modelValue || this.value || '#3388ff'
        return currentValue
      },
      set(newColor) {
        this.$emit('update:modelValue', newColor)
        this.$emit('change', newColor)
      }
    },
    colorOptions() {
      return this.colors || this.defaultColorOptions
    }
  },
  methods: {
    selectColor(color) {
      
      // 直接發送事件，不通過 computed setter
      this.$emit('update:modelValue', color)
      this.$emit('change', color)
      
    }
  }
}
</script>

<style scoped>
.color-picker {
  @apply w-full;
}

.color-picker button {
  @apply relative overflow-hidden;
}

.color-picker button::before {
  content: '';
  @apply absolute inset-0 bg-white bg-opacity-0 transition-opacity duration-200;
}

.color-picker button:hover::before {
  @apply bg-opacity-10;
}
</style>
