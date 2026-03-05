<template>
  <div 
    class="module-tab"
    :class="{ 'active': isActive, 'dark-mode': isDarkMode }"
    @click="$emit('click')"
  >
    <div class="module-content">
      <div class="module-info">
        <span class="module-title">{{ tab.title }}</span>
        <span class="module-subtitle">{{ tab.subtitle }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BookmarkTab',
  props: {
    tab: {
      type: Object,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click']
}
</script>

<style scoped>
.module-tab {
  position: relative;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-right: 4px;
  z-index: 10;
}

.module-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 180px;
  cursor: pointer;
  font-weight: 500;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 深色模式 - 未激活 */
.module-tab.dark-mode .module-content {
  background: rgba(51, 65, 85, 0.8);
  color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 淺色模式 - 未激活 */
.module-tab:not(.dark-mode) .module-content {
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 深色模式 - 激活 */
.module-tab.dark-mode.active .module-content {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

/* 淺色模式 - 激活 */
.module-tab:not(.dark-mode).active .module-content {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

/* Hover 效果 */
.module-tab:not(.active):hover .module-content {
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.module-tab.dark-mode:not(.active):hover .module-content {
  background: rgba(59, 130, 246, 0.25);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}


.module-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.module-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  line-height: 1.2;
}

.module-subtitle {
  font-weight: 400;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0.7;
  line-height: 1.2;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .module-content {
    min-width: 140px;
    padding: 8px 16px;
  }
  
  .module-title {
    font-size: 13px;
  }
  
  .module-subtitle {
    font-size: 10px;
  }
}

@media (max-width: 768px) {
  .module-content {
    min-width: 120px;
    padding: 8px 14px;
  }
  
  .module-title {
    font-size: 12px;
  }
  
  .module-subtitle {
    font-size: 9px;
  }
}
</style> 