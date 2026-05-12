<template>
  <div class="min-h-full p-6 transition-colors duration-300"
       :class="isDarkMode ? 'bg-slate-900 text-white' : 'bg-surface-50 text-gray-900'">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-base font-semibold">使用者管理</h1>
        <p class="text-xs mt-0.5 transition-colors duration-300"
           :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
          共 {{ users.length }} 位使用者
        </p>
      </div>
      <button @click="showAddModal = true"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-medium transition-colors border border-brand bg-brand hover:bg-brand-700">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        新增使用者
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-3 py-2 rounded text-sm border"
         :class="isDarkMode ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200'">
      {{ error }}
    </div>

    <!-- Table -->
    <div class="rounded border overflow-hidden transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'">
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
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border transition-colors duration-150"
                      :class="user.is_active
                        ? (isDarkMode ? 'border-slate-600 text-slate-300 hover:border-slate-400' : 'border-gray-300 text-gray-600 hover:border-gray-500')
                        : (isDarkMode ? 'border-slate-600 text-slate-500 hover:border-slate-400' : 'border-gray-200 text-gray-400 hover:border-gray-400')">
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      :class="user.is_active ? 'bg-green-500' : 'bg-gray-400'"></span>
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
      <div class="w-88 rounded border p-5 transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'">
        <h2 class="text-sm font-semibold mb-4" :class="isDarkMode ? 'text-white' : 'text-gray-900'">新增使用者</h2>
        <div v-if="addError" class="mb-3 text-xs border px-3 py-2 rounded"
             :class="isDarkMode ? 'text-red-400 border-red-800 bg-red-900/20' : 'text-red-600 border-red-200 bg-red-50'">{{ addError }}</div>
        <div class="space-y-2.5">
          <input v-model="addForm.username" type="text" placeholder="帳號"
                 class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
          <input v-model="addForm.email" type="email" placeholder="Email"
                 class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
          <input v-model="addForm.display_name" type="text" placeholder="顯示名稱（選填）"
                 class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
          <input v-model="addForm.password" type="password" placeholder="密碼（至少 6 字元）"
                 class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                 :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
          <select v-model="addForm.role"
                  class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                  :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'">
            <option value="viewer">瀏覽者</option>
            <option value="editor">編輯者</option>
            <option value="admin">管理員</option>
          </select>
        </div>
        <!-- 重設密碼輸入（顯示於 resetPasswordTarget 時） -->
        <template v-if="resetPasswordTarget">
          <div class="mt-4 pt-4 border-t" :class="isDarkMode ? 'border-slate-700' : 'border-gray-100'">
            <p class="text-xs mb-2" :class="isDarkMode ? 'text-slate-400' : 'text-gray-500'">
              重設 <strong>{{ resetPasswordTarget.username }}</strong> 的密碼
            </p>
            <input v-model="resetPwdValue" type="password" placeholder="新密碼（至少 6 字元）"
                   class="w-full px-3 py-1.5 rounded border text-sm outline-none focus:border-brand transition-colors"
                   :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'" />
          </div>
        </template>
        <div class="flex gap-2 mt-4">
          <button @click="cancelModal"
                  class="flex-1 py-1.5 rounded border text-xs font-medium transition-colors"
                  :class="isDarkMode ? 'border-slate-600 text-slate-300 hover:border-slate-400' : 'border-gray-300 text-gray-600 hover:border-gray-500'">
            取消
          </button>
          <button v-if="!resetPasswordTarget" @click="createUser" :disabled="addLoading"
                  class="flex-1 py-1.5 rounded text-white text-xs font-medium transition-colors disabled:opacity-60 bg-brand border border-brand hover:bg-brand-700">
            {{ addLoading ? '建立中...' : '建立帳號' }}
          </button>
          <button v-else @click="submitResetPassword" :disabled="addLoading"
                  class="flex-1 py-1.5 rounded text-white text-xs font-medium transition-colors disabled:opacity-60 bg-brand border border-brand hover:bg-brand-700">
            {{ addLoading ? '更新中...' : '確認重設' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { authAPI } from '@/services/api.js'
import { alert as showAlert, success as showSuccess, error as showError } from '@/utils/simpleAlertService'

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
      addForm: { username: '', email: '', display_name: '', password: '', role: 'editor' },
      resetPasswordTarget: null,
      resetPwdValue: ''
    }
  },
  methods: {
    roleColor(role) { return ROLE_COLORS[role] || '#78716c' },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    },

    cancelModal() {
      this.showAddModal = false
      this.addError = ''
      this.resetPasswordTarget = null
      this.resetPwdValue = ''
      this.addForm = { username: '', email: '', display_name: '', password: '', role: 'editor' }
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
        await showError(err.response?.data?.message || '操作失敗', '操作失敗', this.isDarkMode)
      }
    },

    async updateRole(user, newRole) {
      try {
        await authAPI.updateUser(user.user_id, { role: newRole })
        user.role = newRole
      } catch (err) {
        await showError(err.response?.data?.message || '操作失敗', '操作失敗', this.isDarkMode)
      }
    },

    resetPasswordModal(user) {
      this.resetPasswordTarget = user
      this.resetPwdValue = ''
      this.addError = ''
      this.showAddModal = true
    },

    async submitResetPassword() {
      if (!this.resetPwdValue || this.resetPwdValue.length < 6) {
        this.addError = '密碼至少 6 個字元'; return
      }
      this.addLoading = true
      try {
        await authAPI.updateUser(this.resetPasswordTarget.user_id, { password: this.resetPwdValue })
        this.cancelModal()
        await showSuccess('密碼已更新', '完成', this.isDarkMode)
      } catch (err) {
        this.addError = err.response?.data?.message || '操作失敗'
      } finally {
        this.addLoading = false
      }
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
        await authAPI.createUser(this.addForm)
        this.cancelModal()
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
