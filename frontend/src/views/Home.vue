<template>
  <div class="home-root transition-colors duration-300"
       :class="isDarkMode ? 'bg-slate-900' : 'bg-white'">

    <!-- 左：全幅照片 -->
    <div class="home-photo">
      <img src="https://jatestrella.github.io/GeoPORT/20251022_YanzikouBarrierLakeProfile/banner.jpg"
           alt="燕子口峽谷"
           class="home-photo-img" />
      <!-- 右側陰影過渡 -->
      <div class="home-photo-fade"
           :class="isDarkMode ? 'home-photo-fade-dark' : 'home-photo-fade-light'"></div>
    </div>

    <!-- 右：文字內容 -->
    <div class="home-content transition-colors duration-150"
         :class="isDarkMode ? 'bg-slate-900' : 'bg-white'">
      <div class="home-content-inner">

        <!-- ① 系統名稱 -->
        <div class="home-block">
          <p class="home-eyebrow transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">
            National Science and Technology Council
          </p>
          <h1 class="home-title transition-colors duration-150"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">GeoPORTech</h1>
          <p class="home-subtitle transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
            山區公路防災預警系統
          </p>
          <!-- 狀態 -->
          <div class="flex items-center gap-5 mt-4">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>
              <span class="text-sm transition-colors duration-150"
                    :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">系統正常</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-brand animate-pulse flex-shrink-0"></span>
              <span class="text-sm transition-colors duration-150"
                    :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">即時監控</span>
            </div>
          </div>
        </div>

        <div class="home-rule transition-colors duration-150"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-100'"></div>

        <!-- ② 計畫緣由 -->
        <div class="home-block">
          <p class="home-label transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">計畫緣由</p>
          <p class="home-body transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">
            臺灣山區道路經常受颱風、豪雨與地震影響，邊坡崩塌與土石流災害頻傳，嚴重威脅交通運輸安全與居民生命財產。本研究團隊自
            <strong :class="isDarkMode ? 'text-slate-100' : 'text-gray-800'">第一期（2020–2023）</strong>
            建立道路邊坡災害事件資料庫，整合現地調查、即時監測與數值模擬，持續進入
            <strong :class="isDarkMode ? 'text-slate-100' : 'text-gray-800'">第二期（2024–2027）</strong>，
            開發智慧化監測平台實現主動防災管理。
          </p>
        </div>

        <div class="home-rule transition-colors duration-150"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-100'"></div>

        <!-- ③ 系統功能 -->
        <div class="home-block">
          <p class="home-label transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">系統功能</p>

          <div class="home-feature transition-colors duration-150"
               :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
            <span class="home-feat-n transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-700' : 'text-gray-200'">01</span>
            <div>
              <h2 class="home-feat-title transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-100' : 'text-gray-900'">災情資料搜集</h2>
              <p class="home-feat-body transition-colors duration-150"
                 :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
                整合現地調查、無人機正射影像、GIS 圖層與時序監測資料，建立系統化邊坡災害資料庫。
              </p>
            </div>
          </div>

          <div class="home-feature border-t transition-colors duration-150"
               :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
            <span class="home-feat-n transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-700' : 'text-gray-200'">02</span>
            <div>
              <h2 class="home-feat-title transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-100' : 'text-gray-900'">預警分析平台</h2>
              <p class="home-feat-body transition-colors duration-150"
                 :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
                即時監測微地動、雨量與強地動數據，結合歷史事件進行多維度預警分析。
              </p>
            </div>
          </div>
        </div>

        <!-- ④ 底部 -->
        <div class="mt-auto pt-5 flex items-center justify-between border-t transition-colors duration-150"
             :class="isDarkMode ? 'border-slate-800' : 'border-gray-100'">
          <a href="https://jatestrella.github.io/GeoPORT/"
             target="_blank" rel="noopener"
             class="flex items-center gap-1.5 text-sm transition-colors duration-150"
             :class="isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-800'">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            GeoPORT 公開報告
          </a>
          <button class="flex items-center gap-1.5 text-sm transition-colors duration-150"
                  :class="isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-800'"
                  @click="navigateTo('UserManagement')">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            使用者管理
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'Home',
  inject: ['isDarkMode'],
  methods: {
    navigateTo(routeName) {
      this.$router.push({ name: routeName })
    }
  }
}
</script>

<style scoped>
/* ── 整體：左右各半，不捲動 ──────────────── */
.home-root {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 33px);
  overflow: hidden;
}

/* ── 左側照片 ─────────────────────────────── */
.home-photo {
  position: relative;
  flex: 0 0 70%;
  overflow: hidden;
}

.home-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 40%;
  display: block;
}

/* 右側漸層遮罩，讓照片與文字自然銜接 */
.home-photo-fade {
  position: absolute;
  top: 0;
  right: 0;
  width: 120px;
  height: 100%;
  pointer-events: none;
}

.home-photo-fade-light {
  background: linear-gradient(to right, transparent, #ffffff);
}

.home-photo-fade-dark {
  background: linear-gradient(to right, transparent, #0f172a);
}

/* ── 右側文字 ─────────────────────────────── */
.home-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow-y: auto;
}

.home-content-inner {
  width: 100%;
  padding: 40px 36px 32px 24px;
  display: flex;
  flex-direction: column;
}

/* ── 區塊間距 ─────────────────────────────── */
.home-block {
  padding: 20px 0;
}

.home-rule {
  height: 1px;
  flex-shrink: 0;
}

/* ── 標題層級 ─────────────────────────────── */
.home-eyebrow {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.home-title {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 6px;
}

.home-subtitle {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
}

/* ── 段落標籤 ─────────────────────────────── */
.home-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

/* ── 正文 ─────────────────────────────────── */
.home-body {
  font-size: 14px;
  line-height: 1.85;
}

/* ── 功能模組 ─────────────────────────────── */
.home-feature {
  display: flex;
  gap: 14px;
  padding: 16px 0;
  align-items: flex-start;
}

.home-feat-n {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1;
  flex-shrink: 0;
  width: 36px;
  padding-top: 2px;
}

.home-feat-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 5px;
  line-height: 1.3;
}

.home-feat-body {
  font-size: 13px;
  line-height: 1.75;
}
</style>
