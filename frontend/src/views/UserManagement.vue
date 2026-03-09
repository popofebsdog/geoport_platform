<template>
  <div class="min-h-full p-6 transition-colors duration-300"
       :class="isDarkMode ? 'bg-slate-900 text-white' : 'bg-surface-50 text-gray-900'">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">使用者管理</h1>
        <p class="text-sm mt-0.5 transition-colors duration-300"
           :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
          共 {{ users.length }} 位使用者
        </p>
      </div>
      <button @click="showAddModal = true"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style="background-color:#1e5c8a"
              @mouseover="e=>e.currentTarget.style.backgroundColor='#153f62'"
              @mouseout="e=>e.currentTarget.style.backgroundColor='#1e5c8a'">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        新增使用者
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
      {{ error }}
    </div>

    <!-- Table -->
    <div class="rounded-xl shadow overflow-hidden transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style="border-color:#1e5c8a;border-top-color:transparent"></div>
        <span class="ml-2 text-sm" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">載入中...</span>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b transition-colors duration-300"
              :class="isDarkMode ? 'border-slate-700 bg-slate-700/50' : 'border-surface-200 bg-surface-50'">
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">帳號</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">Email</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">顯示名稱</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">角色</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">狀態</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">最後登入</th>
            <th class="text-left px-4 py-3 font-medium" :class="isDarkMode ? 'text-slate-300' : 'text-gray-600'">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0">
            <td colspan="7" class="text-center py-12 text-sm"
                :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">
              尚無使用者資料
            </td>
          </tr>
          <tr v-for="user in users" :key="user.user_id"
              class="border-b transition-colors duration-300"
              :class="isDarkMode ? 'border-slate-700 hover:bg-slate-700/30' : 'border-surface-100 hover:bg-brand-light/30'">
            <!-- Username -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                     :style="{ backgroundColor: roleColor(user.role) }">
                  {{ (user.display_name || user.username).charAt(0).toUpperCase() }}
                </div>
                <span class="font-medium" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ user.username }}
                </span>
              </div>
            </td>
            <!-- Email -->
            <td class="px-4 py-3" :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
              {{ user.email }}
            </td>
            <!-- Display name -->
            <td class="px-4 py-3" :class="isDarkMode ? 'text-slate-300' : 'text-gray-700'">
              {{ user.display_name || '—' }}
            </td>
            <!-- Role -->
            <td class="px-4 py-3">
              <select :value="user.role"
                      @change="updateRole(user, $event.target.value)"
                      class="text-xs px-2 py-1 rounded border outline-none cursor-pointer transition-colors"
                      :class="isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-slate-200'
                        : 'bg-white border-gray-300 text-gray-700'">
                <option value="admin">管理員</option>
                <option value="editor">編輯者</option>
                <option value="viewer">瀏覽者</option>
              </select>
            </td>
            <!-- Active -->
            <td class="px-4 py-3">
              <button @click="toggleActive(user)"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      :class="user.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'">
                <span class="w-1.5 h-1.5 rounded-full"
                      :class="user.is_active ? 'bg-green-500' : 'bg-red-500'"></span>
                {{ user.is_active ? '啟用' : '停用' }}
              </button>
            </td>
            <!-- Last login -->
            <td class="px-4 py-3 text-xs" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
              {{ user.last_login_at ? formatDate(user.last_login_at) : '從未登入' }}
            </td>
            <!-- Actions -->
            <td class="px-4 py-3">
              <button @click="resetPasswordModal(user)"
                      class="text-xs px-2.5 py-1 rounded-md border transition-colors font-medium"
                      :class="isDarkMode
                        ? 'border-brand-700 text-brand-300 hover:border-brand-500 hover:text-brand-200'
                        : 'border-brand-200 text-brand hover:border-brand hover:bg-brand-light'">
                重設密碼
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add user modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-96 rounded-xl shadow-2xl p-6 transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'">
        <h2 class="text-lg font-semibold mb-4">新增使用者</h2>
        <div v-if="addError" class="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{{ addError }}</div>
        <div class="space-y-3">
          <input v-model="addForm.username" type="text" placeholder="帳號"
                 class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400'" />
          <input v-model="addForm.email" type="email" placeholder="Email"
                 class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400'" />
          <input v-model="addForm.display_name" type="text" placeholder="顯示名稱（選填）"
                 class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400'" />
          <input v-model="addForm.password" type="password" placeholder="密碼（至少 6 字元）"
                 class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-surface-300 text-gray-900 placeholder-surface-400'" />
          <select v-model="addForm.role"
                  class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand"
                  :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-surface-300 text-gray-900'">
            <option value="viewer">瀏覽者</option>
            <option value="editor">編輯者</option>
            <option value="admin">管理員</option>
          </select>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="showAddModal = false; addError = ''"
                  class="flex-1 py-2 rounded-lg border text-sm transition-colors font-medium"
                  :class="isDarkMode ? 'border-slate-600 text-slate-300 hover:border-slate-400' : 'border-surface-300 text-surface-600 hover:border-surface-400'">
            取消
          </button>
          <button @click="createUser" :disabled="addLoading"
                  class="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
                  style="background-color:#1e5c8a"
                  @mouseover="e=>!addLoading&&(e.currentTarget.style.backgroundColor='#153f62')"
                  @mouseout="e=>e.currentTarget.style.backgroundColor='#1e5c8a'">
            {{ addLoading ? '建立中...' : '建立帳號' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { authAPI } from '@/services/api.js'

const ROLE_COLORS = { admin: '#153f62', editor: '#1e5c8a', viewer: '#78716c' }

export default {
  name: 'UserManagement',
  props: { isDarkMode: Boolean },
  data() {
    return {
      users: [],
      loading: false,
      error: '',
      showAddModal: false,
      addLoading: false,
      addError: '',
      addForm: { username: '', email: '', display_name: '', password: '', role: 'editor' }
    }
  },
  methods: {
    roleColor(role) { return ROLE_COLORS[role] || 'bg-slate-500' },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    },

    async fetchUsers() {
      this.loading = true
      this.error = ''
      try {
        const result = await authAPI.getUsers()
        this.users = result.users || []
      } catch (err) {
        this.error = err.response?.data?.message || '無法載入使用者列表'
      } finally {
        this.loading = false
      }
    },

    async toggleActive(user) {
      try {
        await authAPI.updateUser(user.user_id, { is_active: !user.is_active })
        user.is_active = !user.is_active
      } catch (err) {
        alert(err.response?.data?.message || '操作失敗')
      }
    },

    async updateRole(user, newRole) {
      try {
        await authAPI.updateUser(user.user_id, { role: newRole })
        user.role = newRole
      } catch (err) {
        alert(err.response?.data?.message || '操作失敗')
      }
    },

    resetPasswordModal(user) {
      const newPwd = prompt(`重設 ${user.username} 的密碼（輸入新密碼）:`)
      if (!newPwd || newPwd.length < 6) { if (newPwd !== null) alert('密碼至少 6 個字元'); return }
      authAPI.updateUser(user.user_id, { password: newPwd })
        .then(() => alert('密碼已更新'))
        .catch(err => alert(err.response?.data?.message || '操作失敗'))
    },

    async createUser() {
      this.addError = ''
      if (!this.addForm.username || !this.addForm.email || !this.addForm.password) {
        this.addError = '請填寫帳號、Email 與密碼'; return
      }
      if (this.addForm.password.length < 6) {
        this.addError = '密碼至少 6 個字元'; return
      }
      this.addLoading = true
      try {
        await authAPI.register(this.addForm)
        await authAPI.updateUser
        this.showAddModal = false
        this.addForm = { username: '', email: '', display_name: '', password: '', role: 'editor' }
        await this.fetchUsers()
      } catch (err) {
        this.addError = err.response?.data?.message || '建立失敗'
      } finally {
        this.addLoading = false
      }
    }
  },
  mounted() {
    this.fetchUsers()
  }
}
</script>
