<template>
  <Teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-[1200] flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-2xl shadow-2xl mx-4 flex flex-col transition-all duration-300"
         :class="[
           isDarkMode ? 'bg-slate-800' : 'bg-white',
           isEditMode ? 'w-full max-w-2xl max-h-[60vh]' : 'w-full max-w-5xl h-[90vh]'
         ]">
      
      <!-- 標題欄 -->
      <div class="flex items-center justify-between p-6 border-b"
           :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
        <div class="flex-1">
        <h3 class="text-lg font-semibold transition-colors duration-300"
            :class="isDarkMode ? 'text-white' : 'text-gray-900'">
            {{ isEditMode ? '編輯時序資料' : '上傳時序資料' }}
        </h3>
        </div>
        <button @click="closeModal"
                class="p-2 rounded-lg transition-all duration-300 hover:scale-110"
                :class="isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 內容區域 -->
      <div class="flex flex-1 min-h-0">
        <!-- 左側表單區域 -->
        <div :class="[
          'p-6',
          isEditMode ? 'w-full' : ((formData.type === 'csv') ? 'w-1/2 border-r' : 'w-full'),
          isDarkMode ? 'border-slate-600' : 'border-gray-200'
        ]">
          <form @submit.prevent="handleSubmit" class="space-y-4">
          
          <!-- 編輯模式：只顯示名稱和描述 -->
          <template v-if="isEditMode">
            <div class="space-y-4">
              <!-- 資料名稱 -->
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  資料名稱 *
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請輸入時序資料名稱"
                />
              </div>
              
              <!-- 資料描述 -->
              <div>
                <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                  資料描述
                </label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
                  placeholder="請描述時序資料的內容和用途"
                ></textarea>
              </div>
            </div>
          </template>
          
          <!-- 上傳模式：顯示完整表單 -->
          <template v-else>
          <!-- 資料名稱 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料名稱 *
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
              placeholder="請輸入時序資料名稱"
            />
          </div>
          
          <!-- 資料類型 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料類型 *
            </label>
            <select
              v-model="formData.type"
              required
              class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'"
            >
              <option value="">請選擇資料類型</option>
              <option value="shapefile">Shapefile</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          
          <!-- 座標資訊 (CSV 需要，編輯模式下不顯示) -->
          <div v-if="formData.type === 'csv' && !isEditMode" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                經度 *
              </label>
              <input
                v-model="formData.longitude"
                type="number"
                step="any"
                required
                class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'"
                placeholder="例如: 121.5654"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
                緯度 *
              </label>
              <input
                v-model="formData.latitude"
                type="number"
                step="any"
                required
                class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'"
                placeholder="例如: 25.0330"
              />
            </div>
          </div>

          <!-- 圖表樣式選擇 (CSV 需要，編輯模式下不顯示) -->
          <div v-if="formData.type === 'csv' && !isEditMode">
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              圖表樣式 *
            </label>
            <div class="grid grid-cols-2 gap-3">
              <!-- 折線圖 -->
              <label class="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300"
                     :class="[
                       chartConfig.chartType === 'line' 
                         ? (isDarkMode 
                           ? 'border-blue-500 bg-blue-500/10' 
                           : 'border-blue-500 bg-blue-50')
                         : (isDarkMode 
                           ? 'border-slate-600 hover:border-slate-500' 
                           : 'border-gray-300 hover:border-gray-400')
                     ]">
                <input type="radio" 
                       v-model="chartConfig.chartType" 
                       value="line" 
                       class="sr-only" />
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <svg class="w-5 h-5"
                         :class="chartConfig.chartType === 'line' ? 'text-blue-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                    </svg>
                    <span class="font-medium text-sm transition-colors duration-300"
                          :class="chartConfig.chartType === 'line' ? 'text-blue-600' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')">
                      折線圖
                    </span>
                  </div>
                  <p class="text-xs transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                    顯示數據趨勢變化
                  </p>
                </div>
                <div v-if="chartConfig.chartType === 'line'" 
                     class="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </label>

              <!-- 散點圖 -->
              <label class="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300"
                     :class="[
                       chartConfig.chartType === 'scatter' 
                         ? (isDarkMode 
                           ? 'border-blue-500 bg-blue-500/10' 
                           : 'border-blue-500 bg-blue-50')
                         : (isDarkMode 
                           ? 'border-slate-600 hover:border-slate-500' 
                           : 'border-gray-300 hover:border-gray-400')
                     ]">
                <input type="radio" 
                       v-model="chartConfig.chartType" 
                       value="scatter" 
                       class="sr-only" />
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <svg class="w-5 h-5"
                         :class="chartConfig.chartType === 'scatter' ? 'text-blue-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h.01M12 7h.01M16 7h.01M8 12h.01M12 12h.01M16 12h.01M8 17h.01M12 17h.01M16 17h.01M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                    </svg>
                    <span class="font-medium text-sm transition-colors duration-300"
                          :class="chartConfig.chartType === 'scatter' ? 'text-blue-600' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')">
                      散點圖
                    </span>
                  </div>
                  <p class="text-xs transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                    顯示數據分布情況
                  </p>
                </div>
                <div v-if="chartConfig.chartType === 'scatter'" 
                     class="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </label>
            </div>
          </div>
          
          <!-- InSAR 說明（編輯模式下不顯示） -->
          <div v-if="formData.type === 'insar' && !isEditMode" class="p-3 rounded-lg border"
               :class="isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'">
            <div class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-800">InSAR 資料說明</p>
                <p class="text-sm text-blue-700 mt-1">
                  InSAR 資料不需要手動輸入座標，系統會自動從檔案中提取空間資訊。
                </p>
              </div>
            </div>
          </div>
          
          <!-- 雨量資料說明（編輯模式下不顯示） -->
          <div v-if="formData.type === 'rainfall' && !isEditMode" class="p-3 rounded-lg border"
               :class="isDarkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200'">
            <div class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-green-800">雨量資料說明</p>
                <p class="text-sm text-green-700 mt-1">
                  雨量資料需要手動輸入測站座標，請提供測站的經緯度資訊。
                </p>
              </div>
            </div>
          </div>
          
          <!-- 地震資料說明（編輯模式下不顯示） -->
          <div v-if="formData.type === 'earthquake' && !isEditMode" class="p-3 rounded-lg border"
               :class="isDarkMode ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-200'">
            <div class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-orange-800">地震資料說明</p>
                <p class="text-sm text-orange-700 mt-1">
                  地震資料需要手動輸入測站座標，請提供測站的經緯度資訊。
                </p>
              </div>
            </div>
          </div>
          
          <!-- 時間範圍提示（編輯模式下不顯示） -->
          <div v-if="!isEditMode" class="p-3 rounded-lg border"
               :class="isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'">
            <div class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-800">時間範圍說明</p>
                <p class="text-sm text-blue-700 mt-1">
                  時序資料的時間範圍將使用專案的事件起迄時間，無需手動輸入。
                </p>
              </div>
            </div>
          </div>
          
          <!-- 資料描述 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料描述
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              class="w-full px-3 py-2 border rounded-lg transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'"
              placeholder="請描述時序資料的內容和用途"
            ></textarea>
          </div>          
          
          <!-- 檔案上傳區域 -->
          <div>
            <label class="block text-sm font-medium mb-2 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
              資料檔案 *
            </label>
            <div class="border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 hover:border-blue-400"
                 :class="[
                   isDarkMode ? 'border-slate-600 hover:bg-slate-700/50' : 'border-gray-300 hover:bg-gray-50',
                   isDragOver ? (isDarkMode ? 'border-blue-400 bg-blue-400/10' : 'border-blue-400 bg-blue-50') : ''
                 ]"
                 @dragover.prevent="handleDragOver"
                 @dragleave.prevent="handleDragLeave"
                 @drop.prevent="handleDrop">
              
              <input
                ref="fileInput"
                type="file"
                :accept="formData.type === 'csv' ? '.csv' : '.shp,.dbf,.prj,.shx'"
                @change="handleFileSelect"
                class="hidden"
              />
              
              <div v-if="!selectedFile" class="space-y-2">
                <svg class="w-10 h-10 mx-auto transition-colors duration-300"
                     :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p class="text-sm transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  拖拽檔案到這裡或
                  <button type="button" @click="$refs.fileInput.click()"
                          class="text-blue-600 hover:text-blue-700 underline">
                    點擊選擇檔案
                  </button>
                </p>
                <p class="text-xs transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'">
                  {{ formData.type === 'csv' ? '僅支援 CSV 格式' : '支援 Shapefile 格式 (.shp, .dbf, .prj, .shx)' }}
                </p>
              </div>
              
              <div v-else class="space-y-2">
                <svg class="w-6 h-6 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-sm font-medium transition-colors duration-300"
                   :class="isDarkMode ? 'text-white' : 'text-gray-900'">
                  {{ selectedFile.name }}
                </p>
                <p class="text-xs transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                  {{ formatFileSize(selectedFile.size) }}
                </p>
                <button type="button" @click="removeFile"
                        class="text-xs text-red-600 hover:text-red-700 underline">
                  移除檔案
                </button>
              </div>
            </div>
          </div>
          </template>
          
          </form>
        </div>
        
        <!-- 右側預覽區域 (僅 CSV 時顯示，編輯模式下不顯示) -->
        <div v-if="formData.type === 'csv' && !isEditMode" class="w-1/2 p-6"
             :class="isDarkMode ? 'bg-slate-800' : 'bg-gray-50'">
          <div class="space-y-3">
            <h4 class="text-lg font-semibold transition-colors duration-300"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              資料預覽與軸線配置
            </h4>
            
            <!-- 載入狀態 -->
            <div v-if="isParsingFile" class="flex flex-col items-center justify-center py-12 text-center">
              <svg class="w-8 h-8 mb-4 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                正在解析 CSV 檔案...
              </p>
            </div>
            
            <!-- 預覽內容 -->
            <div v-else-if="previewData.length > 0" class="space-y-4">
              <!-- 資料表格預覽 -->
              <div class="rounded-lg border overflow-hidden shadow-sm"
                   :class="isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'">
                <!-- 表格工具欄 -->
                <div class="flex items-center justify-between p-3 border-b"
                     :class="isDarkMode ? 'bg-slate-600 border-slate-500' : 'bg-gray-100 border-gray-200'">
                  <div class="flex items-center space-x-3">
                    <div v-if="isSelectionMode" class="flex items-center space-x-2 text-xs"
                         :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
                      <span>步驟:</span>
                      <span :class="selectionStep >= 1 ? 'text-blue-600 font-medium' : ''">1.選擇X軸</span>
                      <span class="mx-1">→</span>
                      <span :class="selectionStep >= 2 ? 'text-blue-600 font-medium' : ''">2.選擇Y軸</span>
                    </div>
                  </div>
                  
                  <div class="text-xs space-y-1"
                       :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'">
                    <div>共 {{ previewData.length }} 筆資料，預覽前5筆</div>
                    <div v-if="chartConfig.xAxisColumns.length > 0" class="text-blue-600">
                      X軸: {{ chartConfig.xAxisColumns.join(' + ') }}
                    </div>
                    <div v-if="chartConfig.yAxisColumns.length > 0" class="text-green-600">
                      Y軸: {{ chartConfig.yAxisColumns.join(', ') }}
                    </div>
                    <div v-if="isSelectionMode && selectionStep === 1 && tempXAxisColumns.length > 0" class="text-blue-500">
                      臨時X軸: {{ tempXAxisColumns.join(' + ') }}
                    </div>
                    <div v-if="isSelectionMode && selectionStep === 2 && tempYAxisColumns.length > 0" class="text-green-500">
                      臨時Y軸: {{ tempYAxisColumns.join(', ') }}
                    </div>
                  </div>
                </div>
                
                <div class="overflow-x-auto max-h-96">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0"
                           :class="isDarkMode ? 'bg-slate-600' : 'bg-gray-100'">
                      <tr>
                        <th v-for="column in previewColumns" :key="column"
                            class="px-3 py-2 text-left font-medium transition-colors duration-300 border-r last:border-r-0 cursor-pointer"
                            :class="[
                              isDarkMode ? 'text-white border-slate-500' : 'text-gray-900 border-gray-200',
                              getColumnClass(column)
                            ]"
                            @click="handleColumnClick(column)">
                          <div class="flex items-center space-x-1">
                            <span>{{ column }}</span>
                            <span v-if="isColumnSelected(column, 'x')" 
                                  class="text-xs px-1 py-0.5 rounded bg-blue-200 text-blue-800">X</span>
                            <span v-if="isColumnSelected(column, 'y')" 
                                  class="text-xs px-1 py-0.5 rounded bg-green-200 text-green-800">Y</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, index) in previewData.slice(0, 5)" :key="index"
                          class="border-b transition-colors duration-300"
                          :class="isDarkMode ? 'border-slate-600 hover:bg-slate-600' : 'border-gray-200 hover:bg-gray-50'">
                        <td v-for="column in previewColumns" :key="column"
                            class="px-3 py-2 transition-colors duration-300 border-r last:border-r-0"
                            :class="isDarkMode ? 'text-gray-300 border-slate-600' : 'text-gray-700 border-gray-200'">
                          <span class="truncate block max-w-32" :title="row[column] || '-'">
                            {{ row[column] || '-' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <!-- 按鈕區域 -->
                <div class="p-3 border-t"
                     :class="isDarkMode ? 'bg-slate-600 border-slate-500' : 'bg-gray-100 border-gray-200'">
                  <div class="flex items-center justify-center space-x-3">
                    <button type="button" @click="toggleSelectionMode"
                            class="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-300"
                            :class="isSelectionMode 
                              ? (isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700')
                              : (isDarkMode ? 'text-gray-300 hover:text-white hover:bg-slate-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200')">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                      </svg>
                      <span>{{ isSelectionMode ? '取消選擇' : '選擇軸線' }}</span>
                    </button>
                    
                    <button v-if="isSelectionMode && selectionStep === 1 && tempXAxisColumns.length > 0" 
                            @click="saveXAxisSelection"
                            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md transition-colors duration-300 hover:bg-blue-700">
                      保存X軸
                    </button>
                    
                    <button v-if="isSelectionMode && selectionStep === 2 && tempYAxisColumns.length > 0" 
                            @click="saveYAxisSelection"
                            class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md transition-colors duration-300 hover:bg-green-700">
                      保存Y軸
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 無資料狀態 -->
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <svg class="w-12 h-12 mb-3 transition-colors duration-300"
                   :class="isDarkMode ? 'text-gray-600' : 'text-gray-400'" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="text-sm transition-colors duration-300"
                 :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                上傳檔案後將顯示資料預覽
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底部按鈕 -->
      <div class="flex-shrink-0 p-4 border-t"
           :class="isDarkMode ? 'border-slate-600' : 'border-gray-200'">
        
        
        <div class="flex items-center justify-end space-x-3">
          <button @click="closeModal"
                  class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                  :class="isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-slate-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'">
            取消
          </button>
          <button @click="handleSubmit"
                  :disabled="!isFormValid || isUploading"
                  class="px-6 py-2 text-sm font-medium text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="isFormValid && !isUploading 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400'">
            <span v-if="isUploading" class="flex items-center space-x-2">
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>{{ isEditMode ? '更新中...' : '上傳中...' }}</span>
            </span>
            <span v-else>{{ isEditMode ? '確定更新' : '確定上傳' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import alertService from '@/utils/alertService.js'

export default {
  name: 'TemporalDataUploadModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    projectId: {
      type: String,
      required: true
    },
    editingData: {
      type: Object,
      default: null
    }
  },
  emits: [
    'close',
    'uploaded',
    'updated'
  ],
  computed: {
    isEditMode() {
      // 檢查 editingData prop 是否存在且不為 null/undefined
      // 模態框使用 v-if="isVisible"，所以當模態框可見時組件才會渲染
      // 因此只需要檢查 editingData 是否存在即可
      
      // 先檢查基本條件
      if (!this.editingData) {
        console.log('[isEditMode] editingData 為空')
        return false
      }
      
      if (typeof this.editingData !== 'object') {
        console.log('[isEditMode] editingData 不是對象:', typeof this.editingData)
        return false
      }
      
      // 檢查是否有標識符
      const hasId = !!(this.editingData.temporal_id || this.editingData.id)
      const hasKeys = Object.keys(this.editingData).length > 0
      const result = hasId || hasKeys
      
      console.log('[isEditMode] 計算:', {
        editingData: this.editingData,
        hasId,
        hasKeys,
        temporal_id: this.editingData?.temporal_id,
        id: this.editingData?.id,
        keys: Object.keys(this.editingData),
        result
      })
      
      return result
    },
    
    isFormValid() {
      // 編輯模式只需要名稱
      if (this.isEditMode) {
        return !!this.formData.name
      }
      
      // 上傳模式：基本驗證：名稱、類型、檔案
      const basicValid = this.formData.name && 
                        this.formData.type && 
                        this.selectedFile
      
      // CSV 需要座標，Shapefile 不需要
      const coordinateValid = this.formData.type === 'shapefile' || 
                             (this.formData.longitude && this.formData.latitude)
      
      // 簡化圖表配置驗證：只要有基本資料就可以上傳
      // 軸線配置可以在上傳後再處理
      return basicValid && coordinateValid
    },
    
    // 識別可能的時間欄位
    possibleTimeColumns() {
      if (!this.previewColumns.length) return []
      
      return this.previewColumns.filter(column => {
        const lowerColumn = column.toLowerCase()
        return lowerColumn.includes('time') || 
               lowerColumn.includes('date') || 
               lowerColumn.includes('時間') || 
               lowerColumn.includes('日期') ||
               lowerColumn.includes('timestamp')
      })
    },
    
    // 識別可能的數值欄位
    possibleNumericColumns() {
      if (!this.previewColumns.length || !this.previewData.length) return []
      
      return this.previewColumns.filter(column => {
        // 排除時間欄位
        if (this.possibleTimeColumns.includes(column)) return false
        
        // 檢查前幾行資料是否為數值
        const sampleValues = this.previewData.slice(0, 5).map(row => row[column])
        return sampleValues.some(value => {
          const num = parseFloat(value)
          return !isNaN(num) && isFinite(num)
        })
      })
    }
  },
  watch: {
    editingData: {
      handler(newData, oldData) {
        console.log('editingData 變化:', {
          newData,
          oldData,
          isVisible: this.isVisible,
          isEditMode: this.isEditMode
        })
        // 當 editingData 變化且模態框可見時，載入編輯數據
        if (newData && this.isVisible) {
          this.$nextTick(() => {
            this.loadEditingData(newData)
          })
        }
      },
      immediate: true,
      deep: true
    },
    isVisible(newVisible, oldVisible) {
      console.log('[isVisible] 變化:', {
        newVisible,
        oldVisible,
        editingData: this.editingData,
        isEditMode: this.isEditMode
      })
      if (newVisible) {
        // 模態框打開時，等待下一個 tick 確保 props 已更新
        this.$nextTick(() => {
          console.log('[isVisible] $nextTick 後:', {
            editingData: this.editingData,
            isEditMode: this.isEditMode
          })
          // 如果有 editingData，則載入編輯數據
          if (this.editingData) {
            console.log('[isVisible] 模態框打開，載入編輯數據:', this.editingData)
            this.loadEditingData(this.editingData)
          } else {
            console.log('[isVisible] 模態框打開，但沒有 editingData，這是上傳模式')
          }
        })
      } else if (!newVisible) {
        // 模態框關閉時重置表單
        console.log('[isVisible] 模態框關閉，重置表單')
        this.resetForm()
      }
    }
  },
  mounted() {
    // 組件掛載時，如果模態框可見且有編輯數據，載入數據
    if (this.isVisible && this.editingData) {
      console.log('組件掛載，載入編輯數據:', this.editingData)
      this.$nextTick(() => {
        this.loadEditingData(this.editingData)
      })
    }
  },
  data() {
    return {
      formData: {
        name: '',
        type: '',
        longitude: '',
        latitude: '',
        description: ''
      },
      selectedFile: null,
      isDragOver: false,
      isUploading: false,
      previewData: [],
      previewColumns: [],
      isParsingFile: false,
      // 圖表配置
      chartConfig: {
        xAxisColumns: [], // X 軸時間欄位（可多選，會合併）
        yAxisColumns: [], // Y 軸資料欄位（可多選）
        timeFormat: 'auto', // 時間格式
        chartType: 'line' // 圖表樣式：line（折線圖）或 scatter（散點圖）
      },
      // 軸線選擇功能
      isSelectionMode: false,
      selectionStep: 0, // 0: 未開始, 1: 選擇X軸, 2: 選擇Y軸
      tempXAxisColumns: [], // 臨時 X 軸選擇
      tempYAxisColumns: [] // 臨時 Y 軸選擇
    }
  },
  methods: {
    closeModal() {
      this.resetForm()
      this.$emit('close')
    },
    
    resetForm() {
      console.log('[resetForm] 重置表單，isEditMode:', this.isEditMode, 'editingData:', this.editingData)
      // 只有在非編輯模式下才重置表單
      // 編輯模式下保留已載入的數據
      if (!this.isEditMode) {
      this.formData = {
        name: '',
        type: '',
        longitude: '',
        latitude: '',
        description: ''
      }
      this.selectedFile = null
      this.isDragOver = false
      this.isUploading = false
      this.previewData = []
      this.previewColumns = []
      this.isParsingFile = false
      this.chartConfig = {
        xAxisColumns: [],
        yAxisColumns: [],
          timeFormat: 'auto',
          chartType: 'line'
      }
      this.isSelectionMode = false
      this.selectionStep = 0
      this.tempXAxisColumns = []
      this.tempYAxisColumns = []
      } else {
        console.log('[resetForm] 編輯模式下跳過重置')
      }
    },
    
    // 載入編輯資料（只載入名稱和描述）
    async loadEditingData(temporalData) {
      console.log('載入編輯資料:', temporalData)
      console.log('temporalData 類型:', typeof temporalData)
      console.log('temporalData 是否為 null:', temporalData === null)
      console.log('temporalData 是否為 undefined:', temporalData === undefined)
      
      if (!temporalData) {
        console.warn('loadEditingData: temporalData 為空')
        return
      }
      
      this.formData = {
        name: temporalData.name || '',
        type: temporalData.data_type || temporalData.type || '', // 僅用於顯示，不可編輯
        longitude: '', // 編輯模式下不需要
        latitude: '', // 編輯模式下不需要
        description: temporalData.description || ''
      }
      
      console.log('載入後的 formData:', this.formData)
      console.log('isEditMode 應該為:', this.isEditMode)
      
      // 編輯模式下不需要載入圖表配置，保持預設值
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.selectedFile = file
        // 只有 CSV 檔案才需要解析
        if (this.formData.type === 'csv') {
          this.parseCSVFile(file)
        } else {
          // Shapefile 不需要解析，清空預覽資料
          this.previewData = []
          this.previewColumns = []
        }
      }
    },
    
    handleDragOver(event) {
      this.isDragOver = true
    },
    
    handleDragLeave(event) {
      this.isDragOver = false
    },
    
    handleDrop(event) {
      this.isDragOver = false
      const files = event.dataTransfer.files
      if (files.length > 0) {
        this.selectedFile = files[0]
        // 只有 CSV 檔案才需要解析
        if (this.formData.type === 'csv') {
          this.parseCSVFile(files[0])
        } else {
          // Shapefile 不需要解析，清空預覽資料
          this.previewData = []
          this.previewColumns = []
        }
      }
    },
    
    removeFile() {
      this.selectedFile = null
      this.previewData = []
      this.previewColumns = []
      this.isParsingFile = false
      // 清空圖表配置
      this.chartConfig.xAxisColumns = []
      this.chartConfig.yAxisColumns = []
      this.tempXAxisColumns = []
      this.tempYAxisColumns = []
      this.isSelectionMode = false
      this.selectionStep = 0
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    parseCSVFile(file) {
      if (!file || (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv'))) {
        this.previewData = []
        this.previewColumns = []
        this.isParsingFile = false
        return
      }
      
      this.isParsingFile = true
      this.previewData = []
      this.previewColumns = []
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const csvText = e.target.result
          const lines = csvText.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            this.previewData = []
            this.previewColumns = []
            this.isParsingFile = false
            return
          }
          
          // 解析 CSV 標題行
          const headers = this.parseCSVLine(lines[0])
          this.previewColumns = headers
          
          // 解析資料行（最多解析前 100 行以避免性能問題）
          const dataRows = lines.slice(1, 101).map(line => {
            const values = this.parseCSVLine(line)
            const row = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            return row
          })
          
          this.previewData = dataRows
          this.isParsingFile = false
          
        } catch (error) {
          console.error('CSV 解析錯誤:', error)
          this.previewData = []
          this.previewColumns = []
          this.isParsingFile = false
        }
      }
      
      reader.onerror = () => {
        console.error('檔案讀取錯誤')
        this.previewData = []
        this.previewColumns = []
        this.isParsingFile = false
      }
      
      reader.readAsText(file, 'UTF-8')
    },
    
    parseCSVLine(line) {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // 處理雙引號轉義
            current += '"'
            i++ // 跳過下一個引號
          } else {
            // 切換引號狀態
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          // 遇到逗號且不在引號內，結束當前欄位
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      // 添加最後一個欄位
      result.push(current.trim())
      
      return result
    },
    
    // 切換軸線選擇模式
    toggleSelectionMode() {
      if (this.isSelectionMode) {
        // 取消選擇：清空所有選擇和保存
        this.isSelectionMode = false
        this.selectionStep = 0
        this.tempXAxisColumns = []
        this.tempYAxisColumns = []
        this.chartConfig.xAxisColumns = []
        this.chartConfig.yAxisColumns = []
      } else {
        // 開始選擇
        this.isSelectionMode = true
        this.selectionStep = 1 // 開始選擇 X 軸
        this.tempXAxisColumns = []
        this.tempYAxisColumns = []
      }
    },
    
    // 處理欄位點擊
    handleColumnClick(column) {
      if (!this.isSelectionMode) return
      
      if (this.selectionStep === 1) {
        // 選擇 X 軸（支持多選）
        const index = this.tempXAxisColumns.indexOf(column)
        if (index > -1) {
          this.tempXAxisColumns.splice(index, 1)
        } else {
          this.tempXAxisColumns.push(column)
        }
      } else if (this.selectionStep === 2) {
        // 選擇 Y 軸
        const index = this.tempYAxisColumns.indexOf(column)
        if (index > -1) {
          this.tempYAxisColumns.splice(index, 1)
        } else {
          this.tempYAxisColumns.push(column)
        }
      }
    },
    
    // 保存 X 軸選擇
    saveXAxisSelection() {
      this.chartConfig.xAxisColumns = [...this.tempXAxisColumns]
      this.selectionStep = 2 // 進入 Y 軸選擇
      this.tempYAxisColumns = []
    },
    
    // 保存 Y 軸選擇
    saveYAxisSelection() {
      this.chartConfig.yAxisColumns = [...this.tempYAxisColumns]
      this.isSelectionMode = false // 完成選擇
      this.selectionStep = 0
    },
    
    // 獲取欄位樣式類
    getColumnClass(column) {
      if (this.selectionStep === 1 && this.tempXAxisColumns.includes(column)) {
        return 'bg-blue-100 text-blue-800'
      } else if (this.selectionStep === 2 && this.tempYAxisColumns.includes(column)) {
        return 'bg-green-100 text-green-800'
      } else if (this.chartConfig.xAxisColumns.includes(column)) {
        return 'bg-blue-50 text-blue-700'
      } else if (this.chartConfig.yAxisColumns.includes(column)) {
        return 'bg-green-50 text-green-700'
      }
      return ''
    },
    
    // 檢查欄位是否被選中
    isColumnSelected(column, type) {
      if (type === 'x') {
        return this.chartConfig.xAxisColumns.includes(column) || 
               (this.selectionStep === 1 && this.tempXAxisColumns.includes(column))
      } else if (type === 'y') {
        return this.chartConfig.yAxisColumns.includes(column) || 
               (this.selectionStep === 2 && this.tempYAxisColumns.includes(column))
      }
      return false
    },
    
    async handleSubmit() {
      if (!this.isFormValid && !this.isEditMode) return
      
      // 編輯模式不需要檔案驗證
      if (this.isEditMode && !this.formData.name) {
        this.showAlert({
          type: 'error',
          title: '驗證失敗',
          message: '請輸入資料名稱'
        })
        return
      }
      
      this.isUploading = true
      
      try {
        if (this.isEditMode) {
          // 編輯模式：調用更新 API
          await this.handleUpdate()
        } else {
          // 上傳模式：調用上傳 API
          await this.handleUpload()
        }
      } catch (error) {
        console.error('提交失敗:', error)
        this.showAlert({
          type: 'error',
          title: this.isEditMode ? '更新失敗' : '上傳失敗',
          message: error.message || '操作失敗，請稍後再試'
        })
      } finally {
        this.isUploading = false
      }
    },
    
    async handleUpload() {
      console.log('===== 開始上傳表單 =====')
      
        const formData = new FormData()
        formData.append('name', this.formData.name)
        formData.append('dataType', this.formData.type)
        formData.append('description', this.formData.description)
        formData.append('file', this.selectedFile)
        
        // CSV 需要座標
        if (this.formData.type === 'csv') {
          formData.append('longitude', this.formData.longitude)
          formData.append('latitude', this.formData.latitude)
        }
        
        // 添加圖表配置（僅 CSV 需要）
        if (this.formData.type === 'csv') {
          if (this.chartConfig.xAxisColumns.length > 0) {
            formData.append('xAxisColumns', JSON.stringify(this.chartConfig.xAxisColumns))
          }
          if (this.chartConfig.yAxisColumns.length > 0) {
            formData.append('yAxisColumns', JSON.stringify(this.chartConfig.yAxisColumns))
          }
          if (this.chartConfig.timeFormat) {
            formData.append('timeFormat', this.chartConfig.timeFormat)
          }
          if (this.chartConfig.chartType) {
            formData.append('chartType', this.chartConfig.chartType)
          }
        }
        
        if (!this.projectId) {
          throw new Error('專案 ID 不存在，請重新載入頁面')
        }
        
        const response = await this.$api.post(`/temporal-data-enhanced/${this.projectId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
        timeout: 30000
        })
        
        if (response.success) {
          this.$emit('uploaded', response.data)
          this.closeModal()
          
          const chartData = response.data?.chartData
          const chartInfo = chartData ? 
            `已解析 ${chartData.totalRecords} 筆資料，生成 ${chartData.datasets?.length || 0} 個圖表資料集` : ''
          
          this.showAlert({
            type: 'success',
            title: '上傳成功',
            message: `時序資料已成功上傳並生成圖表配置。${chartInfo}`
        }).catch(() => {})
        } else {
          throw new Error(response.message || '上傳失敗')
        }
    },
    
    async handleUpdate() {
      console.log('===== 開始更新表單 =====')
      
      if (!this.editingData || !this.editingData.temporal_id) {
        throw new Error('缺少編輯資料 ID')
      }
      
      // 只更新名稱和描述
      const updateData = {
        name: this.formData.name,
        description: this.formData.description
      }
      
      const response = await this.$api.put(`/temporal-data-enhanced/${this.editingData.temporal_id}`, updateData)
      
      if (response.success || response.data?.success) {
        this.$emit('updated', response.data || response)
        this.closeModal()
        
        this.showAlert({
          type: 'success',
          title: '更新成功',
          message: `時序資料 "${this.formData.name}" 已成功更新`
        }).catch(() => {})
      } else {
        throw new Error(response.message || response.data?.message || '更新失敗')
      }
    },
    
    // 顯示提示信息
    showAlert(options) {
      return alertService.show(options)
    }
  }
}
</script>
