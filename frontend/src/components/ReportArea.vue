<template>
  <div>
    <!-- 空狀態 -->
    <div v-if="filteredReports.length === 0" 
         class="text-center py-12">
      <svg class="mx-auto h-12 w-12 transition-colors duration-300"
           :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium transition-colors duration-300"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
        {{ showBookmarkedOnly ? '已標記報告是空的' : '報告清單是空的' }}
      </h3>
      <p class="mt-1 text-sm transition-colors duration-300"
         :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'">
        {{ showBookmarkedOnly ? '目前沒有已標記的報告' : '點擊「新增報告」按鈕來創建第一個報告' }}
      </p>
    </div>

    <!-- 網格視圖 -->
    <div v-else-if="viewMode === 'grid'" 
         class="p-6 transition-all duration-300">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div 
          v-for="report in filteredReports" 
          :key="report.reportId"
          class="group cursor-pointer transition-all duration-300"
        >
          <div class="rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 group-hover:border-blue-300"
               :class="isDarkMode ? 
                     'bg-slate-800 border-slate-700 group-hover:border-blue-500' : 
                     'bg-white border-gray-200 group-hover:border-blue-300'">
            <div class="p-6 relative min-h-[200px]">
              <!-- 右上角操作按鈕 -->
              <div class="absolute top-3 right-3 flex items-center space-x-1">
                <!-- 標記按鈕 -->
                <button @click.stop="toggleBookmark(report)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          (report.isBookmarked ? 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-700' : 'text-gray-400 hover:text-yellow-300 hover:bg-slate-700') : 
                          (report.isBookmarked ? 'text-yellow-500 hover:text-yellow-600 hover:bg-gray-100' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100')"
                        :title="report.isBookmarked ? '取消標記' : '標記報告'">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                </button>
                
                <!-- 編輯按鈕 -->
                <button @click.stop="editReport(report)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-400 hover:text-blue-300 hover:bg-slate-700' : 
                          'text-gray-400 hover:text-blue-500 hover:bg-gray-100'"
                        title="編輯報告">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                
                <!-- 刪除按鈕 -->
                <button @click.stop="deleteReport(report)"
                        class="p-1.5 rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-400 hover:text-red-300 hover:bg-slate-700' : 
                          'text-gray-400 hover:text-red-500 hover:bg-gray-100'"
                        title="刪除報告">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>

              <!-- 報告圖標 -->
              <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                   :class="getReportIconClass(report.fileType)">
                <span class="text-lg font-bold transition-colors duration-300"
                      :class="getReportIconTextClass(report.fileType)">
                  {{ getReportIconText(report.fileType) }}
                </span>
              </div>

              <!-- 報告標題 -->
              <h3 class="text-lg font-semibold mb-2 transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                {{ report.title }}
              </h3>

              <!-- 報告描述 -->
              <p class="text-sm mb-4 line-clamp-2 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
                {{ report.description || '無描述' }}
              </p>

              <!-- 報告資訊 -->
              <div class="space-y-2">
                <div class="flex items-center text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  <span class="font-medium mr-2">檔案類型:</span>
                  <span>{{ report.fileType.toUpperCase() }}</span>
                </div>
                <div class="flex items-center text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  <span class="font-medium mr-2">創建時間:</span>
                  <span>{{ formatDateTime(report.createdAt) }}</span>
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
              報告標題
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 w-1/6"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'">
              檔案類型
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
          <tr v-for="report in filteredReports" :key="report.reportId"
              class="transition-colors duration-300 hover:bg-opacity-50"
              :class="isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'">
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium transition-colors duration-300"
                     :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ report.title }}
                </div>
                <div class="text-sm transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  {{ report.description || '無描述' }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
              {{ report.fileType.toUpperCase() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'">
              {{ formatDateTime(report.createdAt) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-3">
                <button @click="toggleBookmark(report)"
                        class="transition-colors duration-300"
                        :class="isDarkMode ? 
                          (report.isBookmarked ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-300') : 
                          (report.isBookmarked ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500')"
                        :title="report.isBookmarked ? '取消標記' : '標記報告'">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                  </svg>
                </button>
                <button @click="editReport(report)"
                        class="text-blue-600 hover:text-blue-900 transition-colors duration-300"
                        :class="isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-900'">
                  編輯
                </button>
                <button @click="deleteReport(report)"
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
  name: 'ReportArea',
  props: {
    filteredReports: {
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
    // 格式化日期時間
    formatDateTime(dateTime) {
      if (!dateTime) return '無'
      return dayjs(dateTime).format('YYYY-MM-DD HH:mm')
    },

    // 獲取報告圖標樣式
    getReportIconClass(fileType) {
      switch (fileType) {
        case 'pdf':
          return 'bg-red-100 dark:bg-red-900'
        case 'url':
          return 'bg-blue-100 dark:bg-blue-900'
        default:
          return 'bg-gray-100 dark:bg-gray-900'
      }
    },

    // 獲取報告圖標文字樣式
    getReportIconTextClass(fileType) {
      switch (fileType) {
        case 'pdf':
          return 'text-red-600 dark:text-red-300'
        case 'url':
          return 'text-blue-600 dark:text-blue-300'
        default:
          return 'text-gray-600 dark:text-gray-300'
      }
    },

    // 獲取報告圖標文字
    getReportIconText(fileType) {
      switch (fileType) {
        case 'pdf':
          return 'PDF'
        case 'url':
          return 'URL'
        default:
          return '報'
      }
    },

    // 切換書籤狀態
    async toggleBookmark(report) {
      this.$emit('toggle-bookmark', report)
    },

    // 編輯報告
    editReport(report) {
      this.$emit('edit-report', report)
    },

    // 刪除報告
    async deleteReport(report) {
      this.$emit('delete-report', report)
    }
  }
}
</script>
