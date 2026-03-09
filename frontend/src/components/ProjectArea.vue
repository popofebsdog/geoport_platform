<template>
  <div>
    <!-- 空狀態 -->
    <div v-if="filteredProjects.length === 0" 
         class="text-center py-12">
      <svg class="mx-auto h-12 w-12 transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium transition-colors duration-300"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
        {{ showBookmarkedOnly ? '已標記專案是空的' : '專案清單是空的' }}
      </h3>
      <p class="mt-1 text-sm transition-colors duration-300"
         :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
        {{ showBookmarkedOnly ? '目前沒有已標記的專案' : '點擊「新增專案」按鈕來創建第一個專案' }}
      </p>
    </div>

    <!-- 網格視圖 -->
    <div v-else-if="viewMode === 'grid'" 
         class="p-6 transition-all duration-300">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="project in filteredProjects" 
          :key="project.projectId"
          class="group cursor-pointer transition-all duration-300"
          @click="handleProjectClick(project)"
        >
          <div class="rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 group-hover:border-blue-300"
               :class="isDarkMode ? 
                     'bg-slate-800 border-slate-700 group-hover:border-blue-500' : 
                     'bg-white border-gray-200 group-hover:border-blue-300'">
            <div class="p-6 relative min-h-[200px]">
              <!-- 右上角操作按鈕 -->
              <div class="absolute top-3 right-3 flex items-center space-x-1">
                <!-- 標記按鈕 -->
                <button @click.stop="toggleBookmark(project)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          (project.isBookmarked ? 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-700' : 'text-gray-400 hover:text-yellow-300 hover:bg-slate-700') : 
                          (project.isBookmarked ? 'text-yellow-500 hover:text-yellow-600 hover:bg-gray-100' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100')"
                        :title="project.isBookmarked ? '取消標記' : '標記專案'">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                </button>
                
                <!-- 編輯按鈕 -->
                <button @click.stop="editProject(project)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-400 hover:text-blue-300 hover:bg-slate-700' : 
                          'text-gray-400 hover:text-blue-500 hover:bg-gray-100'"
                        title="編輯專案">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                
                <!-- 刪除按鈕 -->
                <button @click.stop="deleteProject(project)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-400 hover:text-red-300 hover:bg-slate-700' : 
                          'text-gray-400 hover:text-red-500 hover:bg-gray-100'"
                        title="刪除專案">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>

              <!-- 專案圖標 -->
              <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                   :class="getProjectIconClass(project.roadType)">
                <span class="text-lg font-bold transition-colors duration-300"
                      :class="getProjectIconTextClass(project.roadType)">
                  {{ getProjectIconText(project.roadType) }}
                </span>
              </div>

              <!-- 專案名稱 -->
              <h3 class="text-lg font-semibold mb-2 transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ project.name }}
              </h3>

              <!-- 專案描述 -->
              <p class="text-sm mb-4 line-clamp-2 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
                {{ project.description || '無描述' }}
              </p>

              <!-- 專案資訊 -->
              <div class="space-y-2">
                <div class="flex items-center text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  <span class="font-medium mr-2">道路編號:</span>
                  <span>{{ project.roadNumber || '無' }}</span>
                </div>
                <div class="flex items-center text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  <span class="font-medium mr-2">創建時間:</span>
                  <span>{{ formatDateTime(project.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表視圖 -->
    <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
      <table class="min-w-full divide-y transition-colors duration-300"
             :class="isDarkMode ? 'divide-slate-700' : 'divide-gray-200'">
        <thead class="transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-50'">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-2/5"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
              專案名稱
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
              道路編號
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
              創建時間
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-900 divide-slate-700' : 'bg-white divide-gray-200'">
          <tr v-for="project in filteredProjects" :key="project.projectId"
              class="transition-colors duration-300 hover:bg-opacity-50 cursor-pointer"
              :class="isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'"
              @click="handleProjectClick(project)">
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium transition-colors duration-300"
                     :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ project.name }}
                </div>
                <div class="text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  {{ project.description || '無描述' }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
              {{ project.roadNumber || '無' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
              {{ formatDateTime(project.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-3">
                <button @click="toggleBookmark(project)"
                        class="transition-colors duration-300"
                        :class="isDarkMode ? 
                          (project.isBookmarked ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-300') : 
                          (project.isBookmarked ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500')"
                        :title="project.isBookmarked ? '取消標記' : '標記專案'">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                </button>
                <button @click="editProject(project)"
                        class="text-blue-600 hover:text-blue-900 transition-colors duration-300"
                        :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                  編輯
                </button>
                <button @click="deleteProject(project)"
                        class="text-red-600 hover:text-red-900 transition-colors duration-300"
                        :class="isDarkMode ? 'hover:text-red-400' : 'hover:text-red-900'">
                  刪除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  name: 'ProjectArea',
  props: {
    filteredProjects: {
      type: Array,
      default: () => []
    },
    viewMode: {
      type: String,
      default: 'grid'
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    showBookmarkedOnly: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    // 處理專案點擊事件
    handleProjectClick(project) {
      this.$emit('project-clicked', project)
    },
    
    // 格式化日期時間
    formatDateTime(dateTime) {
      if (!dateTime) return '無'
      return dayjs(dateTime).format('YYYY-MM-DD HH:mm')
    },

    // 獲取專案圖標樣式
    getProjectIconClass(roadType) {
      switch (roadType) {
        case 'highway':
          return 'bg-green-100 dark:bg-green-900'
        case 'national':
          return 'bg-blue-100 dark:bg-blue-900'
        case 'railway':
          return 'bg-purple-100 dark:bg-purple-900'
        default:
          return 'bg-gray-100 dark:bg-gray-900'
      }
    },

    // 獲取專案圖標文字樣式
    getProjectIconTextClass(roadType) {
      switch (roadType) {
        case 'highway':
          return 'text-green-600 dark:text-green-300'
        case 'national':
          return 'text-blue-600 dark:text-blue-300'
        case 'railway':
          return 'text-purple-600 dark:text-purple-300'
        default:
          return 'text-gray-600 dark:text-gray-300'
      }
    },

    // 獲取專案圖標文字
    getProjectIconText(roadType) {
      switch (roadType) {
        case 'highway':
          return '公'
        case 'national':
          return '國'
        case 'railway':
          return '鐵'
        default:
          return '專'
      }
    },

    // 切換書籤狀態
    async toggleBookmark(project) {
      this.$emit('toggle-bookmark', project)
    },

    // 編輯專案
    editProject(project) {
      this.$emit('edit-project', project)
    },

    // 刪除專案
    async deleteProject(project) {
      this.$emit('delete-project', project)
    }
  }
}
</script>
