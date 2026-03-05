<template>
  <div>
    <!-- 已刪除專案 -->
    <div v-if="contentType === 'projects'">
      <div v-if="trashProjects.length === 0" 
           class="text-center py-12">
        <svg class="mx-auto h-12 w-12 transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium transition-colors duration-300"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">已刪除專案是空的</h3>
        <p class="mt-1 text-sm transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">已刪除的專案會出現在這裡</p>
      </div>
      
      <div v-else>
        <!-- 網格視圖 -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          <div v-for="project in trashProjects" :key="project.projectId"
               class="relative p-6 rounded-lg border transition-colors duration-300 hover:shadow-lg"
               :class="isDarkMode ? 
                 'bg-slate-800 border-slate-700 hover:border-slate-600' : 
                 'bg-white border-gray-200 hover:border-gray-300'">
            
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
            
            <!-- 刪除時間 -->
            <div class="absolute bottom-3 right-3 text-xs transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
              刪除於 {{ formatDateTime(project.deletedAt) }}
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex items-center justify-end space-x-3 mt-4">
              <button @click="restoreProject(project)"
                      class="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 transition-colors duration-300"
                      :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                還原
              </button>
              <button @click="permanentDeleteProject(project)"
                      class="px-3 py-1 text-sm text-red-600 hover:text-red-900 transition-colors duration-300"
                      :class="isDarkMode ? 'hover:text-red-400' : 'hover:text-red-900'">
                永久刪除
              </button>
            </div>
          </div>
        </div>
        
        <!-- 列表視圖 -->
        <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
          <table class="min-w-full divide-y transition-colors duration-300"
                 :class="isDarkMode ? 'divide-slate-700' : 'divide-gray-200'">
            <thead class="transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-50'">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/4"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  專案名稱
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/3"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  描述
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  刪除時間
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-900 divide-slate-700' : 'bg-white divide-gray-200'">
              <tr v-for="project in trashProjects" :key="project.projectId"
                  class="transition-colors duration-300 hover:bg-opacity-50"
                  :class="isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                      {{ project.name }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ project.description || '無描述' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ formatDateTime(project.deletedAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-3">
                    <button @click="restoreProject(project)"
                            class="text-blue-600 hover:text-blue-900 transition-colors duration-300"
                            :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                      還原
                    </button>
                    <button @click="permanentDeleteProject(project)"
                            class="text-red-600 hover:text-red-900 transition-colors duration-300"
                            :class="isDarkMode ? 'hover:text-red-400' : 'hover:text-red-900'">
                      永久刪除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 已刪除資料 -->
    <div v-else-if="contentType === 'data'">
      <div v-if="trashData.length === 0" 
           class="text-center py-12">
        <svg class="mx-auto h-12 w-12 transition-colors duration-300"
             :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2-2z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium transition-colors duration-300"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">已刪除資料是空的</h3>
        <p class="mt-1 text-sm transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">已刪除的資料會出現在這裡</p>
      </div>
      
      <div v-else>
        <!-- 網格視圖 -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
          <div v-for="data in trashData" :key="data.id"
               class="relative p-6 rounded-lg border transition-colors duration-300 hover:shadow-lg"
               :class="isDarkMode ? 
                 'bg-slate-800 border-slate-700 hover:border-slate-600' : 
                 'bg-white border-gray-200 hover:border-gray-300'">
            
            <!-- 資料圖標 -->
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                 :class="getDataIconClass(data.type)">
              <span class="text-lg font-bold transition-colors duration-300"
                    :class="getDataIconTextClass(data.type)">
                {{ getDataIconText(data.type) }}
              </span>
            </div>
            
            <!-- 資料名稱 -->
            <h3 class="text-lg font-semibold mb-2 transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              {{ data.name }}
            </h3>
            
            <!-- 資料描述 -->
            <p class="text-sm mb-4 line-clamp-2 transition-colors duration-300"
               :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
              {{ data.description || '無描述' }}
            </p>
            
            <!-- 資料資訊 -->
            <div class="space-y-2 mb-6">
              <div class="flex items-center text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                <span class="font-medium mr-2">類型:</span>
                <span>{{ data.type }}</span>
              </div>
              <div class="flex items-center text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                <span class="font-medium mr-2">大小:</span>
                <span>{{ data.size }}</span>
              </div>
              <div class="flex items-center text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                <span class="font-medium mr-2">來源:</span>
                <span>{{ data.originalProject }}</span>
              </div>
            </div>
            
            <!-- 刪除時間 -->
            <div class="absolute bottom-3 right-3 text-xs transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
              刪除於 {{ formatDateTime(data.deletedAt) }}
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex items-center justify-end space-x-3 mt-4">
              <button @click="restoreData(data)"
                      class="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 transition-colors duration-300"
                      :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                還原
              </button>
              <button @click="permanentDeleteData(data)"
                      class="px-3 py-1 text-sm text-red-600 hover:text-red-900 transition-colors duration-300"
                      :class="isDarkMode ? 'hover:text-red-400' : 'hover:text-red-900'">
                永久刪除
              </button>
            </div>
          </div>
        </div>
        
        <!-- 列表視圖 -->
        <div v-else-if="viewMode === 'list'" class="overflow-x-auto">
          <table class="min-w-full divide-y transition-colors duration-300"
                 :class="isDarkMode ? 'divide-slate-700' : 'divide-gray-200'">
            <thead class="transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-50'">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/4"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  資料名稱
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/12"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  類型
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/12"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  大小
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  來源專案
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  刪除時間
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-900 divide-slate-700' : 'bg-white divide-gray-200'">
              <tr v-for="data in trashData" :key="data.id"
                  class="transition-colors duration-300 hover:bg-opacity-50"
                  :class="isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium transition-colors duration-300"
                         :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                      {{ data.name }}
                    </div>
                    <div class="text-sm transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                      {{ data.description || '無描述' }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ data.type }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ data.size }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ data.originalProject }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
                  {{ formatDateTime(data.deletedAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-3">
                    <button @click="restoreData(data)"
                            class="text-blue-600 hover:text-blue-900 transition-colors duration-300"
                            :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                      還原
                    </button>
                    <button @click="permanentDeleteData(data)"
                            class="text-red-600 hover:text-red-900 transition-colors duration-300"
                            :class="isDarkMode ? 'hover:text-red-400' : 'hover:text-red-900'">
                      永久刪除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  name: 'TrashArea',
  props: {
    contentType: {
      type: String,
      default: 'projects' // 'projects' 或 'data'
    },
    trashProjects: {
      type: Array,
      default: () => []
    },
    trashData: {
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
    }
  },
  methods: {
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

    // 獲取資料圖標樣式
    getDataIconClass(type) {
      switch (type) {
        case 'raster':
          return 'bg-green-100 dark:bg-green-900'
        case 'vector':
          return 'bg-blue-100 dark:bg-blue-900'
        case 'csv':
          return 'bg-yellow-100 dark:bg-yellow-900'
        case 'lidar':
          return 'bg-purple-100 dark:bg-purple-900'
        default:
          return 'bg-gray-100 dark:bg-gray-900'
      }
    },

    // 獲取資料圖標文字樣式
    getDataIconTextClass(type) {
      switch (type) {
        case 'raster':
          return 'text-green-600 dark:text-green-300'
        case 'vector':
          return 'text-blue-600 dark:text-blue-300'
        case 'csv':
          return 'text-yellow-600 dark:text-yellow-300'
        case 'lidar':
          return 'text-purple-600 dark:text-purple-300'
        default:
          return 'text-gray-600 dark:text-gray-300'
      }
    },

    // 獲取資料圖標文字
    getDataIconText(type) {
      switch (type) {
        case 'raster':
          return '柵'
        case 'vector':
          return '矢'
        case 'csv':
          return 'CSV'
        case 'lidar':
          return 'LID'
        default:
          return '資'
      }
    },

    // 還原專案
    async restoreProject(project) {
      this.$emit('restore-project', project)
    },

    // 永久刪除專案
    async permanentDeleteProject(project) {
      this.$emit('permanent-delete-project', project)
    },

    // 還原資料
    async restoreData(data) {
      this.$emit('restore-data', data)
    },

    // 永久刪除資料
    async permanentDeleteData(data) {
      this.$emit('permanent-delete-data', data)
    }
  }
}
</script>
