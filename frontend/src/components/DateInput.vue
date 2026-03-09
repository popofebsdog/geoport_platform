<template>
  <input
    :value="value"
    type="date"
    :class="inputClass"
    :style="inputStyle"
    @input="handleInput"
    @change="handleChange"
    :placeholder="placeholder || 'YYYY-MM-DD'"
    :disabled="disabled"
    ref="dateInput"
  />
</template>

<script>
export default {
  name: 'DateInput',
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    inputClass() {
      return [
        'w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 date-input',
        this.isDarkMode 
          ? 'bg-slate-700 border-slate-600 text-white' 
          : 'bg-white border-gray-300 text-gray-900',
        this.disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]
    },
    inputStyle() {
      return this.isDarkMode ? 'color-scheme: dark;' : 'color-scheme: light;'
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(newValue) {
      }
    }
  },
  methods: {
    handleInput(event) {
      const value = event.target.value
      this.$emit('input', value)
    },
    
    handleChange(event) {
      const value = event.target.value
      this.$emit('input', value) // 統一使用 input 事件
    }
  }
}
</script>

<style scoped>
/* 日期輸入框深色模式支援 */
.date-input::-webkit-calendar-picker-indicator {
  /* WebKit瀏覽器（Chrome, Safari）的日曆圖標樣式 */
  filter: invert(0);
  transition: filter 0.3s ease;
}

/* 深色模式下的日曆圖標 */
.dark .date-input::-webkit-calendar-picker-indicator,
.date-input[style*="color-scheme: dark"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

/* Firefox瀏覽器的日曆圖標 */
.date-input::-moz-calendar-picker-indicator {
  filter: invert(0);
  transition: filter 0.3s ease;
}

.dark .date-input::-moz-calendar-picker-indicator,
.date-input[style*="color-scheme: dark"]::-moz-calendar-picker-indicator {
  filter: invert(1);
}

/* 年份部分樣式調整 */
.date-input::-webkit-datetime-edit-year-field {
  /* 限制年份欄位寬度 */
  width: 4ch;
}

.date-input::-webkit-datetime-edit-month-field {
  width: 2ch;
}

.date-input::-webkit-datetime-edit-day-field {
  width: 2ch;
}
</style>f