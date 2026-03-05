<template>
  <div class="h-full flex flex-col transition-colors duration-300" :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'">
    
    <!-- 標題欄 -->
    <div class="px-6 py-4 border-b transition-colors duration-300"
         :class="isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold transition-colors duration-300"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            📊 災情資料搜集
          </h1>
          <span class="text-sm transition-colors duration-300"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
            Data Collection
          </span>
        </div>
        
        <div class="flex items-center space-x-3 h-10">
          <!-- 新增按鈕 - 根據當前模式顯示不同按鈕 -->
          <button v-if="!showTrash && !showReports" @click="showCreateParentModal = true"
                  class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 shadow-sm">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
            </svg>
            新增地點
          </button>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左側邊欄 -->
      <div class="w-64 border-r transition-colors duration-300"
           :class="isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'">
        <div class="p-4">
          <h3 class="text-sm font-medium mb-4 transition-colors duration-300"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">GeoPort專案</h3>
          
          <!-- 專案分類 -->
          <div class="space-y-2">
            <button @click="showProjectList" class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      (!showReports && !showTrash && !showBookmarkedOnly && !showBookmarkedReportsOnly ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-700') : 
                      (!showReports && !showTrash && !showBookmarkedOnly && !showBookmarkedReportsOnly ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100')">
              <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
              </svg>
              專案清單
              <span v-if="parentProjects.length > 0" 
                    class="ml-auto px-2 py-1 text-xs rounded-full transition-colors duration-300"
                    :class="isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'">
                {{ parentProjects.length }}
              </span>
            </button>
            <button @click="showBookmarkedProjects" class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      (showBookmarkedOnly ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-700') : 
                      (showBookmarkedOnly ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100')">
              <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
              </svg>
              已標記專案
              <span v-if="bookmarkedProjectsCount > 0" 
                    class="ml-auto px-2 py-1 text-xs rounded-full transition-colors duration-300"
                    :class="isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-600'">
                {{ bookmarkedProjectsCount }}
              </span>
            </button>
          </div>
          
          <!-- 分隔線 -->
          <div class="my-4 h-px transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-200'"></div>
          
          <!-- GeoPort報告分類 -->
          <h3 class="text-sm font-medium mb-4 transition-colors duration-300"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">GeoPort報告</h3>
          
          <div class="space-y-2">
            <button @click="toggleReports"
                    class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      (showReports ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-700') : 
                      (showReports ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100')">
              <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              GeoPort 報告
            </button>
          </div>
          
          <!-- 分隔線 -->
          <div class="my-4 h-px transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-200'"></div>
          
          <!-- 垃圾桶分類 -->
          <h3 class="text-sm font-medium mb-4 transition-colors duration-300"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">垃圾桶</h3>
          
          <div class="space-y-2">
            <button @click="toggleTrashContent('projects')"
                    class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-300"
                      :class="(showTrash && showTrashContent === 'projects') ? 
                      (isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900') :
                      (isDarkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100')">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              已刪除專案
                <span v-if="trashProjects.length > 0" 
                      class="ml-auto px-2 py-1 text-xs rounded-full transition-colors duration-300"
                      :class="isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'">
                  {{ trashProjects.length }}
                </span>
              </button>
            <button @click="toggleTrashContent('data')"
                      class="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-300"
                      :class="(showTrash && showTrashContent === 'data') ? 
                      (isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900') :
                      (isDarkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100')">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2-2z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
                </svg>
              已刪除資料
                <span v-if="trashData.length > 0" 
                      class="ml-auto px-2 py-1 text-xs rounded-full transition-colors duration-300"
                      :class="isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'">
                  {{ trashData.length }}
                </span>
              </button>
          </div>
        </div>
      </div>
      
      <!-- 右側主要內容區域 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 工具欄 -->
        <div v-if="!showReports" class="px-6 py-3 border-b transition-colors duration-300 relative"
             :class="isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <span class="text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                <span v-if="showTrash && showTrashContent === 'projects'">垃圾桶 - 已刪除專案 ({{ trashProjects.length }} 個)</span>
                <span v-else-if="showTrash && showTrashContent === 'data'">垃圾桶 - 已刪除資料 ({{ trashData.length }} 個)</span>
                <span v-else-if="showReports">&nbsp;</span>
                <span v-else>共 {{ filteredParentProjects.length }} 個地點專案</span>
              </span>
            </div>
            
            <!-- 所有按鈕置右 -->
            <div v-if="!showReports" class="flex items-center space-x-2">
              <button v-if="!showTrash" class="p-2 rounded-lg transition-colors duration-300"
                      :class="viewMode === 'map' ? 
                        (isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-900') : 
                        (isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100')"
                      @click="viewMode = 'map'"
                      title="地圖視圖">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                </svg>
              </button>
              
              <!-- 分隔線 -->
              <div class="h-6 w-px transition-colors duration-300"
                   :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-300'"></div>
              
              <!-- 搜尋按鈕 -->
              <button @click="toggleSearchPanel"
                      class="p-2 rounded-lg transition-colors duration-300 relative"
                      :class="isDarkMode ? 
                        'text-gray-400 hover:text-white hover:bg-slate-700' : 
                        'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
                      :title="showSearchPanel ? '收起搜尋' : '展開搜尋'">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <!-- 搜尋狀態指示器 -->
                <div v-if="searchQuery" class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              </button>
              
              <!-- 篩選按鈕 -->
              <button @click="toggleFilterPanel"
                      class="p-2 rounded-lg transition-colors duration-300 relative"
                      :class="isDarkMode ? 
                        'text-gray-400 hover:text-white hover:bg-slate-700' : 
                        'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
                      :title="showFilterPanel ? '收起篩選' : '展開篩選'">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
                <!-- 篩選狀態指示器 -->
                <div v-if="hasActiveFilters" class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              </button>
          </div>
        </div>
        
          <!-- 搜尋面板 -->
          <div v-if="showSearchPanel && !showReports" 
               class="absolute top-full left-0 right-0 shadow-lg z-[1150] p-4 transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'">
            <div class="flex items-center space-x-3">
              <div class="relative flex-1">
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜尋專案名稱或描述..."
                  class="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                    :class="isDarkMode ? 
                      'bg-slate-700 border-slate-600 text-white placeholder-gray-400' :
                      'bg-white border-gray-300 text-gray-900 placeholder-gray-500'">
                  <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <svg class="h-4 w-4 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                </div>
                <button @click="clearSearch"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                          'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
                  清除
                </button>
                <button @click="applySearch"
                      class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300"
                      :class="isDarkMode ? 
                        'text-white bg-blue-600 hover:bg-blue-700' : 
                        'text-white bg-blue-600 hover:bg-blue-700'">
                  搜尋
                </button>
            </div>
              </div>
              
          <!-- 篩選面板 -->
          <div v-if="showFilterPanel && !showReports" 
               class="absolute top-full left-0 right-0 shadow-lg z-[1150] p-4 transition-colors duration-300"
               :class="isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'">
            <div class="flex items-end space-x-4">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                <!-- 道路類型篩選 -->
                <div>
                <select v-model="filterRoadType"
                          @change="onRoadTypeChange"
                          class="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                        :class="isDarkMode ? 
                          'bg-slate-700 border-slate-600 text-white' : 
                          'bg-white border-gray-300 text-gray-900'">
                    <option value="">道路類型</option>
                  <option value="highway">公路</option>
                  <option value="national">國道</option>
                  <option value="railway">鐵路</option>
                </select>
                </div>
                
                <!-- 道路編號篩選 -->
                <div>
                <select v-model="filterHighway"
                          class="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                        :class="isDarkMode ? 
                          'bg-slate-700 border-slate-600 text-white' : 
                          'bg-white border-gray-300 text-gray-900'">
                    <option v-for="option in currentRoadNumberOptions" 
                            :key="option.value" 
                            :value="option.value">
                      {{ option.label }}
                  </option>
                </select>
                </div>
                
                <!-- 開始日期篩選 -->
                <div>
                  <DateInput
                  v-model="filterStartDate"
                    :is-dark-mode="isDarkMode"
                    placeholder="開始日期"
                  />
                </div>
                
                <!-- 結束日期篩選 -->
                <div>
                  <DateInput
                  v-model="filterEndDate"
                    :is-dark-mode="isDarkMode"
                    placeholder="結束日期"
                  />
                </div>
              </div>
                
              <!-- 篩選操作按鈕 -->
              <div class="flex items-center space-x-2">
                <button @click="clearFilters"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                          'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
                  清除
                </button>
                <button @click="applyFilters"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300"
                        :class="isDarkMode ? 
                          'text-white bg-blue-600 hover:bg-blue-700' : 
                          'text-white bg-blue-600 hover:bg-blue-700'">
                  篩選
                </button>
              </div>
            </div>
            </div>
          </div>
          
        <!-- 右側內容區域 -->
        <div class="flex-1 flex flex-col overflow-hidden transition-colors duration-300"
             :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'">
          
          <!-- 地圖視圖 -->
          <div v-if="viewMode === 'map'" 
               class="flex-1 transition-all duration-300 relative"
               :class="(showSearchPanel || showFilterPanel) ? 'pt-0' : 'pt-0'">
            
            <ProjectMap 
              ref="projectMapRef"
              :project="mockParentProjectForMap"
              :child-projects="showReports ? [] : getAllChildProjectsForMap()"
              :reports="showReports ? filteredReports : []"
              :is-dark-mode="isDarkMode"
              :highway-mileage-visible="highwayMileageVisible"
              :mileage-label-visible="mileageLabelVisible"
              @child-project-clicked="handleOpenChild"
              @toggle-highway-mileage="toggleHighwayMileage"
              @toggle-mileage-label="toggleMileageLabel"
              @map-ready="onMapReady" />
              
            <!-- 圖層操作面板 - 覆蓋在地圖上 -->
            <div class="absolute left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-300 shadow-xl z-[1100] transform transition-transform duration-300 ease-in-out"
                 :class="showLayerPanel ? 'translate-x-0' : '-translate-x-full'">
              <div class="p-4 h-full flex flex-col">
                <!-- 面板標題 -->
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">
                    專案詳情
                  </h3>
                  <button @click="closeLayerPanel"
                          class="p-1 rounded-lg hover:bg-gray-100 text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  
                <!-- 專案信息 -->
                <div v-if="selectedProject" class="flex-1 overflow-y-auto">
                  <!-- 專案基本信息 -->
                  <div class="mb-6">
                    <div class="flex items-center mb-3">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors duration-300"
                           :class="getProjectIconClass(selectedProject.roadType)">
                      <span class="text-sm font-bold transition-colors duration-300"
                              :class="getProjectIconTextClass(selectedProject.roadType)">
                          {{ getProjectIconText(selectedProject.roadType) }}
                    </span>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-gray-900">
                          {{ selectedProject.name }}
                        </h4>
                        <p class="text-sm text-gray-500">
                          {{ selectedProject.roadType === 'highway' ? '公路' : 
                              selectedProject.roadType === 'national' ? '國道' : 
                              selectedProject.roadType === 'railway' ? '鐵路' : '其他' }}
                          {{ selectedProject.roadNumber }}
                        </p>
              </div>
                  </div>
                  
                    <p class="text-sm text-gray-600 mb-4">
                      {{ selectedProject.description || '無描述' }}
                    </p>
                    
                    <!-- 專案詳情 -->
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-500">創建時間:</span>
                        <span class="text-gray-700">
                          {{ formatDateTime(selectedProject.createdAt) }}
                    </span>
                    </div>
                      <div class="flex justify-between">
                        <span class="text-gray-500">狀態:</span>
                        <span class="px-2 py-1 rounded-full text-xs font-medium"
                              :class="selectedProject.status === 'active' ? 
                                'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'">
                          {{ selectedProject.status === 'active' ? '進行中' : '已完成' }}
                    </span>
                  </div>
                      <div v-if="selectedProject.location" class="flex justify-between">
                        <span class="text-gray-500">座標:</span>
                        <span class="text-gray-700 text-xs">
                          {{ selectedProject.location.lat.toFixed(6) }}, {{ selectedProject.location.lng.toFixed(6) }}
                  </span>
            </div>
            </div>
          </div>
          
                  <!-- 圖層操作 -->
                  <div class="border-t border-gray-200 pt-4">
                    <h5 class="text-sm font-medium mb-3 text-gray-700">
                      圖層操作
                    </h5>
                    
                    <div class="space-y-2">
                      <!-- 標記/取消標記 -->
                      <button @click="toggleBookmark(selectedProject)"
                              class="w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-300"
                              :class="selectedProject.isBookmarked ? 
                                'bg-yellow-100 text-yellow-800' :
                                'hover:bg-gray-100 text-gray-700'">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                          </svg>
                        {{ selectedProject.isBookmarked ? '取消標記' : '標記專案' }}
                        </button>
                        
                      <!-- 編輯專案 -->
                      <button @click="editProject(selectedProject)"
                              class="w-full flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        編輯專案
                        </button>
                        
                      <!-- 刪除專案 -->
                      <button @click="deleteProject(selectedProject)"
                              class="w-full flex items-center px-3 py-2 rounded-lg hover:bg-red-100 text-red-700">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        刪除專案
                        </button>
                      </div>
                </div>
              </div>
            </div>
            </div>
          </div>
          
          <!-- GeoPort 報告網站 - 獨立容器 -->
          <div v-if="showReports" class="flex-1 flex flex-col" style="overflow: hidden;">
            <iframe 
              src="https://jatestrella.github.io/GeoPORT/?fbclid=IwAR1HgNyEuOEKwQAcMfk-3Fj6U1ONS3jmfA71PPJYVXlFTbLNsccdIlM-dGw"
              class="w-full h-full border-0"
              :class="isDarkMode ? 'bg-slate-900' : 'bg-white'"
              title="GeoPort 報告"
              loading="lazy"
            ></iframe>
          </div>
          
          <!-- 清單視圖 -->
          <div v-else class="flex-1 overflow-y-auto">
            <!-- 垃圾桶內容 -->
            <TrashArea 
              v-if="showTrash"
              :content-type="showTrashContent"
              :trash-projects="trashProjects"
              :trash-data="trashData"
              :view-mode="viewMode"
              :is-dark-mode="isDarkMode"
              @restore-project="restoreProject"
              @permanent-delete-project="permanentDeleteProject"
              @restore-data="restoreData"
              @permanent-delete-data="permanentDeleteData"
            />
            
            <!-- 專案清單 - 母子專案資料夾視圖 -->
            <div v-else class="flex-1 overflow-y-auto p-6">
              <!-- 載入中 -->
              <div v-if="!isDataLoaded" class="flex items-center justify-center h-64">
                <div class="flex flex-col items-center space-y-3">
                  <svg class="animate-spin h-10 w-10" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">載入中...</p>
                </div>
              </div>

              <!-- 空狀態 -->
              <div v-else-if="parentProjects.length === 0" 
                   class="flex flex-col items-center justify-center h-64">
                <svg class="w-24 h-24 mb-4 opacity-30" :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                </svg>
                <h3 class="text-xl font-semibold mb-2" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  尚無地點專案
                </h3>
                <p class="mb-4" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                  開始創建您的第一個地點專案
                </p>
                <button
                  @click="showCreateParentModal = true"
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300 shadow-sm font-medium"
                >
                  新增地點專案
                </button>
              </div>

              <!-- 專案列表 - 資料夾視圖 -->
              <div v-else class="space-y-4">
                <ParentProjectCard
                  v-for="parent in filteredParentProjects"
                  :key="parent.project_id"
                  :parent-project="parent"
                  :child-projects="getChildProjects(parent.project_id)"
                  :is-dark-mode="isDarkMode"
                  @add-child="handleAddChild"
                  @open="handleOpenParentProject"
                  @edit="handleEditParent"
                  @delete="handleDeleteParent"
                  @add-report-link="openReportLinkModal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 創建專案模態框 -->
    <div v-if="showCreateProjectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div class="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">新增專案</h2>
            <button @click="showCreateProjectModal = false"
                    class="p-2 rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      'hover:bg-slate-700 text-gray-300' : 
                      'hover:bg-gray-100 text-gray-600'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="createProject" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                專案名稱 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="newProject.name"
                type="text"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                :class="isDarkMode ? 
                  'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                  'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                placeholder="請輸入專案名稱..."
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                專案描述 <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="newProject.description"
                rows="3"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                :class="isDarkMode ? 
                  'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                  'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                placeholder="請描述專案的背景、目的、預期成果等..."
                required
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                地點（座標 WGS84） <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="newProject.location.lat"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="緯度 (Latitude)"
                  required
                />
                <input
                  v-model="newProject.location.lng"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="經度 (Longitude)"
                  required
                />
              </div>
              <p class="text-xs mt-1 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                座標系統: WGS84 (EPSG:4326)
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                道路類型與編號
              </label>
              
              <!-- 道路類型選擇 -->
              <div class="mb-3">
                <div class="flex space-x-4">
                  <label class="flex items-center">
                    <input type="radio" v-model="newProject.roadType" value="highway" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">公路</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" v-model="newProject.roadType" value="national" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">國道</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" v-model="newProject.roadType" value="railway" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">鐵路</span>
                  </label>
                </div>
              </div>
              
              <!-- 對應的道路列表 -->
              <select v-model="newProject.roadNumber" 
                      class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                      :class="isDarkMode ? 
                        'bg-slate-700 border-slate-600 text-white' : 
                        'bg-white border-gray-300 text-gray-900'">
                <option value="">請選擇道路編號</option>
                
                <!-- 公路選項 -->
                <template v-if="newProject.roadType === 'highway'">
                <optgroup label="省道快速公路">
                  <option v-for="highway in provincialExpressways" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="環島公路">
                  <option v-for="highway in ringRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="縱貫公路">
                  <option v-for="highway in northSouthRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="橫貫公路">
                  <option v-for="highway in crossIslandRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="濱海公路">
                  <option v-for="highway in coastalRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="聯絡公路">
                  <option v-for="highway in connectingRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="高鐵聯外公路">
                  <option v-for="highway in hsrConnectingRoads" :key="highway" :value="highway">
                    {{ highway }}
                  </option>
                </optgroup>
                <optgroup label="其他公路">
                    <option value="縣道">縣道</option>
                    <option value="鄉道">鄉道</option>
                    <option value="市道">市道</option>
                    <option value="區道">區道</option>
                    <option value="產業道路">產業道路</option>
                    <option value="林道">林道</option>
                    <option value="農路">農路</option>
                    <option value="其他">其他</option>
                  </optgroup>
                </template>
                
                <!-- 國道選項 -->
                <template v-else-if="newProject.roadType === 'national'">
                  <optgroup label="國道系統">
                  <option value="國道1號">國道1號</option>
                  <option value="國道2號">國道2號</option>
                  <option value="國道3號">國道3號</option>
                  <option value="國道4號">國道4號</option>
                  <option value="國道5號">國道5號</option>
                  <option value="國道6號">國道6號</option>
                  <option value="國道8號">國道8號</option>
                  <option value="國道10號">國道10號</option>
                </optgroup>
                </template>
                
                <!-- 鐵路選項 -->
                <template v-else-if="newProject.roadType === 'railway'">
                  <optgroup label="台鐵系統">
                  <option value="台鐵西部幹線">台鐵西部幹線</option>
                  <option value="台鐵東部幹線">台鐵東部幹線</option>
                  <option value="台鐵南迴線">台鐵南迴線</option>
                  <option value="台鐵北迴線">台鐵北迴線</option>
                  <option value="台鐵內灣線">台鐵內灣線</option>
                  <option value="台鐵六家線">台鐵六家線</option>
                  <option value="台鐵沙崙線">台鐵沙崙線</option>
                  <option value="台鐵集集線">台鐵集集線</option>
                  <option value="台鐵深澳線">台鐵深澳線</option>
                  <option value="台鐵平溪線">台鐵平溪線</option>
                  </optgroup>
                  <optgroup label="高速鐵路">
                  <option value="高鐵">高鐵</option>
                  </optgroup>
                  <optgroup label="城市軌道">
                  <option value="捷運">捷運</option>
                  <option value="輕軌">輕軌</option>
                  </optgroup>
                  <optgroup label="觀光鐵路">
                  <option value="阿里山森林鐵路">阿里山森林鐵路</option>
                  <option value="太平山森林鐵路">太平山森林鐵路</option>
                </optgroup>
                </template>
              </select>
            </div>
            
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                起迄時間 <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    開始時間
                  </label>
                  <input
                    v-model="newProject.startDate"
                    type="datetime-local"
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                    :class="isDarkMode ? 
                      'bg-slate-700 border-slate-600 text-white' : 
                      'bg-white border-gray-300 text-gray-900'"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    結束時間
                  </label>
                  <input
                    v-model="newProject.endDate"
                    type="datetime-local"
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                    :class="isDarkMode ? 
                      'bg-slate-700 border-slate-600 text-white' : 
                      'bg-white border-gray-300 text-gray-900'"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="showCreateProjectModal = false"
                      class="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                      :class="isDarkMode ? 
                        'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
                取消
              </button>
              <button type="submit"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors duration-300">
                創建專案
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- 新增報告模態框 -->
    <div v-if="showCreateReportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div class="rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">新增報告</h2>
            <button @click="showCreateReportModal = false"
                    class="p-2 rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      'hover:bg-slate-700 text-gray-300' : 
                      'hover:bg-gray-100 text-gray-600'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <form @submit.prevent="createReport">
            <div class="space-y-6">
              <!-- 報告標題 -->
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  報告標題 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newReport.title"
                  type="text"
                  required
                  class="w-full px-3 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請輸入報告標題"
                />
              </div>
              
              <!-- 報告描述 -->
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  報告描述
                </label>
                <textarea
                  v-model="newReport.description"
                  rows="3"
                  class="w-full px-3 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請輸入報告描述（可選）"
                ></textarea>
              </div>
              
              <!-- 檔案類型 -->
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  檔案類型 <span class="text-red-500">*</span>
                </label>
                <div class="space-y-2">
                  <label class="flex items-center">
                    <input
                      v-model="newReport.fileType"
                      type="radio"
                      value="pdf"
                      class="mr-2"
                    />
                    <span class="transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">PDF 檔案</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="newReport.fileType"
                      type="radio"
                      value="url"
                      class="mr-2"
                    />
                    <span class="transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">URL 連結</span>
                  </label>
                </div>
              </div>
              
              <!-- 檔案上傳或URL輸入 -->
              <div v-if="newReport.fileType === 'pdf'">
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  PDF 檔案 <span class="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  @change="handleFileUpload"
                  class="w-full px-3 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white' : 
                    'bg-white border-gray-300 text-gray-900'"
                />
                <p class="mt-1 text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  支援 PDF 格式，檔案大小限制 10MB
                </p>
              </div>
              
              <div v-else-if="newReport.fileType === 'url'">
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  URL 連結 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="newReport.filePath"
                  type="url"
                  required
                  class="w-full px-3 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="https://example.com/report.pdf"
                />
                <p class="mt-1 text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  請輸入完整的 URL 連結
                </p>
              </div>
            </div>
            
            <!-- 按鈕 -->
            <div class="flex justify-end space-x-3 mt-8">
              <button type="button" @click="showCreateReportModal = false"
                      class="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                      :class="isDarkMode ? 
                        'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
                取消
              </button>
              <button type="submit"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors duration-300">
                創建報告
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
        
    <!-- 編輯專案模態框 -->
    <div v-if="showEditProjectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div class="rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto transition-all duration-300"
           :class="[
             isDarkMode ? 'bg-slate-800' : 'bg-white',
             isEditingChildProject ? 'max-w-md' : 'max-w-2xl'
           ]">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              {{ isEditingChildProject ? '編輯事件紀錄' : '編輯專案' }}
            </h2>
            <button @click="showEditProjectModal = false"
                    class="p-2 rounded-lg transition-colors duration-300"
                    :class="isDarkMode ? 
                      'hover:bg-slate-700 text-gray-300' : 
                      'hover:bg-gray-100 text-gray-600'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            </div>
            
            <form @submit.prevent="updateProject" class="space-y-4">
            <!-- 子專案編輯模式：只顯示名稱和描述 -->
            <template v-if="isEditingChildProject">
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  事件名稱 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editingProject.eventName"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請輸入事件名稱..."
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  事件描述 <span class="text-red-500">*</span>
                </label>
                <textarea 
                  v-model="editingProject.description"
                  rows="3"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請描述事件的內容..."
                  required
                ></textarea>
              </div>
            </template>
            
            <!-- 母專案編輯模式：顯示完整表單 -->
            <template v-else>
            <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                專案名稱 <span class="text-red-500">*</span>
              </label>
                <input
                  v-model="editingProject.eventName"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請輸入事件名稱..."
                  required
                />
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                專案描述 <span class="text-red-500">*</span>
              </label>
              <textarea 
                v-model="editingProject.description"
                rows="3"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                :class="isDarkMode ? 
                  'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                  'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                placeholder="請描述專案的背景、目的、預期成果等..."
                required
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                地點（座標 WGS84） <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="editingProject.location.lat"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="緯度 (Latitude)"
                  required
                />
                <input
                  v-model="editingProject.location.lng"
                  type="text"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  :class="isDarkMode ? 
                    'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 
                    'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="經度 (Longitude)"
                  required
                />
              </div>
              <p class="text-xs mt-1 transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                座標系統: WGS84 (EPSG:4326)
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                道路類型與編號
              </label>
              
              <!-- 道路類型選擇 -->
              <div class="mb-3">
                <div class="flex space-x-4">
                  <label class="flex items-center">
                    <input type="radio" v-model="editingProject.roadType" value="highway" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">公路</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" v-model="editingProject.roadType" value="national" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">國道</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" v-model="editingProject.roadType" value="railway" 
                           class="mr-2 transition-colors duration-300"
                           :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'">
                    <span class="text-sm transition-colors duration-300"
                          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">鐵路</span>
                  </label>
                </div>
              </div>
              
              <!-- 對應的道路列表 -->
              <select v-model="editingProject.highway" 
                      class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                      :class="isDarkMode ? 
                        'bg-slate-700 border-slate-600 text-white' : 
                        'bg-white border-gray-300 text-gray-900'">
                <option value="">請選擇道路編號</option>
                
                <!-- 公路選項 -->
                <template v-if="editingProject.roadType === 'highway'">
                  <optgroup label="省道快速公路">
                    <option v-for="highway in provincialExpressways" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="環島公路">
                    <option v-for="highway in ringRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="縱貫公路">
                    <option v-for="highway in northSouthRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="橫貫公路">
                    <option v-for="highway in crossIslandRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="濱海公路">
                    <option v-for="highway in coastalRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="聯絡公路">
                    <option v-for="highway in connectingRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="高鐵聯外公路">
                    <option v-for="highway in hsrConnectingRoads" :key="highway" :value="highway">
                      {{ highway }}
                    </option>
                  </optgroup>
                  <optgroup label="其他公路">
                    <option value="縣道">縣道</option>
                    <option value="鄉道">鄉道</option>
                    <option value="市道">市道</option>
                    <option value="區道">區道</option>
                    <option value="產業道路">產業道路</option>
                    <option value="林道">林道</option>
                    <option value="農路">農路</option>
                    <option value="其他">其他</option>
                  </optgroup>
                </template>
                
                <!-- 國道選項 -->
                <template v-else-if="editingProject.roadType === 'national'">
                  <optgroup label="國道系統">
                    <option value="國道1號">國道1號</option>
                    <option value="國道2號">國道2號</option>
                    <option value="國道3號">國道3號</option>
                    <option value="國道4號">國道4號</option>
                    <option value="國道5號">國道5號</option>
                    <option value="國道6號">國道6號</option>
                    <option value="國道8號">國道8號</option>
                    <option value="國道10號">國道10號</option>
                  </optgroup>
                </template>
                
                <!-- 鐵路選項 -->
                <template v-else-if="editingProject.roadType === 'railway'">
                  <optgroup label="台鐵系統">
                    <option value="台鐵西部幹線">台鐵西部幹線</option>
                    <option value="台鐵東部幹線">台鐵東部幹線</option>
                    <option value="台鐵南迴線">台鐵南迴線</option>
                    <option value="台鐵北迴線">台鐵北迴線</option>
                    <option value="台鐵內灣線">台鐵內灣線</option>
                    <option value="台鐵六家線">台鐵六家線</option>
                    <option value="台鐵沙崙線">台鐵沙崙線</option>
                    <option value="台鐵集集線">台鐵集集線</option>
                    <option value="台鐵深澳線">台鐵深澳線</option>
                    <option value="台鐵平溪線">台鐵平溪線</option>
                  </optgroup>
                  <optgroup label="高速鐵路">
                    <option value="高鐵">高鐵</option>
                  </optgroup>
                  <optgroup label="城市軌道">
                    <option value="捷運">捷運</option>
                    <option value="輕軌">輕軌</option>
                  </optgroup>
                  <optgroup label="觀光鐵路">
                    <option value="阿里山森林鐵路">阿里山森林鐵路</option>
                    <option value="太平山森林鐵路">太平山森林鐵路</option>
                  </optgroup>
                </template>
              </select>
          </div>
          
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                起迄時間 <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    開始時間
                  </label>
                  <input
                    v-model="editingProject.startTime"
                    type="datetime-local"
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                    :class="isDarkMode ? 
                      'bg-slate-700 border-slate-600 text-white' : 
                      'bg-white border-gray-300 text-gray-900'"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                         :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
                    結束時間
                  </label>
                  <input
                    v-model="editingProject.endTime"
                    type="datetime-local"
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                    :class="isDarkMode ? 
                      'bg-slate-700 border-slate-600 text-white' : 
                      'bg-white border-gray-300 text-gray-900'"
                    required
                  />
                </div>
              </div>
            </div>
            </template>
              
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="showEditProjectModal = false"
                      class="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                      :class="isDarkMode ? 
                        'text-gray-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 
                        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'">
                取消
              </button>
              <button type="submit"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors duration-300">
                {{ isEditingChildProject ? '更新事件紀錄' : '更新專案' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- URL 載入中的遮罩 -->
    <div v-if="isLoadingFromUrl && !showProjectDetailMap"
         class="fixed top-16 left-0 right-0 bottom-0 z-50 flex items-center justify-center transition-colors duration-300"
         :class="isDarkMode ? 'bg-slate-900' : 'bg-gray-50'">
      <div class="flex flex-col items-center space-y-4">
        <svg class="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="text-sm transition-colors duration-300"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">載入專案中...</span>
      </div>
    </div>

    <!-- 專案詳情地圖 -->
    <ProjectDetail
      v-if="showProjectDetailMap"
      :key="`${detailProject?.projectId}-${detailProject?.is_parent}-${detailProject?.parent_project_id}`"
      :project="detailProject"
      :is-dark-mode="isDarkMode"
      :layer-visibility="getProjectLayerVisibility(detailProject?.projectId)"
      @close="closeProjectDetailMap"
      @update-layer-visibility="updateProjectLayerVisibility"
      @edit-project="editProject"
      @switch-project="handleSwitchProject"
    />

    <!-- 創建母專案模態框 -->
    <CreateParentProjectModal
      :is-visible="showCreateParentModal"
      @close="showCreateParentModal = false"
      @created="handleParentCreated"
    />

    <!-- 編輯母專案模態框 -->
    <EditParentProjectModal
      :is-visible="showEditParentModal"
      :parent-project="selectedParentForEdit"
      @close="showEditParentModal = false; selectedParentForEdit = null"
      @updated="handleParentUpdated"
    />

    <!-- 創建子專案模態框 -->
    <CreateChildProjectModal
      :is-visible="showCreateChildModal"
      :parent-project="selectedParentProject"
      @close="showCreateChildModal = false"
      @created="handleChildCreated"
    />

    <!-- 編輯子專案模態框 -->
    <EditChildProjectModal
      :is-visible="showEditChildModal"
      :child-project="selectedChildProject"
      :parent-project="selectedChildProject ? parentProjects.find(p => p.project_id === selectedChildProject.parent_project_id) : null"
      @close="showEditChildModal = false"
      @updated="handleChildUpdated"
    />

    <!-- 報告連結管理模態框 -->
    <div v-if="showReportLinkModal"
         class="fixed inset-0 z-[2000] flex items-center justify-center"
         @click.self="closeReportLinkModal">
      <div class="absolute inset-0 bg-black bg-opacity-50"></div>
      <div class="relative w-full max-w-xl mx-4 rounded-xl shadow-2xl transition-colors duration-300"
           :class="isDarkMode ? 'bg-slate-800' : 'bg-white'">
        <!-- 標題 -->
        <div class="flex items-center justify-between px-6 py-4 border-b transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            <div>
              <h3 class="text-base font-semibold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'">報告連結管理</h3>
              <p class="text-xs transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">{{ reportLinkTargetProject?.name }}</p>
            </div>
          </div>
          <button @click="closeReportLinkModal"
                  class="p-1 rounded-lg transition-colors duration-200"
                  :class="isDarkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 內容：上下兩個獨立區塊 -->
        <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          <!-- 區塊一：新增報告連結 -->
          <div class="rounded-xl border-2 overflow-hidden transition-colors duration-300"
               :class="isDarkMode ? 'border-purple-700 bg-slate-750' : 'border-purple-200 bg-purple-50'">
            <!-- 區塊標題 -->
            <div class="flex items-center space-x-2 px-4 py-3 transition-colors duration-300"
                 :class="isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100'">
              <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              <span class="text-sm font-semibold transition-colors duration-300"
                    :class="isDarkMode ? 'text-purple-300' : 'text-purple-700'">新增報告連結</span>
            </div>
            <!-- 表單 -->
            <div class="px-4 py-4 space-y-3">
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">標題</label>
                <input v-model="newReportLink.title"
                       type="text"
                       placeholder="報告標題（例：台7線49.4K崩塌報告）"
                       class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                       @keydown.enter="addReportLink" />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">網址</label>
                <input v-model="newReportLink.url"
                       type="url"
                       placeholder="https://..."
                       class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-300"
                       :class="isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'"
                       @keydown.enter="addReportLink" />
              </div>
              <button @click="addReportLink"
                      :disabled="!newReportLink.title.trim() || !newReportLink.url.trim() || isSavingReportLink"
                      class="w-full py-2 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      :class="isDarkMode ? 'text-white bg-purple-600 hover:bg-purple-700' : 'text-white bg-purple-600 hover:bg-purple-700'">
                <svg v-if="isSavingReportLink" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>{{ isSavingReportLink ? '儲存中...' : '確認新增' }}</span>
              </button>
            </div>
          </div>

          <!-- 區塊二：現有連結列表（刪除） -->
          <div class="rounded-xl border-2 overflow-hidden transition-colors duration-300"
               :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
            <!-- 區塊標題 -->
            <div class="flex items-center justify-between px-4 py-3 transition-colors duration-300"
                 :class="isDarkMode ? 'bg-slate-700' : 'bg-gray-100'">
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4 transition-colors duration-300" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <span class="text-sm font-semibold transition-colors duration-300"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">已儲存的連結</span>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full transition-colors duration-300"
                    :class="isDarkMode ? 'bg-slate-600 text-gray-400' : 'bg-gray-200 text-gray-600'">
                {{ reportLinkList.length }} 筆
              </span>
            </div>
            <!-- 列表 -->
            <div v-if="reportLinkList.length > 0" class="divide-y transition-colors duration-300"
                 :class="isDarkMode ? 'divide-slate-700' : 'divide-gray-100'">
              <div v-for="link in reportLinkList" :key="link.id"
                   class="transition-colors duration-300"
                   :class="isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'">

                <!-- 編輯模式 -->
                <div v-if="editingLinkId === link.id" class="px-4 py-3 space-y-2">
                  <input v-model="editingLink.title"
                         type="text"
                         placeholder="標題"
                         class="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                         :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'"
                         @keydown.enter="saveEditLink(link.id)"
                         @keydown.esc="cancelEditLink" />
                  <input v-model="editingLink.url"
                         type="url"
                         placeholder="https://..."
                         class="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                         :class="isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'"
                         @keydown.enter="saveEditLink(link.id)"
                         @keydown.esc="cancelEditLink" />
                  <div class="flex items-center space-x-2 pt-1">
                    <button @click="saveEditLink(link.id)"
                            :disabled="!editingLink.title.trim() || !editingLink.url.trim() || isSavingEditLink"
                            class="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            :class="isDarkMode ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-white bg-blue-600 hover:bg-blue-700'">
                      <svg v-if="isSavingEditLink" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>{{ isSavingEditLink ? '儲存中...' : '儲存' }}</span>
                    </button>
                    <button @click="cancelEditLink"
                            class="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-200"
                            :class="isDarkMode ? 'text-gray-400 border-slate-600 hover:bg-slate-700' : 'text-gray-600 border-gray-300 hover:bg-gray-100'">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      <span>取消</span>
                    </button>
                  </div>
                </div>

                <!-- 顯示模式 -->
                <div v-else class="flex items-center space-x-3 px-4 py-3">
                  <svg class="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate transition-colors duration-300"
                       :class="isDarkMode ? 'text-white' : 'text-gray-900'">{{ link.title }}</p>
                    <a :href="link.url" target="_blank"
                       class="text-xs text-blue-500 hover:underline truncate block"
                       :title="link.url">{{ link.url }}</a>
                  </div>
                  <!-- 編輯按鈕 -->
                  <button @click="startEditLink(link)"
                          class="flex-shrink-0 flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-200"
                          :class="isDarkMode ? 'text-blue-400 border-blue-700 hover:bg-blue-900/30' : 'text-blue-600 border-blue-300 hover:bg-blue-50'">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span>編輯</span>
                  </button>
                  <!-- 刪除按鈕 -->
                  <button @click="removeReportLink(link.id)"
                          class="flex-shrink-0 flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-200"
                          :class="isDarkMode ? 'text-red-400 border-red-700 hover:bg-red-900/30' : 'text-red-600 border-red-300 hover:bg-red-50'">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>刪除</span>
                  </button>
                </div>

              </div>
            </div>
            <div v-else class="px-4 py-6 text-center transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
              <svg class="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <p class="text-xs">尚無報告連結</p>
            </div>
          </div>

        </div>

        <!-- 底部 -->
        <div class="flex justify-end px-6 py-4 border-t transition-colors duration-300"
             :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
          <button @click="closeReportLinkModal"
                  class="px-5 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                  :class="isDarkMode ? 'text-gray-300 bg-slate-700 hover:bg-slate-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'">
            關閉
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import L from 'leaflet'
import { alert, confirm, success } from '@/utils/simpleAlertService'
import ActionButton from '@/components/ActionButton.vue'
import ProjectMap from '@/components/ProjectMap.vue'
import ProjectArea from '@/components/ProjectArea.vue'
import ReportArea from '@/components/ReportArea.vue'
import TrashArea from '@/components/TrashArea.vue'
import DateInput from '@/components/DateInput.vue'
import ProjectDetail from '@/views/ProjectDetail.vue'
import ParentProjectCard from '@/components/project/ParentProjectCard.vue'
import CreateParentProjectModal from '@/components/project/CreateParentProjectModal.vue'
import EditParentProjectModal from '@/components/project/EditParentProjectModal.vue'
import CreateChildProjectModal from '@/components/project/CreateChildProjectModal.vue'
import EditChildProjectModal from '@/components/project/EditChildProjectModal.vue'

export default {
  name: 'DisasterCollection',
  components: {
    ActionButton,
    ProjectMap,
    ProjectArea,
    ReportArea,
    TrashArea,
    DateInput,
    ProjectDetail,
    ParentProjectCard,
    CreateParentProjectModal,
    EditParentProjectModal,
    CreateChildProjectModal,
    EditChildProjectModal
  },
  inject: ['isDarkMode', 'fontSize', 'isLoggedIn'],
  data() {
    return {
      // 視圖模式
      viewMode: 'list', // 'list' 或 'map'
      
      // 防止重複載入的標記
      isDataLoaded: false,
      
      // 從 URL 載入專案時的等待標記（避免顯示閃爍的空白頁面）
      isLoadingFromUrl: false,
      
      // 模擬母專案對象（用於地圖組件）
      mockParentProject: {
        projectId: 'disaster-collection-parent',
        project_id: 'disaster-collection-parent',
        name: '災情資料搜集',
        is_parent: true,
        parent_project_id: null,
        location: {
          lat: 24.5,
          lng: 121.0
        }
      },
      
      // 篩選條件
      searchQuery: '',
      filterRoadType: '',
      filterHighway: '',
      filterStartDate: '',
      filterEndDate: '',
      
      // 道路編號選項
      roadNumberOptions: {
        highway: [
          { value: '', label: '全部' },
          { value: '台1線', label: '台1線' },
          { value: '台2線', label: '台2線' },
          { value: '台3線', label: '台3線' },
          { value: '台7線', label: '台7線' },
          { value: '台9線', label: '台9線' },
          { value: '台11線', label: '台11線' },
          { value: '台14線', label: '台14線' },
          { value: '台17線', label: '台17線' },
          { value: '台19線', label: '台19線' },
          { value: '台21線', label: '台21線' },
          { value: '台26線', label: '台26線' }
        ],
        national: [
          { value: '', label: '全部' },
          { value: '國道1號', label: '國道1號' },
          { value: '國道2號', label: '國道2號' },
          { value: '國道3號', label: '國道3號' },
          { value: '國道4號', label: '國道4號' },
          { value: '國道5號', label: '國道5號' },
          { value: '國道6號', label: '國道6號' },
          { value: '國道8號', label: '國道8號' },
          { value: '國道10號', label: '國道10號' }
        ],
        railway: [
          { value: '', label: '全部' },
          { value: '台鐵縱貫線', label: '台鐵縱貫線' },
          { value: '台鐵宜蘭線', label: '台鐵宜蘭線' },
          { value: '台鐵北迴線', label: '台鐵北迴線' },
          { value: '台鐵花東線', label: '台鐵花東線' },
          { value: '台鐵南迴線', label: '台鐵南迴線' },
          { value: '高鐵', label: '高鐵' },
          { value: '台北捷運', label: '台北捷運' },
          { value: '高雄捷運', label: '高雄捷運' }
        ]
      },
      
      // 篩選面板狀態
      showFilterPanel: false,
      showSearchPanel: false,
      
      // 圖層操作面板狀態
      showLayerPanel: false,
      selectedProject: null,
      
      // 專案詳情地圖狀態
      showProjectDetailMap: false,
      detailProject: null,
      projectLayerVisibility: {}, // 存儲每個專案的圖層可見性狀態
      
      // 垃圾桶狀態
      showTrash: false,
      showReports: false,
      showTrashContent: 'projects', // 'projects' 或 'data'
      
      // 標記篩選狀態
      showBookmarkedOnly: false,
      showBookmarkedReportsOnly: false,
      
      // 模態框狀態
      showCreateProjectModal: false,
      showCreateParentModal: false,
      showEditParentModal: false,
      showCreateChildModal: false,
      showEditChildModal: false,
      showEditProjectModal: false,
      showCreateReportModal: false,
      showEditReportModal: false,

      // 報告連結模態框狀態
      showReportLinkModal: false,
      reportLinkTargetProject: null,
      reportLinkList: [],
      newReportLink: { title: '', url: '' },
      isSavingReportLink: false,
      editingLinkId: null,
      editingLink: { title: '', url: '' },
      isSavingEditLink: false,
      
      // 母子專案數據
      parentProjects: [],
      childProjectsMap: {}, // key: parent_id, value: array of children
      selectedParentProject: null,
      selectedParentForEdit: null,
      selectedChildProject: null,
      
      // 地圖圖層控制
      highwayMileageVisible: true, // 省道里程樁號顯示狀態（默認開啟，類似預警模組）
      mileageLabelVisible: false, // 里程數字標籤顯示狀態
      
      // 桩號圖層（直接管理，類似預警模組）
      mileagePointsLayer: null, // 桩號點位圖層
      
      // 新專案資料
      newProject: {
        name: '',
        description: '',
        location: {
          lat: null,
          lng: null
        },
        roadType: 'national', // 預設選擇國道
        roadNumber: '',
        startDate: '',
        endDate: ''
      },
      
      // 編輯專案資料
      editingProject: {
        id: null,
        eventName: '',
        description: '',
        location: {
          lat: null,
          lng: null
        },
        roadType: 'highway',
        highway: '',
        startTime: '',
        endTime: ''
      },
      // 判斷是否為編輯子專案
      isEditingChildProject: false,
      
      // 報告資料
      reports: [],
      trashReports: [],
      
      // 新報告資料
      newReport: {
        title: '',
        description: '',
        fileType: 'pdf', // 'pdf' 或 'url'
        filePath: '',
        fileName: ''
      },
      
      // 編輯報告資料
      editingReport: {
        id: null,
        title: '',
        description: '',
        fileType: 'pdf',
        filePath: '',
        fileName: ''
      },
      
      // 根據維基百科台灣省道資料整理的省道編號
      provincialExpressways: [
        '台2己線', '台61線', '台62線', '台63線', '台64線', '台65線', '台66線', 
        '台68線', '台72線', '台74線', '台76線', '台78線', '台82線', '台84線', '台86線'
      ],
      
      ringRoads: [
        '台2線', '台2甲線', '台2乙線', '台2丙線', '台2丁線', '台2戊線',
        '台9線', '台9甲線', '台9乙線', '台9丙線', '台9丁線'
      ],
      
      northSouthRoads: [
        '台1線', '台1甲線', '台1乙線', '台1丙線', '台1丁線',
        '台3線', '台3甲線', '台3乙線', '台3丙線', '台3丁線',
        '台13線', '台19線', '台19甲線', '台19乙線'
      ],
      
      crossIslandRoads: [
        '台7線', '台7甲線', '台7乙線', '台7丙線', '台7丁線',
        '台8線', '台8甲線',
        '台20線', '台20甲線', '台20乙線'
      ],
      
      coastalRoads: [
        '台11線', '台11甲線', '台11乙線', '台11丙線',
        '台15線', '台15甲線',
        '台17線', '台17甲線', '台17乙線',
        '台26線', '台26甲線'
      ],
      
      connectingRoads: [
        '台4線', '台5線', '台5甲線', '台6線', '台10線', '台10乙線',
        '台12線', '台14線', '台14甲線', '台14乙線', '台14丙線', '台14丁線',
        '台16線', '台18線', '台21線', '台21甲線', '台22線', '台23線',
        '台24線', '台25線', '台27線', '台27甲線', '台28線', '台29線',
        '台30線', '台63甲線'
      ],
      
      hsrConnectingRoads: [
        '台31線', '台37線', '台39線'
      ],
      
      projects: [],
      selectedProject: null,
      
      // 垃圾桶數據
      trashProjects: [],
      trashData: [],
      trashReports: [
        {
          id: 1,
          title: '台7線49.8K災害評估報告',
          type: 'PDF',
          size: '2.3 MB',
          uploadDate: '2024-01-15',
          author: '張工程師',
          status: '已審核'
        },
        {
          id: 2,
          title: '山區道路監測數據分析',
          type: 'Excel',
          size: '1.8 MB',
          uploadDate: '2024-01-12',
          author: '李研究員',
          status: '待審核'
        },
        {
          id: 3,
          title: '防災預警系統測試報告',
          type: 'Word',
          size: '856 KB',
          uploadDate: '2024-01-10',
          author: '王技師',
          status: '已審核'
        }
      ]
    }
  },
  async mounted() {
    // 檢查 URL 參數，決定是否顯示專案地圖
    this.checkUrlParams()
    
    // 防止重複載入
    if (this.isDataLoaded) {
      console.log('數據已載入，跳過重複載入')
      return
    }
    
    console.log('DisasterCollection 組件掛載，開始載入數據...')
    
    // 確保初始狀態正確
    this.showTrash = false
    this.showReports = false
    this.showBookmarkedOnly = false
    this.showBookmarkedReportsOnly = false
    this.showTrashContent = 'projects' // 重置垃圾桶內容類型
    this.viewMode = 'list'
    
    // 組件掛載時載入專案列表、報告列表和垃圾桶計數
    await this.loadProjects()
    await this.loadReports()
    await this.loadTrashCounts()
    // 載入所有母專案的報告連結
    await this.loadAllReportLinks()
    
    // 標記數據已載入
    this.isDataLoaded = true
    console.log('DisasterCollection 數據載入完成')
  },
  beforeUnmount() {
    // 清理桩號圖層
    if (this.mileagePointsLayer) {
      const map = this.$refs.projectMapRef?.map
      if (map && map.hasLayer(this.mileagePointsLayer)) {
        map.removeLayer(this.mileagePointsLayer)
      }
      this.mileagePointsLayer = null
      console.log('[DisasterCollection] 清理桩號圖層')
    }
  },
  computed: {
    // 地圖用的模擬專案（設置為非父項目，避免 ProjectMap 嘗試加載子項目）
    mockParentProjectForMap() {
      return {
        ...this.mockParentProject,
        is_parent: false, // ✅ 關鍵：設置為 false，避免 ProjectMap 調用後端 API
        parent_project_id: 'fake-parent' // ✅ 設置一個假的 parent_project_id，確保不會被識別為父項目
      }
    },
    
    // 垃圾桶計數
    trashCounts() {
      return {
        projects: this.trashProjects.length,
        data: this.trashData.length,
        reports: this.trashReports.length
      }
    },
    
    // 已標記專案計數
    bookmarkedProjectsCount() {
      return this.projects.filter(project => project.isBookmarked === true).length
    },
    
    // 已標記報告計數
    bookmarkedReportsCount() {
      return this.reports.filter(report => report.isBookmarked === true).length
    },
    
    // 篩選後的專案列表
    filteredProjects() {
      let filtered = this.projects

      // 標記篩選
      if (this.showBookmarkedOnly) {
        filtered = filtered.filter(project => project.isBookmarked === true)
      }

      // 搜尋篩選
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(project => 
          project.name.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query)
        )
      }

      // 道路類型篩選
      if (this.filterRoadType) {
        filtered = filtered.filter(project => project.roadType === this.filterRoadType)
      }

      // 道路編號篩選
      if (this.filterHighway) {
        filtered = filtered.filter(project => project.roadNumber === this.filterHighway)
      }

      // 日期篩選
      if (this.filterStartDate) {
        filtered = filtered.filter(project => {
          const projectDate = new Date(project.startDate).toISOString().split('T')[0]
          return projectDate >= this.filterStartDate
        })
      }

      if (this.filterEndDate) {
        filtered = filtered.filter(project => {
          const projectDate = new Date(project.startDate).toISOString().split('T')[0]
          return projectDate <= this.filterEndDate
        })
      }

      return filtered
    },

    // 過濾母專案列表
    filteredParentProjects() {
      let filtered = this.parentProjects || []

      // 搜尋篩選
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(parent =>
          parent.name.toLowerCase().includes(query) ||
          parent.description?.toLowerCase().includes(query) ||
          parent.road_number?.toLowerCase().includes(query) ||
          parent.location_name?.toLowerCase().includes(query)
        )
      }

      // 道路類型篩選
      if (this.filterRoadType) {
        filtered = filtered.filter(parent => parent.road_type === this.filterRoadType)
      }

      // 道路編號篩選
      if (this.filterHighway) {
        filtered = filtered.filter(parent => parent.road_number === this.filterHighway)
      }

      return filtered
    },

    // 可用的道路編號列表
    availableHighways() {
      const highways = new Set()
      this.projects.forEach(project => {
        if (project.highway) {
          highways.add(project.highway)
        }
      })
      return Array.from(highways).sort()
    },

    // 檢查是否有活躍的篩選條件
    hasActiveFilters() {
      return this.searchQuery || 
             this.filterRoadType || 
             this.filterHighway || 
             this.filterStartDate || 
             this.filterEndDate ||
             this.showBookmarkedOnly
    },
    
    // 根據道路類型獲取道路編號選項
    currentRoadNumberOptions() {
      if (!this.filterRoadType) {
        return [{ value: '', label: '請先選擇道路類型' }]
      }
      return this.roadNumberOptions[this.filterRoadType] || [{ value: '', label: '無選項' }]
    },
    
    // 篩選後的報告列表
    filteredReports() {
      let filtered = this.reports

      // 標記篩選
      if (this.showBookmarkedReportsOnly) {
        filtered = filtered.filter(report => report.isBookmarked === true)
      }

      // 搜尋篩選
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(report => 
          report.title.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query)
        )
      }

      return filtered
    }
  },
  methods: {
    // 顯示專案列表
    showProjectList() {
      // 清除搜尋和篩選條件
      this.searchQuery = ''
      this.filterRoadType = ''
      this.filterHighway = ''
      this.filterStartDate = ''
      this.filterEndDate = ''
      // 關閉垃圾桶和報告面板
      this.showTrash = false
      this.showReports = false
      // 關閉標記篩選
      this.showBookmarkedOnly = false
      this.showBookmarkedReportsOnly = false
    },
    
    // 顯示已標記專案
    showBookmarkedProjects() {
      // 切換標記篩選狀態
      this.showBookmarkedOnly = !this.showBookmarkedOnly
      // 清除其他篩選條件
      this.searchQuery = ''
      this.filterRoadType = ''
      this.filterHighway = ''
      this.filterStartDate = ''
      this.filterEndDate = ''
      // 關閉垃圾桶和報告面板
      this.showTrash = false
      this.showReports = false
      // 關閉已標記報告篩選
      this.showBookmarkedReportsOnly = false
    },
    
    // 顯示已標記報告
    async showBookmarkedReports() {
      // 切換標記報告篩選狀態
      this.showBookmarkedReportsOnly = !this.showBookmarkedReportsOnly
      
      if (this.showBookmarkedReportsOnly) {
        // 如果啟用已標記報告篩選，切換到報告模式
        this.showReports = true
        // 載入報告列表
        await this.loadReports()
      } else {
        // 如果關閉已標記報告篩選，回到專案模式
        this.showReports = false
        // 重新載入專案列表
        await this.loadProjects()
      }
      
      // 清除其他篩選條件
      this.searchQuery = ''
      this.filterRoadType = ''
      this.filterHighway = ''
      this.filterStartDate = ''
      this.filterEndDate = ''
      this.showBookmarkedOnly = false
      // 關閉垃圾桶
      this.showTrash = false
    },
    
    // 切換報告顯示
    async toggleReports() {
      this.showReports = !this.showReports
      if (this.showReports) {
        // 載入報告列表
        await this.loadReports()
        // 清除其他篩選條件
        this.searchQuery = ''
        this.filterRoadType = ''
        this.filterHighway = ''
        this.filterStartDate = ''
        this.filterEndDate = ''
        this.showBookmarkedOnly = false
        // 注意：不清除 showBookmarkedReportsOnly，保持已標記報告狀態
        this.showTrash = false
      } else {
        // 關閉報告時，重新載入專案列表
        await this.loadProjects()
        // 清除篩選條件
        this.searchQuery = ''
        this.filterRoadType = ''
        this.filterHighway = ''
        this.filterStartDate = ''
        this.filterEndDate = ''
        this.showBookmarkedOnly = false
        this.showBookmarkedReportsOnly = false
        this.showTrash = false
      }
    },
    
    // 切換垃圾桶內容顯示
    async toggleTrashContent(contentType) {
      // 如果點擊的是當前已選中的內容，則關閉垃圾桶
      if (this.showTrash && this.showTrashContent === contentType) {
        this.showTrash = false
        // 收合垃圾桶時，重新載入專案列表
        await this.loadProjects()
        // 清除篩選條件
        this.searchQuery = ''
        this.filterRoadType = ''
        this.filterHighway = ''
        this.filterStartDate = ''
        this.filterEndDate = ''
        this.showBookmarkedOnly = false
        this.showBookmarkedReportsOnly = false
        this.showReports = false
      } else {
        // 切換到垃圾桶模式
        this.showTrash = true
        this.showTrashContent = contentType
        
        if (contentType === 'projects') {
          // 載入已刪除的專案
          await this.loadTrashProjects()
        } else if (contentType === 'data') {
          // 載入已刪除的資料
          await this.loadTrashData()
        }
        // 清除其他篩選條件
        this.searchQuery = ''
        this.filterRoadType = ''
        this.filterHighway = ''
        this.filterStartDate = ''
        this.filterEndDate = ''
        this.showBookmarkedOnly = false
        this.showBookmarkedReportsOnly = false
        this.showReports = false
      }
    },
    
    // 載入已刪除的專案
    async loadTrashProjects() {
      try {
        const response = await this.$api.projectAPI.getDeleted()
        if (response.success) {
          this.trashProjects = response.data.projects || []
        } else {
          console.error('載入已刪除專案失敗:', response.message)
          this.trashProjects = []
        }
      } catch (error) {
        console.error('載入已刪除專案錯誤:', error)
        this.trashProjects = []
      }
    },
    
    // 載入已刪除的資料
    async loadTrashData() {
      try {
        const response = await this.$api.dataFileAPI.getDeleted()
        if (response && response.success) {
          this.trashData = response.data.dataFiles || []
          console.log('成功載入已刪除資料，資料數量:', this.trashData.length)
        } else {
          console.error('載入已刪除資料失敗:', response?.message || '未知錯誤')
          this.trashData = []
        }
      } catch (error) {
        console.error('載入已刪除資料錯誤:', error)
        this.trashData = []
      }
    },
    
    // 載入垃圾桶計數
    async loadTrashCounts() {
      try {
        // 並行載入所有垃圾桶計數
        const [projectsResponse, dataResponse, reportsResponse] = await Promise.all([
          this.$api.projectAPI.getDeleted(),
          this.$api.dataFileAPI.getDeleted(),
          this.$api.reportAPI.getDeleted()
        ])
        
        // 更新專案計數
        if (projectsResponse && projectsResponse.success) {
          this.trashProjects = projectsResponse.data.projects || []
        }
        
        // 更新資料計數
        if (dataResponse && dataResponse.success) {
          this.trashData = dataResponse.data.dataFiles || []
        }
        
        // 更新報告計數
        if (reportsResponse && reportsResponse.success) {
          this.trashReports = reportsResponse.data.reports || []
        }
        
        console.log('垃圾桶計數載入完成:', {
          projects: this.trashProjects.length,
          data: this.trashData.length,
          reports: this.trashReports.length
        })
      } catch (error) {
        console.error('載入垃圾桶計數錯誤:', error)
        // 如果載入失敗，保持空數組
        this.trashProjects = []
        this.trashData = []
        this.trashReports = []
      }
    },
    
    // 載入報告列表
    async loadReports() {
      try {
        console.log('開始載入報告列表...')
        const response = await this.$api.reportAPI.getAll()
        console.log('報告 API 響應:', response)

        if (response && response.success && response.data) {
          this.reports = response.data.reports || []
          console.log('成功載入報告列表，報告數量:', this.reports.length)
        } else {
          console.error('載入報告列表失敗:', response?.message || '未知錯誤')
          console.log('響應結構:', response)
          // 如果 API 失敗，保持空列表
          this.reports = []
        }
      } catch (error) {
        console.error('載入報告列表錯誤:', error)
        // 如果 API 失敗，保持空列表
        this.reports = []
      }
    },
    
    // 載入範例報告資料
    loadSampleReports() {
      this.reports = [
        {
          reportId: 'sample-report-1',
          title: '台7線49.8K邊坡監測報告',
          description: '113年11月7日大曼邊坡空拍監測分析報告',
          fileType: 'pdf',
          filePath: '/uploads/reports/sample-report-1.pdf',
          fileName: '台7線49.8K邊坡監測報告.pdf',
          isBookmarked: false,
          createdAt: new Date('2024-11-07 10:00:00')
        }
      ]
      console.log('載入範例報告資料，報告數量:', this.reports.length)
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
          return '公'
      }
    },
    
    // 獲取專案圖標背景樣式
    getProjectIconClass(roadType) {
      const baseClass = 'transition-colors duration-300'
      switch (roadType) {
        case 'highway':
          return `${baseClass} ${this.isDarkMode ? 'bg-green-900' : 'bg-green-100'}`
        case 'national':
          return `${baseClass} ${this.isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`
        case 'railway':
          return `${baseClass} ${this.isDarkMode ? 'bg-purple-900' : 'bg-purple-100'}`
        default:
          return `${baseClass} ${this.isDarkMode ? 'bg-green-900' : 'bg-green-100'}`
      }
    },
    
    // 獲取專案圖標文字樣式
    getProjectIconTextClass(roadType) {
      const baseClass = 'transition-colors duration-300'
      switch (roadType) {
        case 'highway':
          return `${baseClass} ${this.isDarkMode ? 'text-green-300' : 'text-green-600'}`
        case 'national':
          return `${baseClass} ${this.isDarkMode ? 'text-blue-300' : 'text-blue-600'}`
        case 'railway':
          return `${baseClass} ${this.isDarkMode ? 'text-purple-300' : 'text-purple-600'}`
        default:
          return `${baseClass} ${this.isDarkMode ? 'text-green-300' : 'text-green-600'}`
      }
    },
    
    // 切換篩選面板顯示狀態
    toggleFilterPanel() {
      this.showFilterPanel = !this.showFilterPanel
      // 如果開啟篩選面板，關閉搜尋面板
      if (this.showFilterPanel) {
        this.showSearchPanel = false
      }
    },
    
    // 切換搜尋面板顯示狀態
    toggleSearchPanel() {
      this.showSearchPanel = !this.showSearchPanel
      // 如果開啟搜尋面板，關閉篩選面板
      if (this.showSearchPanel) {
        this.showFilterPanel = false
      }
    },
    
    // 打開圖層操作面板
    openLayerPanel(project) {
      this.selectedProject = project
      this.showLayerPanel = true
      // 關閉其他面板
      this.showSearchPanel = false
      this.showFilterPanel = false
    },
    
    // 關閉圖層操作面板
    closeLayerPanel() {
      this.showLayerPanel = false
      this.selectedProject = null
    },
    
    // 檢查 URL 參數
    checkUrlParams() {
      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get('project')
      
      if (projectId) {
        console.log('URL 中發現專案 ID:', projectId)
        // 立即標記為 URL 載入中，避免顯示閃爍的空白頁面
        this.isLoadingFromUrl = true
        // 載入專案數據並顯示地圖
        this.loadProjectFromUrl(projectId)
      }
    },
    
    // 從 URL 載入專案
    async loadProjectFromUrl(projectId) {
      try {
        console.log('=== loadProjectFromUrl 開始 ===')
        console.log('要載入的專案 ID:', projectId)
        
        // 先載入專案列表
        await this.loadProjects()
        
        console.log('loadProjects 完成，projects 數組長度:', this.projects.length)
        console.log('projects 中所有專案 ID:', this.projects.map(p => p.projectId))
        
        // 找到對應的專案
        let project = this.projects.find(p => p.projectId === projectId)
        
        console.log('查找結果:', project ? '找到' : '未找到')
        
        if (project) {
          console.log('從專案列表中找到專案，原始信息:', {
            projectId: project.projectId,
            name: project.name,
            is_parent: project.is_parent,
            parent_project_id: project.parent_project_id
          })
          
          // 如果專案有 parent_project_id，明確標記為子專案
          if (project.parent_project_id) {
            project.is_parent = false
            console.log('專案有 parent_project_id，設置為子專案')
          } 
          // 如果專案明確標記為 is_parent = true，是母專案
          else if (project.is_parent === true) {
            project.parent_project_id = null
            console.log('專案明確標記為母專案')
          }
          // 如果專案類型信息不明確（例如從舊數據載入），從 API 載入完整信息
          else if (project.is_parent === undefined) {
            console.log('專案類型信息不明確，從 API 載入完整信息:', projectId)
            project = null // 標記為未找到，以便從 API 載入
          }
        }
        
        // 如果找不到，嘗試從 API 直接載入完整專案信息
        if (!project) {
          console.log('在專案列表中找不到，嘗試從 API 載入:', projectId)
          try {
            // 先嘗試載入子專案
            const childResponse = await this.$api.get(`/child-projects/${projectId}`)
            if (childResponse && childResponse.success) {
              project = { ...childResponse.data }
              // 明確設置為子專案
              project.is_parent = false
              // 確保 projectId 映射正確
              if (!project.projectId && project.project_id) {
                project.projectId = project.project_id
              }
              // 確保 parent_project_id 存在（優先使用 API 返回的）
              if (childResponse.data.parent_project_id) {
                project.parent_project_id = childResponse.data.parent_project_id
              } else if (!project.parent_project_id) {
                // 如果 API 沒有返回 parent_project_id，嘗試從專案列表中找到對應的母專案
                console.warn('子專案 API 沒有返回 parent_project_id，嘗試從專案列表查找')
                const parentProject = this.parentProjects.find(p => {
                  const children = this.getChildProjects(p.project_id) || []
                  return children.some(c => (c.project_id || c.projectId) === projectId)
                })
                if (parentProject) {
                  project.parent_project_id = parentProject.project_id
                  console.log('從專案列表中找到母專案，設置 parent_project_id:', parentProject.project_id)
                }
              }
              
              // 確保 location 數據正確
              if (!project.location && (project.latitude || project.longitude)) {
                project.location = {
                  lat: project.latitude || null,
                  lng: project.longitude || null
                }
              }
              
              console.log('從子專案 API 載入成功:', {
                projectId: project.projectId,
                is_parent: project.is_parent,
                parent_project_id: project.parent_project_id,
                location: project.location
              })
            }
          } catch (childError) {
            console.log('子專案 API 失敗，嘗試母專案 API:', childError.message)
            // 嘗試載入母專案
            try {
              const parentResponse = await this.$api.get(`/parent-projects/${projectId}`)
              if (parentResponse && parentResponse.success) {
                project = parentResponse.data
                project.is_parent = true
                project.parent_project_id = null
                if (!project.projectId && project.project_id) {
                  project.projectId = project.project_id
                }
                console.log('從母專案 API 載入成功:', project)
              }
            } catch (parentError) {
              console.error('無法從 API 載入專案:', parentError)
            }
          }
        }
        
        if (project) {
          console.log('找到專案，準備打開地圖')
          console.log('最終專案信息:', {
            projectId: project.projectId,
            name: project.name,
            is_parent: project.is_parent,
            parent_project_id: project.parent_project_id,
            location: project.location
          })
          this.openProjectDetailMap(project)
        } else {
          console.log('找不到專案 ID:', projectId)
          // 清除無效的 URL 參數
          this.clearProjectUrl()
        }
      } catch (error) {
        console.error('載入專案失敗:', error)
        this.clearProjectUrl()
      } finally {
        this.isLoadingFromUrl = false
      }
    },
    
    // 清除專案 URL 參數
    clearProjectUrl() {
      const url = new URL(window.location)
      url.searchParams.delete('project')
      window.history.replaceState({}, '', url)
    },
    
    // 更新 URL 參數
    updateProjectUrl(projectId) {
      const url = new URL(window.location)
      if (projectId) {
        url.searchParams.set('project', projectId)
      } else {
        url.searchParams.delete('project')
      }
      window.history.replaceState({}, '', url)
    },

    // 打開專案詳情地圖
    openProjectDetailMap(project) {
      console.log('打開專案詳情地圖，原始專案對象:', JSON.parse(JSON.stringify(project)))
      
      // 確保專案對象結構正確
      if (!project.projectId && project.project_id) {
        project.projectId = project.project_id
      }
      
      // 確保專案類型屬性正確設置
      // 如果有 parent_project_id，一定是子專案
      if (project.parent_project_id) {
        project.is_parent = false
        console.log('檢測到 parent_project_id，設置為子專案')
      } else if (project.is_parent === true) {
        // 如果明確標記為 true，是母專案
        project.is_parent = true
        project.parent_project_id = null
        console.log('專案明確標記為母專案')
      }
      
      // 創建新的專案對象，確保響應式更新
      const newProject = {
        ...project,
        // 如果有 parent_project_id，一定是子專案；否則保持原值
        is_parent: project.parent_project_id ? false : project.is_parent,
        parent_project_id: project.parent_project_id || null
      }
      
      console.log('打開專案詳情地圖，處理後的專案對象:', {
        projectId: newProject.projectId,
        is_parent: newProject.is_parent,
        parent_project_id: newProject.parent_project_id,
        location: newProject.location
      })
      
      this.detailProject = newProject
      this.showProjectDetailMap = true
      console.log('showProjectDetailMap 設為:', this.showProjectDetailMap)
      console.log('detailProject 設為:', JSON.parse(JSON.stringify(this.detailProject)))
      
      // 更新 URL 參數
      this.updateProjectUrl(newProject.projectId)
      
      // 關閉其他面板
      this.showLayerPanel = false
      this.showSearchPanel = false
      this.showFilterPanel = false
    },
    
    // 處理切換專案（從 ProjectDetail 組件觸發）
    async handleSwitchProject(project) {
      console.log('=== 開始切換專案 ===')
      console.log('接收到的專案對象（原始）:', JSON.parse(JSON.stringify(project)))
      
      // 確保專案對象結構正確
      if (!project.projectId && project.project_id) {
        project.projectId = project.project_id
      }
      
      // 檢查並記錄專案類型屬性
      console.log('專案類型屬性檢查:', {
        is_parent: project.is_parent,
        parent_project_id: project.parent_project_id,
        'has parent_project_id': !!project.parent_project_id,
        'is_parent === false': project.is_parent === false,
        'is_parent === true': project.is_parent === true
      })
      
      // 明確設置專案類型屬性（關鍵步驟）
      let finalIsParent
      let finalParentProjectId
      
      // 如果有 parent_project_id，一定是子專案
      if (project.parent_project_id) {
        finalIsParent = false
        finalParentProjectId = project.parent_project_id
        console.log('檢測到 parent_project_id，設置為子專案')
      } 
      // 如果明確標記為 false，也是子專案
      else if (project.is_parent === false) {
        finalIsParent = false
        finalParentProjectId = null
        console.log('專案明確標記為子專案（但沒有 parent_project_id）')
      } 
      // 如果明確標記為 true，是母專案
      else if (project.is_parent === true) {
        finalIsParent = true
        finalParentProjectId = null
        console.log('專案明確標記為母專案')
      } 
      // 否則保持原值
      else {
        finalIsParent = project.is_parent
        finalParentProjectId = project.parent_project_id || null
        console.log('專案類型未明確，保持原值')
      }
      
      // 創建新的專案對象，確保響應式更新
      const newProject = {
        ...project,
        // 明確設置專案類型屬性
        is_parent: finalIsParent,
        parent_project_id: finalParentProjectId
      }
      
      console.log('切換專案，新專案信息:', {
        projectId: newProject.projectId,
        is_parent: newProject.is_parent,
        parent_project_id: newProject.parent_project_id,
        name: newProject.name,
        location: newProject.location
      })
      
      // 更新 detailProject，使用新的對象引用以觸發組件更新
      this.detailProject = newProject
      
      // 更新 URL 參數
      this.updateProjectUrl(newProject.projectId)
      
      // 強制更新視圖
      await this.$nextTick()
      console.log('專案已切換，當前專案:', JSON.parse(JSON.stringify(this.detailProject)))
      console.log('=== 切換專案完成 ===')
    },
    
    // 關閉專案詳情地圖
    closeProjectDetailMap() {
      this.showProjectDetailMap = false
      this.detailProject = null
      
      // 清除 URL 參數
      this.clearProjectUrl()
    },
    
    // 編輯專案資訊
    editProject(project) {
      console.log('編輯專案:', project)
      // 這裡可以打開專案編輯模態框或跳轉到編輯頁面
      // 目前先顯示提示訊息
      this.showAlert({
        type: 'info',
        title: '編輯專案',
        message: `準備編輯專案: ${project?.name || '未知專案'}`
      })
    },
    
    // 獲取專案的圖層可見性狀態
    getProjectLayerVisibility(projectId) {
      if (!projectId) return {}
      return this.projectLayerVisibility[projectId] || {}
    },
    
    // 更新專案的圖層可見性狀態
    updateProjectLayerVisibility(projectId, fileId, visible) {
      if (!projectId) return
      
      if (!this.projectLayerVisibility[projectId]) {
        this.projectLayerVisibility[projectId] = {}
      }
      
      this.projectLayerVisibility[projectId][fileId] = visible
      console.log('更新專案圖層可見性:', projectId, fileId, visible)
      console.log('當前專案圖層可見性狀態:', this.projectLayerVisibility[projectId])
      console.log('完整的 projectLayerVisibility:', this.projectLayerVisibility)
    },
    
    // 清除所有篩選條件
    clearFilters() {
      this.filterRoadType = ''
      this.filterHighway = ''
      this.filterStartDate = ''
      this.filterEndDate = ''
    },
    
    // 處理道路類型變更
    onRoadTypeChange() {
      // 當道路類型變更時，清空道路編號選擇
      this.filterHighway = ''
    },
    
    
    // 清除搜尋條件
    clearSearch() {
      this.searchQuery = ''
    },
    
    // 應用篩選條件
    applyFilters() {
      // 篩選邏輯已經在computed屬性filteredProjects中處理
      // 這裡可以添加額外的邏輯，比如保存篩選狀態到localStorage
      console.log('應用篩選條件:', {
        filterRoadType: this.filterRoadType,
        filterHighway: this.filterHighway,
        filterStartDate: this.filterStartDate,
        filterEndDate: this.filterEndDate
      })
    },
    
    // 應用搜尋條件
    applySearch() {
      // 搜尋邏輯已經在computed屬性filteredProjects中處理
      console.log('應用搜尋條件:', {
        searchQuery: this.searchQuery
      })
    },
    
    async createProject() {
      try {
        // 驗證必填欄位
        if (!this.newProject.name || !this.newProject.description || !this.newProject.location.lat || !this.newProject.location.lng || !this.newProject.startDate || !this.newProject.endDate) {
        await alert('請填寫完整的專案資料', '資料不完整', this.isDarkMode)
        return
      }
      
      // 驗證結束時間要晚於開始時間
        if (new Date(this.newProject.endDate) <= new Date(this.newProject.startDate)) {
        await alert('結束時間必須晚於開始時間', '時間設定錯誤', this.isDarkMode)
        return
      }
      
        // 準備要發送到後端的資料
        const projectData = {
          name: this.newProject.name,
        description: this.newProject.description,
          locationGeometry: {
            type: 'Point',
            coordinates: [parseFloat(this.newProject.location.lng), parseFloat(this.newProject.location.lat)]
        },
        roadType: this.newProject.roadType,
          roadNumber: this.newProject.roadNumber,
          startDate: new Date(this.newProject.startDate),
          endDate: new Date(this.newProject.endDate),
          status: 'active'
        }
        
        // 調用 API 創建專案
        const response = await this.$api.projectAPI.create(projectData)
        
        if (response.success) {
          // 創建成功，添加到本地列表
          this.projects.unshift(response.data)
      this.resetProjectForm()
      this.showCreateProjectModal = false
      await success('專案創建成功！', '創建成功', this.isDarkMode)
        } else {
          await alert(response.message || '創建專案失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('創建專案錯誤:', error)
        await alert('創建專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
      }
    },
    
    resetProjectForm() {
      this.newProject = {
        name: '',
        description: '',
        location: {
          lat: null,
          lng: null
        },
        roadType: 'national',
        roadNumber: '',
        startDate: '',
        endDate: ''
      }
    },
    
    selectProject(project) {
      this.selectedProject = project
      // 這裡可以添加點擊專案後的邏輯，比如跳轉到專案詳情頁面
      console.log('選中專案:', project)
    },
    
    // 標記/取消標記專案
    async toggleBookmark(project) {
      try {
        // 調用後端 API 切換標記狀態
        const response = await this.$api.projectAPI.toggleBookmark(project.projectId)
        
        if (response.success) {
          // 更新本地狀態
      project.isBookmarked = !project.isBookmarked
      const action = project.isBookmarked ? '已標記' : '已取消標記'
          await success(`專案「${project.name}」${action}`, '標記狀態', this.isDarkMode)
        } else {
          // 如果 API 失敗，恢復原狀態
          project.isBookmarked = !project.isBookmarked
          await alert(response.message || '標記操作失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('標記專案錯誤:', error)
        // 如果 API 失敗，恢復原狀態
        project.isBookmarked = !project.isBookmarked
        await alert('標記專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
      }
    },
    
    // 編輯專案
    editProject(project) {
      // 判斷是否為子專案
      this.isEditingChildProject = !!(project.parent_project_id || project.is_parent === false)
      
      this.editingProject = {
        id: project.projectId || project.id,
        eventName: project.name, // 修正：使用 name 欄位
        description: project.description,
        location: {
          lat: project.location?.lat?.toString() || project.latitude?.toString(),
          lng: project.location?.lng?.toString() || project.longitude?.toString()
        },
        roadType: project.roadType || 'highway',
        highway: project.roadNumber, // 修正：使用 roadNumber 欄位
        startTime: this.formatDateTimeForInput(project.startDate), // 修正：使用 startDate
        endTime: this.formatDateTimeForInput(project.endDate) // 修正：使用 endDate
      }
      this.showEditProjectModal = true
    },
    
    async updateProject() {
      // 子專案只需要名稱和描述
      if (this.isEditingChildProject) {
        if (!this.editingProject.eventName || !this.editingProject.description) {
          await alert('請填寫完整的事件資料', '資料不完整', this.isDarkMode)
          return
        }
      } else {
        // 母專案需要完整資料
      if (!this.editingProject.eventName || !this.editingProject.description || !this.editingProject.location.lat || !this.editingProject.location.lng || !this.editingProject.startTime || !this.editingProject.endTime) {
        await alert('請填寫完整的專案資料', '資料不完整', this.isDarkMode)
        return
      }
      
      // 驗證結束時間要晚於開始時間
      if (new Date(this.editingProject.endTime) <= new Date(this.editingProject.startTime)) {
        await alert('結束時間必須晚於開始時間', '時間設定錯誤', this.isDarkMode)
        return
        }
      }
      
      try {
        // 準備要發送到後端的資料
        let updateData
        if (this.isEditingChildProject) {
          // 子專案只更新名稱和描述
          updateData = {
            name: this.editingProject.eventName,
            description: this.editingProject.description
          }
        } else {
          // 母專案更新完整資料
          updateData = {
          name: this.editingProject.eventName,
          description: this.editingProject.description,
          locationGeometry: {
            type: 'Point',
            coordinates: [parseFloat(this.editingProject.location.lng), parseFloat(this.editingProject.location.lat)]
          },
          roadType: this.editingProject.roadType,
          roadNumber: this.editingProject.highway,
          startDate: new Date(this.editingProject.startTime),
          endDate: new Date(this.editingProject.endTime)
          }
        }
        
        // 調用 API 更新專案
        const response = await this.$api.projectAPI.update(this.editingProject.id, updateData)
        
        if (response.success) {
          // 保存是否為子專案的標記（在關閉模態框前）
          const wasChildProject = this.isEditingChildProject
          
          // 更新成功，更新本地列表
          const projectIndex = this.projects.findIndex(p => (p.projectId || p.id) === this.editingProject.id)
      if (projectIndex !== -1) {
        this.projects[projectIndex] = {
          ...this.projects[projectIndex],
              name: this.editingProject.eventName,
          description: this.editingProject.description,
          location: {
            lat: parseFloat(this.editingProject.location.lat),
            lng: parseFloat(this.editingProject.location.lng)
          },
          roadType: this.editingProject.roadType,
              roadNumber: this.editingProject.highway,
              startDate: new Date(this.editingProject.startTime),
              endDate: new Date(this.editingProject.endTime)
            }
        }
        this.showEditProjectModal = false
        this.isEditingChildProject = false
        await success(wasChildProject ? '事件紀錄更新成功！' : '專案更新成功！', '更新成功', this.isDarkMode)
        } else {
          await alert(response.message || '更新專案失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('更新專案錯誤:', error)
        await alert('更新專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
      }
    },
    
    // 刪除專案
    async deleteProject(project) {
      const confirmed = await confirm(`確定要刪除專案「${project.name}」嗎？`, '確認刪除', this.isDarkMode)
      if (confirmed) {
        try {
          // 調用後端 API 軟刪除專案
          const response = await this.$api.projectAPI.delete(project.projectId)
          
          if (response.success) {
            // 從本地專案列表中移除
            const projectIndex = this.projects.findIndex(p => p.projectId === project.projectId)
        if (projectIndex !== -1) {
              this.projects.splice(projectIndex, 1)
            }
          await success('專案已移至垃圾桶', '刪除成功', this.isDarkMode)
          } else {
            await alert(response.message || '刪除專案失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('刪除專案錯誤:', error)
          await alert('刪除專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 格式化日期時間為input格式
    formatDateTimeForInput(date) {
      return dayjs(date).format('YYYY-MM-DDTHH:mm')
    },
    
    // 還原專案
    async restoreProject(project) {
      const confirmed = await confirm(`確定要還原專案「${project.name}」嗎？`, '還原專案', this.isDarkMode)
      if (confirmed) {
        try {
          // 調用後端 API 還原專案
          const response = await this.$api.projectAPI.restore(project.projectId)
          
          if (response.success) {
            // 從垃圾桶中移除
            const trashIndex = this.trashProjects.findIndex(p => p.projectId === project.projectId)
        if (trashIndex !== -1) {
              this.trashProjects.splice(trashIndex, 1)
            }
            // 重新載入專案列表
            await this.loadProjects()
          await success('專案已還原', '還原成功', this.isDarkMode)
          } else {
            await alert(response.message || '還原專案失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('還原專案錯誤:', error)
          await alert('還原專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 永久刪除專案
    async permanentDeleteProject(project) {
      const confirmed = await confirm(`確定要永久刪除專案「${project.name}」嗎？此操作無法復原。`, '永久刪除', this.isDarkMode)
      if (confirmed) {
        try {
          // 調用後端 API 永久刪除專案
          const response = await this.$api.projectAPI.delete(project.projectId)
          
          if (response.success) {
            // 從垃圾桶中移除
            const trashIndex = this.trashProjects.findIndex(p => p.projectId === project.projectId)
        if (trashIndex !== -1) {
          this.trashProjects.splice(trashIndex, 1)
            }
          await success('專案已永久刪除', '刪除成功', this.isDarkMode)
          } else {
            await alert(response.message || '永久刪除專案失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('永久刪除專案錯誤:', error)
          await alert('永久刪除專案時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 下載報告
    downloadReport(report) {
      // 模擬下載功能
      console.log('下載報告:', report.title)
      // 這裡可以實現實際的下載邏輯
    },
    
    // 上傳報告
    uploadReport() {
      // 模擬上傳功能
      console.log('上傳報告')
      // 這裡可以實現實際的上傳邏輯
    },
    
    formatDateTime(date) {
      return dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    
    async loadProjects() {
      try {
        console.log('開始載入母專案列表...')
        const response = await this.$api.get('/parent-projects')
        console.log('API 響應:', response)
        
        if (response && response.success) {
          // 載入母專案列表
          this.parentProjects = response.data || []
          console.log('成功載入母專案列表，專案數量:', this.parentProjects.length)
          
          // 載入每個母專案的子專案
          for (const parent of this.parentProjects) {
            await this.loadChildProjects(parent.project_id)
          }
          
          // 保持向後兼容，保留原有 projects 數據結構（用於其他功能）
          // 先加入母專案
          this.projects = this.parentProjects.map(parent => ({
            projectId: parent.project_id,
            name: parent.name,
            description: parent.description,
                location: {
              lat: parent.latitude || parent.location?.lat,
              lng: parent.longitude || parent.location?.lng
            },
            roadType: parent.road_type,
            roadNumber: parent.road_number,
            roadSection: parent.road_section,
            startDate: null,
            endDate: null,
            // 明確標記為母專案
            is_parent: true,
            parent_project_id: null
          }))
          
          // 再加入所有子專案
          console.log('開始加入子專案到 projects 數組')
          console.log('childProjectsMap:', this.childProjectsMap)
          this.parentProjects.forEach(parent => {
            const children = this.getChildProjects(parent.project_id) || []
            console.log(`母專案 ${parent.project_id} (${parent.name}) 的子專案數量:`, children.length)
            children.forEach(child => {
              const childProject = {
                projectId: child.project_id,
                name: child.name,
                description: child.description,
                location: {
                  lat: child.latitude || child.location?.lat || parent.latitude || parent.location?.lat,
                  lng: child.longitude || child.location?.lng || parent.longitude || parent.location?.lng
                },
                roadType: child.road_type || parent.road_type,
                roadNumber: child.road_number || parent.road_number,
                roadSection: child.road_section || parent.road_section,
                startDate: child.event_date || null,
                endDate: null,
                // 明確標記為子專案
                is_parent: false,
                parent_project_id: parent.project_id
              }
              console.log('加入子專案:', {
                projectId: childProject.projectId,
                name: childProject.name,
                is_parent: childProject.is_parent,
                parent_project_id: childProject.parent_project_id
              })
              this.projects.push(childProject)
            })
          })
          
          console.log('專案列表載入完成，總數:', this.projects.length, '（母專案:', this.parentProjects.length, '子專案:', this.projects.length - this.parentProjects.length, '）')
          console.log('完整的 projects 列表:', this.projects.map(p => ({
            id: p.projectId,
            name: p.name,
            is_parent: p.is_parent,
            parent_project_id: p.parent_project_id
          })))
        } else {
          console.error('載入母專案列表失敗:', response?.message || '未知錯誤')
          this.parentProjects = []
        }
      } catch (error) {
        console.error('載入母專案列表錯誤:', error)
        this.loadSampleData()
      }
    },
    
    // 載入子專案列表
    async loadChildProjects(parentId) {
      try {
        const response = await this.$api.get(`/parent-projects/${parentId}/children`)
        if (response && response.success) {
          this.childProjectsMap = {
            ...this.childProjectsMap,
            [parentId]: response.data.children || []
          }
          console.log(`母專案 ${parentId} 的子專案:`, response.data.children.length, '個')
        }
      } catch (error) {
        console.error(`載入母專案 ${parentId} 的子專案失敗:`, error)
        this.childProjectsMap = {
          ...this.childProjectsMap,
          [parentId]: []
        }
      }
    },
    
    // 獲取子專案列表
    getChildProjects(parentId) {
      return this.childProjectsMap[parentId] || []
    },
    
    // 獲取所有子專案用於地圖顯示（按時間排序並添加順序號）
    getAllChildProjectsForMap() {
      const allChildren = []
      let orderNumber = 1
      
      // 遍歷所有母專案，收集子專案
      this.parentProjects.forEach(parent => {
        const children = this.getChildProjects(parent.project_id) || []
        children.forEach(child => {
          // 提取座標（優先使用子專案本身的座標，否則使用母專案的座標）
          let lat = null
          let lng = null
          
          // 優先使用子專案本身的座標
          if (child.latitude && child.longitude) {
            lat = parseFloat(child.latitude)
            lng = parseFloat(child.longitude)
          } else if (child.location_geometry && child.location_geometry.coordinates) {
            lng = parseFloat(child.location_geometry.coordinates[0])
            lat = parseFloat(child.location_geometry.coordinates[1])
          } else {
            // 使用母專案的座標
            if (parent.latitude && parent.longitude) {
              lat = parseFloat(parent.latitude)
              lng = parseFloat(parent.longitude)
            } else if (parent.location_geometry && parent.location_geometry.coordinates) {
              lng = parseFloat(parent.location_geometry.coordinates[0])
              lat = parseFloat(parent.location_geometry.coordinates[1])
            }
          }
          
          // 只有當有有效座標時才添加到列表
          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            allChildren.push({
              ...child,
              location: { lat, lng },
              orderNumber: orderNumber++,
              parentProject: {
                project_id: parent.project_id,
                name: parent.name
              }
            })
          }
        })
      })
      
      // 按 event_date 排序（最舊的在前）
      allChildren.sort((a, b) => {
        const dateA = a.event_date ? new Date(a.event_date) : new Date(a.created_at || 0)
        const dateB = b.event_date ? new Date(b.event_date) : new Date(b.created_at || 0)
        return dateA - dateB
      })
      
      // 重新分配順序號（按排序後的順序）
      allChildren.forEach((child, index) => {
        child.orderNumber = index + 1
      })
      
      return allChildren
    },
    
    // 處理母專案創建成功
    async handleParentCreated(parentProject) {
      console.log('母專案創建成功:', parentProject)
      await this.loadProjects()
    },
    
    // 處理新增子專案
    handleAddChild(parentProject) {
      this.selectedParentProject = parentProject
      this.showCreateChildModal = true
    },
    
    // 處理子專案創建成功
    async handleChildCreated(childProject) {
      console.log('子專案創建成功:', childProject)
      // 重新載入該母專案的子專案列表
      await this.loadChildProjects(childProject.parent_project_id)
    },
    
    // 處理定位母專案
    handleOpenParentProject(parentProject) {
      console.log('打開母專案:', parentProject)
      
      // 構建專案對象，確保包含所有必要屬性
      const project = {
        projectId: parentProject.project_id || parentProject.projectId,
        project_id: parentProject.project_id,
        name: parentProject.name,
        description: parentProject.description,
        // 明確標記為母專案
        is_parent: true,
        parent_project_id: null,
        // 提取座標（支援多種格式）
        location: null,
        latitude: parentProject.latitude,
        longitude: parentProject.longitude,
        roadType: parentProject.road_type,
        roadNumber: parentProject.road_number,
        roadSection: parentProject.road_section
      }
      
      // 提取座標（支援多種格式）
      let lat = null
      let lng = null
      
      if (parentProject.latitude && parentProject.longitude) {
        lat = parentProject.latitude
        lng = parentProject.longitude
      } else if (parentProject.location_geometry && parentProject.location_geometry.coordinates) {
        lng = parentProject.location_geometry.coordinates[0]
        lat = parentProject.location_geometry.coordinates[1]
      } else if (parentProject.location) {
        lat = parentProject.location.lat
        lng = parentProject.location.lng
      }
      
      // 設置 location 對象
      if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        project.location = {
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          }
        }
      
      // 打開專案地圖
        this.openProjectDetailMap(project)
    },
    
    // 處理編輯母專案
    handleEditParent(parentProject) {
      console.log('編輯母專案:', parentProject)
      this.selectedParentForEdit = parentProject
      this.showEditParentModal = true
    },
    
    // 處理母專案更新成功
    async handleParentUpdated(updatedParent) {
      console.log('母專案更新成功:', updatedParent)
      // 重新載入母專案列表
      await this.loadParentProjects()
      // 關閉模態框
      this.showEditParentModal = false
      this.selectedParentForEdit = null
    },
    
    // 地圖準備完成事件處理（自動加載里程點，類似預警模組）
    onMapReady(map) {
      console.log('[DisasterCollection] 🗺️ 地圖準備完成，自動加載里程點...')
      
      // 監聽地圖縮放事件（用於控制數字標籤顯示）
      map.on('zoomend', () => {
        const currentZoom = map.getZoom()
        console.log('[DisasterCollection] 地圖縮放變化:', currentZoom)
        // 當縮放級別在 16-20 之間且開啟了標籤顯示時，更新 tooltip
        if (this.mileageLabelVisible) {
          this.toggleMileageLabel() // 重新應用 tooltip 狀態
          this.toggleMileageLabel() // 兩次調用以保持當前狀態
        }
      })
      
      // 地圖初始化完成後，自動加載里程點（常駐顯示）
      this.$nextTick(() => {
        this.loadMileagePoints()
      })
    },
    
    // 切換省道里程樁號顯示（保留作為備用，但主要是自動顯示）
    async toggleHighwayMileage() {
      this.highwayMileageVisible = !this.highwayMileageVisible
      console.log('[DisasterCollection] 🔄 切換省道里程樁號顯示:', this.highwayMileageVisible)
      
      const map = this.$refs.projectMapRef?.map
      if (!map) {
        console.warn('[DisasterCollection] ❌ 地圖未初始化')
        return
      }
      
      if (this.highwayMileageVisible) {
        // 顯示桩號
        if (this.mileagePointsLayer && !map.hasLayer(this.mileagePointsLayer)) {
          this.mileagePointsLayer.addTo(map)
          console.log('[DisasterCollection] ✅ 顯示桩號圖層')
        }
      } else {
        // 隱藏桩號
        if (this.mileagePointsLayer && map.hasLayer(this.mileagePointsLayer)) {
          map.removeLayer(this.mileagePointsLayer)
          console.log('[DisasterCollection] ✅ 隱藏桩號圖層')
        }
      }
    },
    
    // 載入桩號點位數據（類似預警模組）
    async loadMileagePoints() {
      console.log('='.repeat(80))
      console.log('[DisasterCollection] 🚀 開始載入桩號數據...')
      console.log('[DisasterCollection] 調用堆棧:', new Error().stack)
      
      try {
        // 確保地圖已初始化
        console.log('[DisasterCollection] 檢查 $refs.projectMapRef:', !!this.$refs.projectMapRef)
        console.log('[DisasterCollection] 檢查 $refs.projectMapRef.map:', !!this.$refs.projectMapRef?.map)
        
        if (!this.$refs.projectMapRef || !this.$refs.projectMapRef.map) {
          console.warn('[DisasterCollection] ❌ 地圖未初始化，無法載入桩號')
          return
        }
        
        const map = this.$refs.projectMapRef.map
        console.log('[DisasterCollection] ✅ 地圖實例獲取成功, map:', map)
        console.log('[DisasterCollection] 地圖中心:', map.getCenter())
        console.log('[DisasterCollection] 地圖縮放:', map.getZoom())
        
        // 載入 GeoJSON 文件
        console.log('[DisasterCollection] 📡 開始 fetch: /data/uploads/geojson/alertRoad.geojson')
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson')
        console.log('[DisasterCollection] 📥 Fetch 完成 - ok:', response.ok, 'status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        console.log('[DisasterCollection] 🔄 開始解析 JSON...')
        const geojsonData = await response.json()
        console.log('[DisasterCollection] ✅ JSON 解析成功')
        console.log('[DisasterCollection] 數據類型:', geojsonData.type)
        console.log('[DisasterCollection] Features 數量:', geojsonData.features?.length)
        console.log('[DisasterCollection] 第一個 feature:', geojsonData.features?.[0])
        
        // 移除舊圖層
        if (this.mileagePointsLayer) {
          console.log('[DisasterCollection] 🗑️ 移除舊圖層')
          if (map.hasLayer(this.mileagePointsLayer)) {
            map.removeLayer(this.mileagePointsLayer)
          }
          this.mileagePointsLayer = null
        }
        
        // 創建新的 GeoJSON 圖層
        console.log('[DisasterCollection] 🎨 開始創建 GeoJSON 圖層...')
        this.mileagePointsLayer = L.geoJSON(geojsonData, {
          pointToLayer: (feature, latlng) => {
            console.log('[DisasterCollection] 創建點位:', latlng, feature.properties?.里程數)
            return L.circleMarker(latlng, {
              radius: 4,
              fillColor: '#ef4444', // 紅色
              color: '#ffffff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            })
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {}
            
            // 保存 feature 到 layer，以便後續更新 tooltip
            layer.feature = feature
            
            // 綁定 popup（點擊時顯示詳細信息）
            const popupContent = `
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${props.里程數 || '未知里程'}</h3>
                <p style="margin: 4px 0;"><strong>公路編號：</strong>${props.公路編 || '未知'}</p>
                <p style="margin: 4px 0;"><strong>工務段：</strong>${props.工務段 || '未知'}</p>
                <p style="margin: 4px 0;"><strong>位置：</strong>${props.縣市別 || ''}${props.鄉鎮區 || ''}${props.村里 || ''}</p>
              </div>
            `
            layer.bindPopup(popupContent)
          }
        })
        
        console.log('[DisasterCollection] ✅ GeoJSON 圖層創建完成:', this.mileagePointsLayer)
        console.log('[DisasterCollection] 圖層中的 layers 數量:', this.mileagePointsLayer.getLayers().length)
        
        // 添加到地圖
        console.log('[DisasterCollection] 📌 開始將圖層添加到地圖...')
        this.mileagePointsLayer.addTo(map)
        console.log('[DisasterCollection] ✅ 圖層已添加到地圖')
        console.log('[DisasterCollection] 地圖中是否包含該圖層:', map.hasLayer(this.mileagePointsLayer))
        
        // 驗證圖層是否真的在地圖上
        const allLayers = []
        map.eachLayer((layer) => {
          allLayers.push(layer.constructor.name)
        })
        console.log('[DisasterCollection] 地圖上所有圖層:', allLayers)
        
      } catch (error) {
        console.error('[DisasterCollection] ❌ 載入桩號數據失敗:', error)
        console.error('[DisasterCollection] 錯誤堆棧:', error.stack)
      }
      
      console.log('='.repeat(80))
    },
    
    // 切換里程數字標籤顯示（類似預警模組）
    toggleMileageLabel() {
      this.mileageLabelVisible = !this.mileageLabelVisible
      console.log('[DisasterCollection] 切換里程數字標籤顯示:', this.mileageLabelVisible)
      
      // 更新里程點圖層的 tooltip 顯示狀態
      if (this.mileagePointsLayer) {
        const map = this.$refs.projectMapRef?.map
        if (!map) return
        
        const currentZoom = map.getZoom()
        const shouldShow = this.mileageLabelVisible && currentZoom >= 16 && currentZoom <= 20
        
        this.mileagePointsLayer.eachLayer((layer) => {
          if (shouldShow) {
            // 顯示 tooltip
            if (!layer.getTooltip()) {
              const feature = layer.feature
              const mileage = feature?.properties?.里程數
              if (mileage) {
                layer.bindTooltip(mileage, {
                  permanent: true,
                  direction: 'top',
                  offset: [0, -10],
                  className: 'mileage-tooltip',
                  opacity: 1
                })
              }
            } else {
              layer.openTooltip()
            }
          } else {
            // 隱藏 tooltip
            if (layer.getTooltip()) {
              layer.unbindTooltip()
            }
          }
        })
        
        console.log('[DisasterCollection] 里程數字標籤更新完成，狀態:', shouldShow)
      }
    },
    
    // 處理刪除母專案
    async handleDeleteParent(parentProject) {
      if (!await confirm(`確定要刪除地點「${parentProject.name}」嗎？\n\n此操作將同時刪除所有相關的時期專案！`, '刪除確認', this.isDarkMode)) {
        return
      }
      
      try {
        const response = await this.$api.delete(`/parent-projects/${parentProject.project_id}`)
        if (response && response.success) {
          console.log('母專案刪除成功')
          await this.loadProjects()
          await success('地點專案已刪除', '刪除成功', this.isDarkMode)
        } else {
          await alert(response?.message || '刪除失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('刪除母專案失敗:', error)
        // 顯示後端返回的具體錯誤訊息
        const errorMessage = error.response?.data?.message || error.message || '刪除地點專案時發生錯誤，請稍後再試'
        await alert(errorMessage, '錯誤', this.isDarkMode)
      }
    },
    
    // ===== 報告連結管理 =====
    async loadAllReportLinks() {
      try {
        await Promise.all(
          this.parentProjects.map(async (parent) => {
            try {
              const response = await this.$api.get(`/parent-projects/${parent.project_id}/report-links`)
              if (response && response.success) {
                this.syncReportLinksToParent(parent.project_id, response.data)
              }
            } catch (e) {
              // 單一專案失敗不影響其他
            }
          })
        )
      } catch (error) {
        console.error('批次載入報告連結失敗:', error)
      }
    },

    async openReportLinkModal(parentProject) {
      this.reportLinkTargetProject = parentProject
      this.newReportLink = { title: '', url: '' }
      this.showReportLinkModal = true
      await this.fetchReportLinks()
    },

    closeReportLinkModal() {
      this.showReportLinkModal = false
      this.reportLinkTargetProject = null
      this.reportLinkList = []
      this.newReportLink = { title: '', url: '' }
      this.editingLinkId = null
      this.editingLink = { title: '', url: '' }
    },

    async fetchReportLinks() {
      if (!this.reportLinkTargetProject) return
      try {
        const response = await this.$api.get(
          `/parent-projects/${this.reportLinkTargetProject.project_id}/report-links`
        )
        if (response && response.success) {
          this.reportLinkList = response.data
          // 同步更新 parentProjects 中的連結資料（供卡片顯示數量）
          this.syncReportLinksToParent(this.reportLinkTargetProject.project_id, response.data)
        }
      } catch (error) {
        console.error('取得報告連結失敗:', error)
      }
    },

    syncReportLinksToParent(projectId, links) {
      const idx = this.parentProjects.findIndex(p => p.project_id === projectId)
      if (idx !== -1) {
        const current = this.parentProjects[idx]
        this.parentProjects[idx] = {
          ...current,
          metadata: { ...(current.metadata || {}), reportLinks: links }
        }
      }
    },

    async addReportLink() {
      const title = this.newReportLink.title.trim()
      const url = this.newReportLink.url.trim()
      if (!title || !url) return

      this.isSavingReportLink = true
      try {
        const response = await this.$api.post(
          `/parent-projects/${this.reportLinkTargetProject.project_id}/report-links`,
          { title, url }
        )
        if (response && response.success) {
          this.reportLinkList.push(response.data)
          this.syncReportLinksToParent(this.reportLinkTargetProject.project_id, this.reportLinkList)
          this.newReportLink = { title: '', url: '' }
        } else {
          await alert(response?.message || '新增失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('新增報告連結失敗:', error)
        await alert('新增報告連結失敗，請稍後再試', '錯誤', this.isDarkMode)
      } finally {
        this.isSavingReportLink = false
      }
    },

    startEditLink(link) {
      this.editingLinkId = link.id
      this.editingLink = { title: link.title, url: link.url }
    },

    cancelEditLink() {
      this.editingLinkId = null
      this.editingLink = { title: '', url: '' }
    },

    async saveEditLink(linkId) {
      const title = this.editingLink.title.trim()
      const url = this.editingLink.url.trim()
      if (!title || !url) return

      this.isSavingEditLink = true
      try {
        const response = await this.$api.put(
          `/parent-projects/${this.reportLinkTargetProject.project_id}/report-links/${linkId}`,
          { title, url }
        )
        if (response && response.success) {
          const idx = this.reportLinkList.findIndex(l => l.id === linkId)
          if (idx !== -1) {
            this.reportLinkList[idx] = response.data
          }
          this.syncReportLinksToParent(this.reportLinkTargetProject.project_id, this.reportLinkList)
          this.cancelEditLink()
        } else {
          await alert(response?.message || '更新失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('更新報告連結失敗:', error)
        await alert('更新報告連結失敗，請稍後再試', '錯誤', this.isDarkMode)
      } finally {
        this.isSavingEditLink = false
      }
    },

    async removeReportLink(linkId) {
      try {
        const response = await this.$api.delete(
          `/parent-projects/${this.reportLinkTargetProject.project_id}/report-links/${linkId}`
        )
        if (response && response.success) {
          this.reportLinkList = this.reportLinkList.filter(l => l.id !== linkId)
          this.syncReportLinksToParent(this.reportLinkTargetProject.project_id, this.reportLinkList)
        } else {
          await alert(response?.message || '刪除失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('刪除報告連結失敗:', error)
        await alert('刪除報告連結失敗，請稍後再試', '錯誤', this.isDarkMode)
      }
    },
    // ===== 報告連結管理結束 =====

    // 處理開啟子專案
    handleOpenChild(childProject) {
      console.log('開啟子專案:', childProject)
      
      // 提取座標（從母專案資訊或子專案本身）
      let lat = null
      let lng = null
      
      // 優先從子專案的母專案資訊中獲取
      if (childProject.parent_latitude && childProject.parent_longitude) {
        lat = childProject.parent_latitude
        lng = childProject.parent_longitude
      } else if (childProject.parent_location_geometry && childProject.parent_location_geometry.coordinates) {
        lng = childProject.parent_location_geometry.coordinates[0]
        lat = childProject.parent_location_geometry.coordinates[1]
      } else {
        // 如果沒有母專案座標，嘗試從父專案列表中獲取
        const parentId = childProject.parent_project_id
        const parentProject = this.parentProjects.find(p => p.project_id === parentId)
        if (parentProject) {
          if (parentProject.latitude && parentProject.longitude) {
            lat = parentProject.latitude
            lng = parentProject.longitude
          } else if (parentProject.location_geometry && parentProject.location_geometry.coordinates) {
            lng = parentProject.location_geometry.coordinates[0]
            lat = parentProject.location_geometry.coordinates[1]
          }
        }
      }
      
      // 構建專案對象
      const project = {
        projectId: childProject.project_id,
        name: childProject.name,
        description: childProject.description,
        startDate: childProject.start_date,
        endDate: childProject.end_date,
        is_parent: false,
        parent_project_id: childProject.parent_project_id || null
      }
      
      // 只有在有有效座標時才設置 location
      if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        project.location = {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        }
      } else {
        console.warn('子專案沒有有效的座標資訊:', childProject)
        alert('此時期專案沒有有效的座標資訊，無法顯示地圖')
        return
      }
      
      this.openProjectDetailMap(project)
    },
    
    // 處理編輯子專案
    handleEditChild(childProject) {
      console.log('編輯子專案:', childProject)
      this.selectedChildProject = childProject
      this.showEditChildModal = true
    },
    
    // 處理子專案更新完成
    async handleChildUpdated(updatedChildProject) {
      console.log('子專案更新完成:', updatedChildProject)
      // 重新載入該母專案的子專案列表
      if (updatedChildProject.parent_project_id) {
        await this.loadChildProjects(updatedChildProject.parent_project_id)
      }
      // 更新父專案列表（因為子專案數量可能會變化）
      await this.loadProjects()
      await success('時期專案已更新', '更新成功', this.isDarkMode)
    },
    
    // 處理刪除子專案
    async handleDeleteChild(childProject) {
      console.log('DisasterCollection: handleDeleteChild 被調用', childProject)
      // 注意：確認對話框已在 ChildProjectTimeline 組件中處理
      // 這裡直接執行刪除操作
      try {
        console.log('開始刪除子專案:', childProject.project_id)
        const response = await this.$api.delete(`/child-projects/${childProject.project_id}`)
        console.log('刪除API響應:', response)
        
        if (response && response.success) {
          console.log('子專案刪除成功')
          // 重新載入該母專案的子專案列表
          if (childProject.parent_project_id) {
            await this.loadChildProjects(childProject.parent_project_id)
          }
          // 重新載入整個專案列表以更新母專案的 child_count
          await this.loadProjects()
          await success('時期專案已刪除', '刪除成功', this.isDarkMode)
        } else {
          console.error('刪除失敗，響應:', response)
          await alert(response?.message || '刪除失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('刪除子專案失敗:', error)
        console.error('錯誤詳情:', {
          message: error.message,
          response: error.response,
          data: error.response?.data
        })
        // 顯示後端返回的具體錯誤訊息
        const errorMessage = error.response?.data?.message || error.message || '刪除時期專案時發生錯誤，請稍後再試'
        await alert(errorMessage, '錯誤', this.isDarkMode)
      }
    },
    
    loadSampleData() {
      // 載入台7線49.8K專案（範例資料）
      this.projects = [
        {
          projectId: '4930d5a5-3ab7-4b20-979e-d3c5b7fba4b4', // 使用有效的 UUID 格式
          name: '台7線49.8K',
          description: '113年11月7日大曼邊坡空拍任務',
          locationGeometry: {
            type: 'Point',
            coordinates: [121.40511190135854, 24.67527860016387]
          },
          location: {
            lat: 24.67527860016387,
            lng: 121.40511190135854
          },
          roadType: 'highway',
          roadNumber: '台7線',
          startDate: new Date('2024-11-07 08:59:00'),
          endDate: new Date('2024-11-07 17:00:00'),
          status: 'active',
          createdAt: new Date('2024-11-07 08:59:00'),
          isBookmarked: false
        }
      ]
      console.log('載入範例資料，專案數量:', this.projects.length)
    },
    
    // 獲取資料圖標樣式
    getDataIconClass(type) {
      const baseClass = 'transition-colors duration-300'
      switch (type) {
        case 'CSV':
          return `${baseClass} ${this.isDarkMode ? 'bg-green-900' : 'bg-green-100'}`
        case 'PDF':
          return `${baseClass} ${this.isDarkMode ? 'bg-red-900' : 'bg-red-100'}`
        case 'Excel':
          return `${baseClass} ${this.isDarkMode ? 'bg-green-900' : 'bg-green-100'}`
        case 'JSON':
          return `${baseClass} ${this.isDarkMode ? 'bg-yellow-900' : 'bg-yellow-100'}`
        default:
          return `${baseClass} ${this.isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`
      }
    },
    
    // 獲取資料圖標文字樣式
    getDataIconTextClass(type) {
      const baseClass = 'transition-colors duration-300'
      switch (type) {
        case 'CSV':
          return `${baseClass} ${this.isDarkMode ? 'text-green-300' : 'text-green-600'}`
        case 'PDF':
          return `${baseClass} ${this.isDarkMode ? 'text-red-300' : 'text-red-600'}`
        case 'Excel':
          return `${baseClass} ${this.isDarkMode ? 'text-green-300' : 'text-green-600'}`
        case 'JSON':
          return `${baseClass} ${this.isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`
        default:
          return `${baseClass} ${this.isDarkMode ? 'text-gray-300' : 'text-gray-600'}`
      }
    },
    
    // 獲取資料圖標文字
    getDataIconText(type) {
      switch (type) {
        case 'CSV':
          return 'CSV'
        case 'PDF':
          return 'PDF'
        case 'Excel':
          return 'XLS'
        case 'JSON':
          return 'JSON'
        default:
          return 'FILE'
      }
    },
    
    // 還原資料
    async restoreData(data) {
      const confirmed = await confirm(`確定要還原資料「${data.name}」嗎？`, '還原資料', this.isDarkMode)
      if (confirmed) {
        try {
          const response = await this.$api.dataFileAPI.restore(data.id)
          if (response && response.success) {
            // 從垃圾桶中移除
        const trashIndex = this.trashData.findIndex(d => d.id === data.id)
        if (trashIndex !== -1) {
          this.trashData.splice(trashIndex, 1)
            }
          await success('資料已還原', '還原成功', this.isDarkMode)
          } else {
            await alert(response?.message || '還原資料失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('還原資料錯誤:', error)
          await alert('還原資料時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 永久刪除資料
    async permanentDeleteData(data) {
      const confirmed = await confirm(`確定要永久刪除資料「${data.name}」嗎？此操作無法復原。`, '永久刪除', this.isDarkMode)
      if (confirmed) {
        try {
          const response = await this.$api.dataFileAPI.permanentDelete(data.id)
          if (response && response.success) {
            // 從垃圾桶中移除
        const trashIndex = this.trashData.findIndex(d => d.id === data.id)
        if (trashIndex !== -1) {
          this.trashData.splice(trashIndex, 1)
            }
          await success('資料已永久刪除', '刪除成功', this.isDarkMode)
          } else {
            await alert(response?.message || '永久刪除資料失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('永久刪除資料錯誤:', error)
          await alert('永久刪除資料時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 報告相關方法
    async toggleReportBookmark(report) {
      try {
        // 調用後端 API 切換標記狀態
        const response = await this.$api.reportAPI.toggleBookmark(report.reportId)

        if (response.success) {
          // 更新本地狀態
          report.isBookmarked = !report.isBookmarked
          const action = report.isBookmarked ? '已標記' : '已取消標記'
          await success(`報告「${report.title}」${action}`, '標記狀態', this.isDarkMode)
        } else {
          // 如果 API 失敗，恢復原狀態
          report.isBookmarked = !report.isBookmarked
          await alert(response.message || '標記操作失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('標記報告錯誤:', error)
        // 如果 API 失敗，恢復原狀態
        report.isBookmarked = !report.isBookmarked
        await alert('標記報告時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
      }
    },
    
    editReport(report) {
      // 設置編輯資料
      this.editingReport = {
        id: report.reportId,
        title: report.title,
        description: report.description,
        fileType: report.fileType,
        filePath: report.filePath,
        fileName: report.fileName
      }
      this.showEditReportModal = true
    },
    
    async deleteReport(report) {
      const confirmed = await confirm(`確定要刪除報告「${report.title}」嗎？`, '確認刪除', this.isDarkMode)
      if (confirmed) {
        try {
          // 調用後端 API 軟刪除報告
          const response = await this.$api.reportAPI.delete(report.reportId)

          if (response.success) {
            // 從本地報告列表中移除
            const reportIndex = this.reports.findIndex(r => r.reportId === report.reportId)
            if (reportIndex !== -1) {
              this.reports.splice(reportIndex, 1)
            }
            await success('報告已移至垃圾桶', '刪除成功', this.isDarkMode)
          } else {
            await alert(response.message || '刪除報告失敗', '錯誤', this.isDarkMode)
          }
        } catch (error) {
          console.error('刪除報告錯誤:', error)
          await alert('刪除報告時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
        }
      }
    },
    
    // 重置報告表單
    resetReportForm() {
      this.newReport = {
        title: '',
        description: '',
        fileType: 'pdf',
        filePath: '',
        fileName: ''
      }
    },
    
    // 處理檔案上傳
    handleFileUpload(event) {
      const file = event.target.files[0]
      if (file) {
        this.newReport.fileName = file.name
        this.newReport.filePath = file.name // 暫時使用檔案名稱，實際應該上傳到服務器
        console.log('選擇的檔案:', file.name)
      }
    },
    
    // 創建報告
    async createReport() {
      try {
        // 驗證必填字段
        if (!this.newReport.title) {
          await alert('請輸入報告標題', '驗證錯誤', this.isDarkMode)
          return
        }
        
        if (!this.newReport.fileType) {
          await alert('請選擇檔案類型', '驗證錯誤', this.isDarkMode)
          return
        }
        
        if (this.newReport.fileType === 'pdf' && !this.newReport.fileName) {
          await alert('請選擇 PDF 檔案', '驗證錯誤', this.isDarkMode)
          return
        }
        
        if (this.newReport.fileType === 'url' && !this.newReport.filePath) {
          await alert('請輸入 URL 連結', '驗證錯誤', this.isDarkMode)
          return
        }
        
        // 準備報告數據
        const reportData = {
          title: this.newReport.title,
          description: this.newReport.description || '',
          fileType: this.newReport.fileType,
          filePath: this.newReport.filePath,
          fileName: this.newReport.fileName || ''
        }
        
        console.log('創建報告數據:', reportData)
        
        // 調用後端 API 創建報告
        const response = await this.$api.reportAPI.create(reportData)
        
        if (response && response.success) {
          // 創建成功，重新載入報告列表
          await this.loadReports()
          // 重置表單
          this.resetReportForm()
          // 關閉模態框
          this.showCreateReportModal = false
          // 顯示成功訊息
          await success('報告創建成功！', '創建成功', this.isDarkMode)
        } else {
          await alert(response?.message || '創建報告失敗', '錯誤', this.isDarkMode)
        }
      } catch (error) {
        console.error('創建報告錯誤:', error)
        await alert('創建報告時發生錯誤，請稍後再試', '錯誤', this.isDarkMode)
      }
    }
  }
}
</script> 

<style scoped>
/* 里程數字標籤樣式（與預警模組一致） */
:deep(.mileage-tooltip) {
  background-color: rgba(255, 255, 255, 0.95) !important;
  color: #1f2937 !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
  white-space: nowrap !important;
}

:deep(.mileage-tooltip::before) {
  border-top-color: rgba(0, 0, 0, 0.1) !important;
}
</style> 