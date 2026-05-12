<template>
  <button
    class="nav-tab"
    :class="{ 'is-active': isActive, 'is-dark': isDarkMode }"
    @click="$emit('click')"
  >
    <span class="nav-title">{{ tab.title }}</span>
    <span class="nav-sub">{{ tab.subtitle }}</span>
  </button>
</template>

<script>
export default {
  name: 'BookmarkTab',
  props: {
    tab:       { type: Object,  required: true },
    isActive:  { type: Boolean, default: false },
    isDarkMode:{ type: Boolean, default: false }
  },
  emits: ['click']
}
</script>

<style scoped>
.nav-tab {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 22px;
  height: 64px;          /* 撐滿 nav 高度讓底線貼齊 */
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

/* 淺色模式 */
.nav-tab { color: #6b7280; }          /* gray-500 */
.nav-tab:hover { color: #111827; border-bottom-color: #d1d5db; }   /* gray-900 / gray-300 */
.nav-tab.is-active { color: #111827; border-bottom-color: #1e5c8a; }

/* 深色模式 */
.nav-tab.is-dark { color: #94a3b8; }
.nav-tab.is-dark:hover { color: #f1f5f9; border-bottom-color: #475569; }
.nav-tab.is-dark.is-active { color: #f1f5f9; border-bottom-color: #3378b5; }

.nav-title {
  font-size: 0.8125rem;   /* 13px @ 16px base，跟著 html font-size 縮放 */
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
}

.nav-sub {
  font-size: 0.625rem;    /* 10px @ 16px base */
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
  line-height: 1;
}

@media (max-width: 1024px) {
  .nav-tab   { padding: 0 16px; }
  .nav-title { font-size: 0.75rem; }
  .nav-sub   { font-size: 0.5625rem; }
}

@media (max-width: 768px) {
  .nav-tab    { padding: 0 12px; }
  .nav-sub    { display: none; }
}
</style>
