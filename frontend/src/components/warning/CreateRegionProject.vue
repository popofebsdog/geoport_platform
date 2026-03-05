<template>
  <div class="create-region-project">
    <!-- 步驟指示器 -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center flex-1"
        >
          <div class="flex items-center">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              :class="getStepClass(index)"
            >
              <span v-if="currentStep > index">✓</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="ml-3 hidden sm:block">
              <div
                class="text-sm font-medium"
                :class="currentStep >= index ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'"
              >
                {{ step.title }}
              </div>
              <div
                class="text-xs"
                :class="currentStep >= index ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'"
              >
                {{ step.description }}
              </div>
            </div>
          </div>
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-4"
            :class="currentStep > index ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'"
          ></div>
        </div>
      </div>
    </div>

    <!-- 步驟內容 -->
    <div class="card">
      <!-- 步驟 1: 基本資訊 -->
      <div v-if="currentStep === 0" class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">地區基本資訊</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">請填寫地區的基本資訊</p>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              專案名稱 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.regionName"
              type="text"
              placeholder="例如：台7線示範區"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              選擇公路路段 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.roadSection"
              @change="handleRoadSectionChange"
              :disabled="editMode"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="">請選擇公路路段</option>
              <option v-for="road in availableRoads" :key="road.value" :value="road.value">
                {{ road.label }}
              </option>
            </select>
            <p v-if="editMode" class="mt-1 text-xs text-gray-500 dark:text-gray-400">編輯模式下無法修改公路路段</p>
          </div>

          <div v-if="formData.roadSection">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              選擇工務段 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.workSection"
              @change="handleWorkSectionChange"
              :disabled="editMode"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400"
            >
              <option value="">請選擇工務段</option>
              <option v-for="section in availableWorkSections" :key="section" :value="section">
                {{ section }}
              </option>
            </select>
            <p v-if="editMode" class="mt-1 text-xs text-gray-500 dark:text-gray-400">編輯模式下無法修改工務段</p>
          </div>
        </div>
      </div>

      <!-- 步驟 2: 上傳資料 -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">上傳資料</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">上傳熱區評估資料</p>
        </div>

        <!-- 類別選擇標籤 -->
        <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            v-for="category in uploadCategories"
            :key="category.key"
            @click="selectedUploadCategory = category.key"
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="selectedUploadCategory === category.key
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'"
          >
            {{ category.label }}
          </button>
        </div>

        <!-- 統一的上傳區域 -->
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-[400px] flex flex-col">
          <input
            :ref="el => fileInputs[selectedUploadCategory] = el"
            type="file"
            multiple
            accept=".shp,.geojson,.kml,.kmz,.tif,.tiff,.zip"
            @change="(e) => handleFileUpload(e, selectedUploadCategory)"
            class="hidden"
          />
          <div v-if="uploadedFiles[selectedUploadCategory].length === 0" class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <svg class="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <button
                  @click="$refs.fileInputs[selectedUploadCategory]?.click()"
                  class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  點擊上傳
                </button>
                或拖放檔案到此處
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-500">支援格式：Shapefile, GeoJSON, KML, GeoTIFF, ZIP</p>
            </div>
          </div>
          <div v-else class="flex-1 overflow-hidden space-y-2">
            <div
              v-for="(file, index) in uploadedFiles[selectedUploadCategory]"
              :key="`file-${selectedUploadCategory}-${index}`"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ file.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatFileSize(file.size) }}</p>
                </div>
              </div>
              <button
                @click="removeFile(index, selectedUploadCategory)"
                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <button
              @click="$refs.fileInputs[selectedUploadCategory]?.click()"
              class="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline w-full text-center"
            >
              + 新增檔案
            </button>
          </div>
        </div>
      </div>

      <!-- 步驟 3: 介接監測資料 -->
      <div v-if="currentStep === 2" class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">介接監測資料</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">設定監測資料的API端點，用於建立動態圖表</p>
        </div>

        <!-- 類別選擇標籤 -->
        <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            v-for="category in apiCategories"
            :key="category.key"
            @click="selectedApiCategory = category.key"
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="selectedApiCategory === category.key
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'"
          >
            {{ category.label }}
          </button>
        </div>

        <!-- 統一的API配置表單 -->
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-[400px] flex flex-col">
          <div class="space-y-4 flex-1 overflow-hidden">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API 端點 URL
              </label>
              <input
                v-model="formData.apiConfig[selectedApiCategory].endpoint"
                type="url"
                :placeholder="`https://api.example.com/${selectedApiCategory}`"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API 認證方式
                </label>
                <select
                  v-model="formData.apiConfig[selectedApiCategory].authType"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">無認證</option>
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>
              <div v-if="formData.apiConfig[selectedApiCategory].authType !== 'none'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  認證資訊
                </label>
                <input
                  v-model="formData.apiConfig[selectedApiCategory].authValue"
                  type="text"
                  :placeholder="getAuthPlaceholder(formData.apiConfig[selectedApiCategory].authType)"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                更新頻率（分鐘）
              </label>
              <input
                v-model.number="formData.apiConfig[selectedApiCategory].updateInterval"
                type="number"
                min="1"
                placeholder="10"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 按鈕區域 -->
      <div class="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="previousStep"
          :disabled="currentStep === 0"
          class="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一步
        </button>
        <button
          v-if="currentStep < steps.length - 1"
          @click="nextStep"
          :disabled="!canProceed"
          class="px-6 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一步
        </button>
        <button
          v-else
          @click="submitForm"
          :disabled="submitting"
          class="px-6 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-500 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="submitting">{{ editMode ? '更新中...' : '提交中...' }}</span>
          <span v-else>{{ editMode ? '更新' : '提交' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { alert as showAlert, error as showError, success as showSuccess } from '@/utils/simpleAlertService';

export default {
  name: 'CreateRegionProject',
  props: {
    editMode: {
      type: Boolean,
      default: false
    },
    editData: {
      type: Object,
      default: null
    }
  },
  inject: ['isDarkMode'],
  emits: ['success', 'cancel', 'road-section-selected', 'work-section-selected'],
  data() {
    return {
      currentStep: 0,
      submitting: false,
      availableRoads: [], // 從 GeoJSON 文件讀取的可用路線
      availableWorkSections: [], // 根據選擇的路線動態加載的工務段選項
      uploadedFiles: {
        numerical: [],
        insar: [],
        disaster: []
      },
      fileInputs: {
        numerical: null,
        insar: null,
        disaster: null
      },
      selectedUploadCategory: 'numerical', // 預設選擇數值模擬
      uploadCategories: [
        { key: 'numerical', label: '數值模擬' },
        { key: 'insar', label: 'InSAR監測' },
        { key: 'disaster', label: '災點熱區' }
      ],
      selectedApiCategory: 'microseismic', // 預設選擇微地動
      apiCategories: [
        { key: 'microseismic', label: '微地動' },
        { key: 'earthquake', label: '地震' },
        { key: 'rainfall', label: '雨量' }
      ],
      formData: {
        regionName: '',
        roadSection: '',
        workSection: '', // 工務段
        regionCode: '', // 自動生成，基於 roadSection
        description: '',
        latitude: null,
        longitude: null,
        apiConfig: {
          microseismic: {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          },
          earthquake: {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          },
          rainfall: {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          }
        }
      },
      steps: [
        {
          title: '區域設定',
          description: '填寫分析位置資訊'
        },
        {
          title: '成果資料',
          description: '上傳已分析好的成果予顯示'
        },
        {
          title: '監測資料',
          description: '設定儀器 API 與即時顯示'
        }
      ]
    };
  },
  computed: {
    canProceed() {
      switch (this.currentStep) {
        case 0:
          return this.formData.regionName && this.formData.roadSection && this.formData.workSection;
        case 1:
          return true; // 不需要上傳文件也能進入下一階段
        case 2:
          return true; // API設定為可選
        default:
          return true;
      }
    }
  },
  async mounted() {
    await this.loadRoadSections();
    // 如果是編輯模式，載入現有數據
    if (this.editMode && this.editData) {
      this.loadEditData();
    }
  },
  methods: {
    getStepClass(index) {
      if (this.currentStep > index) {
        return 'bg-green-500 text-white dark:bg-green-600';
      } else if (this.currentStep === index) {
        return 'bg-blue-600 text-white dark:bg-blue-500';
      } else {
        return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      }
    },
    nextStep() {
      if (this.canProceed && this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      }
    },
    previousStep() {
      if (this.currentStep > 0) {
        this.currentStep--;
      }
    },
    handleFileUpload(event, category) {
      const files = Array.from(event.target.files);
      this.uploadedFiles[category] = [...this.uploadedFiles[category], ...files];
      // 清空 input，允許重複選擇相同檔案
      event.target.value = '';
    },
    removeFile(index, category) {
      this.uploadedFiles[category].splice(index, 1);
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    getAuthPlaceholder(authType) {
      switch (authType) {
        case 'api_key':
          return '輸入 API Key';
        case 'bearer':
          return '輸入 Bearer Token';
        case 'basic':
          return '輸入 username:password';
        default:
          return '';
      }
    },
    getAuthTypeName(authType) {
      const names = {
        none: '無認證',
        api_key: 'API Key',
        bearer: 'Bearer Token',
        basic: 'Basic Auth'
      };
      return names[authType] || '-';
    },
    async loadRoadSections() {
      try {
        // 從 GeoJSON 文件讀取路線選項
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson');
        const geojsonData = await response.json();
        
        // 提取所有唯一的路線名稱
        const roadSet = new Set();
        if (geojsonData.features) {
          geojsonData.features.forEach(feature => {
            const roadName = feature.properties?.公路編;
            if (roadName) {
              roadSet.add(roadName);
            }
          });
        }
        
        // 轉換為選項格式
        this.availableRoads = Array.from(roadSet).map(roadName => ({
          value: roadName,
          label: roadName
        }));
        
        console.log('已載入路線選項:', this.availableRoads);
      } catch (error) {
        console.error('載入路線選項失敗:', error);
        // 如果載入失敗，使用預設選項
        this.availableRoads = [
          { value: '台7線', label: '台7線' },
          { value: '台8線', label: '台8線' },
          { value: '台8臨37線', label: '台8臨37線' }
        ];
      }
    },
    async handleRoadSectionChange() {
      // 當選擇路線時，載入該路線的工務段選項
      if (this.formData.roadSection) {
        await this.loadWorkSections(this.formData.roadSection);
        // 清空已選擇的工務段
        this.formData.workSection = '';
        // 通知父組件
        this.$emit('road-section-selected', this.formData.roadSection);
      } else {
        this.availableWorkSections = [];
        this.formData.workSection = '';
      }
    },
    handleWorkSectionChange() {
      // 當選擇工務段時，可以觸發地圖更新
      if (this.formData.workSection && this.formData.roadSection) {
        this.$emit('work-section-selected', {
          roadSection: this.formData.roadSection,
          workSection: this.formData.workSection
        });
      }
    },
    async loadWorkSections(roadSection) {
      try {
        // 從 GeoJSON 文件讀取該路線的所有工務段
        const response = await fetch('/data/uploads/geojson/alertRoad.geojson');
        const geojsonData = await response.json();
        
        // 提取該路線的所有唯一工務段
        const sectionSet = new Set();
        if (geojsonData.features) {
          geojsonData.features.forEach(feature => {
            if (feature.properties?.公路編 === roadSection && feature.properties?.工務段) {
              sectionSet.add(feature.properties.工務段);
            }
          });
        }
        
        // 轉換為數組
        this.availableWorkSections = Array.from(sectionSet).sort();
        
        console.log(`路線 ${roadSection} 的工務段選項:`, this.availableWorkSections);
      } catch (error) {
        console.error('載入工務段選項失敗:', error);
        this.availableWorkSections = [];
      }
    },
    async loadEditData() {
      if (!this.editData) return;
      
      // 載入編輯數據
      this.formData.regionName = this.editData.region_name || '';
      this.formData.roadSection = this.editData.region_code || '';
      this.formData.regionCode = this.editData.region_code || '';
      this.formData.description = this.editData.description || '';
      this.formData.latitude = this.editData.latitude || null;
      this.formData.longitude = this.editData.longitude || null;
      
      // 如果有工務段信息（從 description 或其他字段中解析）
      if (this.editData.work_section) {
        this.formData.workSection = this.editData.work_section;
      } else if (this.editData.description) {
        // 嘗試從描述中提取工務段（如果有的話）
        const workSectionMatch = this.editData.description.match(/工務段[：:]\s*([^，,]+)/);
        if (workSectionMatch) {
          this.formData.workSection = workSectionMatch[1].trim();
        }
      }
      
      // 載入該路線的工務段選項
      if (this.formData.roadSection) {
        await this.loadWorkSections(this.formData.roadSection);
      }
      
      // 載入 API 配置
      if (this.editData.api_config) {
        const apiConfig = typeof this.editData.api_config === 'string' 
          ? JSON.parse(this.editData.api_config) 
          : this.editData.api_config;
        
        this.formData.apiConfig = {
          microseismic: apiConfig.microseismic || {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          },
          earthquake: apiConfig.earthquake || {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          },
          rainfall: apiConfig.rainfall || {
            endpoint: '',
            authType: 'none',
            authValue: '',
            updateInterval: 10
          }
        };
      }
    },
    getRoadSectionName() {
      const names = {
        taiwan7: '台7線',
        taiwan8: '台8線',
        taiwan9: '台9線',
        taiwan10: '台10線',
        taiwan11: '台11線',
        taiwan14: '台14線',
        taiwan20: '台20線',
        taiwan21: '台21線',
        taiwan24: '台24線',
        national1: '國道1號',
        national3: '國道3號',
        national5: '國道5號'
      };
      return names[this.formData.roadSection] || '';
    },
    async submitForm() {
      try {
        this.submitting = true;

        // 驗證必填欄位
        if (!this.formData.regionName) {
          await showAlert('請填寫專案名稱', '提示', this.isDarkMode);
          this.submitting = false;
          return;
        }
        
        if (!this.formData.roadSection) {
          await showAlert('請選擇公路路段', '提示', this.isDarkMode);
          this.submitting = false;
          return;
        }
        
        if (!this.formData.workSection) {
          await showAlert('請選擇工務段', '提示', this.isDarkMode);
          this.submitting = false;
          return;
        }

        // 根據公路路段自動生成地區代碼
        // 如果 roadSection 是代碼格式（如：taiwan7），直接使用
        // 如果是中文格式（如：台7線），需要轉換或直接使用
        const regionCode = this.formData.roadSection || this.formData.regionCode;
        
        if (!regionCode) {
          await showAlert('無法生成地區代碼，請檢查公路路段選擇', '提示', this.isDarkMode);
          this.submitting = false;
          return;
        }

        // API配置（JSON格式）
        const apiConfig = {
          microseismic: this.formData.apiConfig.microseismic,
          earthquake: this.formData.apiConfig.earthquake,
          rainfall: this.formData.apiConfig.rainfall
        };

        let response;
        
        // 構建描述（包含工務段信息）
        let description = this.formData.description || '';
        if (this.formData.workSection) {
          description = description ? `${description}，工務段：${this.formData.workSection}` : `工務段：${this.formData.workSection}`;
        }

        if (this.editMode) {
          // 編輯模式：使用 PUT 請求（使用 region_id）
          const updateData = {
            regionName: this.formData.regionName,
            description: description,
            latitude: this.formData.latitude || null,
            longitude: this.formData.longitude || null,
            apiConfig: JSON.stringify(apiConfig),
            workSection: this.formData.workSection || ''
          };

          // 從 editData 中獲取 region_id
          const regionId = this.editData?.region_id;
          if (!regionId) {
            throw new Error('缺少專案ID，無法更新');
          }

          response = await axios.put(`/api/warning-regions/id/${regionId}`, updateData);
        } else {
          // 建立模式：使用 POST 請求（包含檔案上傳）
          const formData = new FormData();
          formData.append('regionName', this.formData.regionName);
          formData.append('regionCode', regionCode);
          formData.append('description', description);
          formData.append('workSection', this.formData.workSection || '');
          formData.append('latitude', this.formData.latitude || '');
          formData.append('longitude', this.formData.longitude || '');
          formData.append('apiConfig', JSON.stringify(apiConfig));

          // 添加檔案（按類別分組）
          this.uploadedFiles.numerical.forEach((file) => {
            formData.append('files[numerical]', file);
          });
          this.uploadedFiles.insar.forEach((file) => {
            formData.append('files[insar]', file);
          });
          this.uploadedFiles.disaster.forEach((file) => {
            formData.append('files[disaster]', file);
          });

          response = await axios.post('/api/warning-regions/create-project', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }

        if (response.data.success) {
          await showSuccess(
            this.editMode ? '地區專案更新成功' : '地區專案建立成功',
            '成功',
            this.isDarkMode
          );
          this.$emit('success', response.data.data);
        } else {
          throw new Error(response.data.message || (this.editMode ? '更新失敗' : '建立失敗'));
        }
      } catch (error) {
        console.error(this.editMode ? '更新地區專案失敗:' : '建立地區專案失敗:', error);
        const errorMessage = error.response?.data?.message || error.message;
        // 如果錯誤信息包含地區代碼已存在，提供更友好的提示
        if (errorMessage && errorMessage.includes('地區代碼已存在')) {
          await showError(errorMessage, '建立失敗', this.isDarkMode);
        } else {
          await showError(
            (this.editMode ? '更新失敗' : '建立失敗') + '：' + errorMessage,
            this.editMode ? '更新失敗' : '建立失敗',
            this.isDarkMode
          );
        }
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.card {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.dark .card {
  background-color: #1e293b;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.15);
}
</style>

