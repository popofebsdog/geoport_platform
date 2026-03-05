<template>
  <button 
    :type="type"
    :disabled="disabled"
    @click="handleClick"
    class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
    :class="getButtonClasses()">
    
    <!-- 圖標 -->
    <svg v-if="icon" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path v-if="icon === 'check'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      <path v-else-if="icon === 'x'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      <path v-else-if="icon === 'ban'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
      <path v-else-if="icon === 'search'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      <path v-else-if="icon === 'filter'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
    </svg>
    
    <!-- 按鈕文字 -->
    <span>{{ text }}</span>
  </button>
</template>

<script>
export default {
  name: 'ActionButton',
  props: {
    // 按鈕模式：'confirm', 'cancel', 'disabled'
    mode: {
      type: String,
      default: 'confirm',
      validator: (value) => ['confirm', 'cancel', 'disabled'].includes(value)
    },
    // 按鈕文字
    text: {
      type: String,
      default: '按鈕'
    },
    // 按鈕類型
    type: {
      type: String,
      default: 'button'
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    // 圖標名稱
    icon: {
      type: String,
      default: null
    },
    // 是否為深色模式
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  methods: {
    handleClick() {
      if (!this.disabled && this.mode !== 'disabled') {
        this.$emit('click')
      }
    },
    
    getButtonClasses() {
      const baseClasses = 'transition-all duration-300'
      
      switch (this.mode) {
        case 'confirm':
          return `${baseClasses} ${
            this.isDarkMode 
              ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' 
              : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
          }`
          
        case 'cancel':
          return `${baseClasses} ${
            this.isDarkMode 
              ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600 text-gray-300 focus:ring-slate-500' 
              : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500'
          }`
          
        case 'disabled':
          return `${baseClasses} ${
            this.isDarkMode 
              ? 'bg-slate-800 border border-slate-700 text-gray-500 cursor-not-allowed opacity-50' 
              : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
          }`
          
        default:
          return `${baseClasses} ${
            this.isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' 
              : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
          }`
      }
    }
  }
}
</script>
