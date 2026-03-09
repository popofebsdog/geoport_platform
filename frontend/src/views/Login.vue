<template>
  <div class="min-h-screen flex" :class="isDarkMode ? 'dark' : ''">

    <!-- Left panel — brand identity -->
    <div class="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-10"
         :style="{ background: isDarkMode
           ? 'linear-gradient(160deg, #0f2d47 0%, #153f62 100%)'
           : 'linear-gradient(160deg, #1e5c8a 0%, #153f62 100%)' }">

      <!-- Brand mark -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
        </div>
        <span class="text-white font-semibold tracking-wide text-sm">GeoPORTech</span>
      </div>

      <!-- Centre message -->
      <div>
        <h2 class="text-3xl font-bold text-white leading-snug mb-4">
          山區公路<br>防災預警系統
        </h2>
        <p class="text-brand-200 text-sm leading-relaxed max-w-xs">
          整合即時監測、災情資料搜集與地理空間分析，提供公路主管機關全面的防災決策支援。
        </p>

        <div class="mt-8 flex flex-col gap-3">
          <div v-for="item in features" :key="item.label" class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
              </svg>
            </div>
            <span class="text-brand-100 text-xs">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <p class="text-brand-300 text-xs">© {{ new Date().getFullYear() }} GeoPORTech — 版權所有</p>
    </div>

    <!-- Right panel — form -->
    <div class="flex-1 flex flex-col justify-center items-center px-6 py-12 transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-900' : 'bg-surface-50'">

      <!-- Mobile brand (hidden on lg+) -->
      <div class="lg:hidden mb-8 text-center">
        <div class="inline-flex items-center gap-2 mb-2">
          <div class="w-7 h-7 rounded-md flex items-center justify-center"
               :style="{ backgroundColor: '#1e5c8a' }">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
          </div>
          <span class="font-semibold text-sm" :class="isDarkMode ? 'text-white' : 'text-gray-900'">GeoPORTech</span>
        </div>
        <p class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-surface-500'">山區公路防災預警系統</p>
      </div>

      <div class="w-full max-w-sm">
        <!-- Heading -->
        <div class="mb-7">
          <h1 class="text-xl font-bold mb-1" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ activeTab === 'login' ? '登入帳號' : '建立帳號' }}
          </h1>
          <p class="text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-surface-500'">
            {{ activeTab === 'login' ? '請輸入您的帳號與密碼以繼續' : '填寫以下資訊以建立新帳號' }}
          </p>
        </div>

        <!-- Tab switcher -->
        <div class="flex gap-1 mb-6 p-1 rounded-lg w-fit"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-surface-100'">
          <button v-for="tab in ['login','register']" :key="tab"
                  @click="activeTab = tab"
                  class="px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
                  :class="activeTab === tab
                    ? 'bg-white text-brand shadow-sm'
                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-surface-500 hover:text-gray-700')">
            {{ tab === 'login' ? '登入' : '註冊' }}
          </button>
        </div>

        <!-- Error -->
        <div v-if="errorMsg"
             class="mb-5 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2"
             :class="isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'">
          <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ errorMsg }}
        </div>

        <!-- Login form -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-medium mb-1.5"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">帳號 / Email</label>
            <input v-model="form.username" type="text" required autocomplete="username"
                   placeholder="請輸入帳號或 Email"
                   class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                   :class="isDarkMode
                     ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                     : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">密碼</label>
            <input v-model="form.password" type="password" required autocomplete="current-password"
                   placeholder="請輸入密碼"
                   class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                   :class="isDarkMode
                     ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                     : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
          </div>
          <button type="submit" :disabled="loading"
                  class="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  :style="{ backgroundColor: loading ? '#3378b5' : '#1e5c8a' }"
                  @mouseover="e => !loading && (e.target.style.backgroundColor='#153f62')"
                  @mouseout="e => !loading && (e.target.style.backgroundColor='#1e5c8a')">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              登入中...
            </span>
            <span v-else>登入</span>
          </button>
        </form>

        <!-- Register form -->
        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1.5"
                     :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">帳號</label>
              <input v-model="regForm.username" type="text" required autocomplete="username"
                     placeholder="英數字、_  -"
                     class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                     :class="isDarkMode
                       ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                       : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5"
                     :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">顯示名稱（選填）</label>
              <input v-model="regForm.display_name" type="text" autocomplete="name"
                     placeholder="顯示名稱"
                     class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                     :class="isDarkMode
                       ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                       : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">Email</label>
            <input v-model="regForm.email" type="email" required autocomplete="email"
                   placeholder="example@domain.com"
                   class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                   :class="isDarkMode
                     ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                     : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5"
                   :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">密碼 <span class="font-normal text-surface-400">（至少 6 字元）</span></label>
            <input v-model="regForm.password" type="password" required autocomplete="new-password"
                   placeholder="至少 6 個字元"
                   class="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:ring-2"
                   :class="isDarkMode
                     ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400'
                     : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400 focus:ring-brand-300 focus:border-brand'" />
          </div>
          <button type="submit" :disabled="loading"
                  class="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  :style="{ backgroundColor: loading ? '#3378b5' : '#1e5c8a' }"
                  @mouseover="e => !loading && (e.target.style.backgroundColor='#153f62')"
                  @mouseout="e => !loading && (e.target.style.backgroundColor='#1e5c8a')">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              建立中...
            </span>
            <span v-else>建立帳號</span>
          </button>
        </form>

        <!-- Dark mode toggle -->
        <div class="mt-8 flex justify-center">
          <button @click="toggleDarkMode"
                  class="flex items-center gap-1.5 text-xs transition-colors"
                  :class="isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-surface-400 hover:text-surface-600'">
            <svg v-if="isDarkMode" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            {{ isDarkMode ? '淺色模式' : '深色模式' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { authAPI } from '@/services/api.js'

export default {
  name: 'Login',
  data() {
    return {
      activeTab: 'login',
      loading: false,
      errorMsg: '',
      form: { username: '', password: '' },
      regForm: { username: '', email: '', display_name: '', password: '' },
      isDarkMode: localStorage.getItem('darkMode') === 'true',
      features: [
        { label: '即時監測資料整合', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { label: '地理空間分析與視覺化', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
        { label: '告警事件追蹤管理', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
      ]
    }
  },
  methods: {
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('darkMode', this.isDarkMode)
    },

    async handleLogin() {
      this.errorMsg = ''
      this.loading = true
      try {
        const result = await authAPI.login({ username: this.form.username, password: this.form.password })
        if (result.success && result.token) {
          localStorage.setItem('authToken', result.token)
          localStorage.setItem('authUser', JSON.stringify(result.user))
          const redirect = this.$route.query.redirect || '/'
          this.$router.push(redirect)
        } else {
          this.errorMsg = result.message || '登入失敗，請確認帳號密碼'
        }
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.message || '登入失敗'
      } finally {
        this.loading = false
      }
    },

    async handleRegister() {
      this.errorMsg = ''
      if (this.regForm.password.length < 6) {
        this.errorMsg = '密碼至少需要 6 個字元'
        return
      }
      this.loading = true
      try {
        const result = await authAPI.register(this.regForm)
        if (result.success && result.token) {
          localStorage.setItem('authToken', result.token)
          localStorage.setItem('authUser', JSON.stringify(result.user))
          this.$router.push('/')
        } else {
          this.errorMsg = result.message || '註冊失敗'
        }
      } catch (err) {
        this.errorMsg = err.response?.data?.message || err.message || '註冊失敗'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
