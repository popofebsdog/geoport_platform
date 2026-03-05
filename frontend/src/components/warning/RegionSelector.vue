<template>
  <div class="region-selector bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="text-lg font-bold text-gray-700 dark:text-gray-300">監測地區</span>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-2">
        <!-- 載入狀態 -->
        <div v-if="loading" class="flex items-center gap-2 px-4 py-2">
          <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span class="text-sm text-gray-500 dark:text-gray-400">載入中</span>
        </div>
        
        <!-- 錯誤狀態 -->
        <div v-else-if="regions.length === 0" class="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span>無法載入地區列表</span>
        </div>
        
        <!-- 地區選擇按鈕 -->
        <template v-else>
          <div
            v-for="region in regions"
            :key="region.region_id || region.region_code"
            class="group relative"
          >
            <div
              class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg relative overflow-hidden"
              :class="[
                selectedRegionId === region.region_id
                  ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 region-card-selected'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              ]"
            >
              <!-- 地區名稱（可點擊選擇） -->
              <button
                @click="selectRegion(region.region_id)"
                class="flex-1 text-left pr-2"
              >
                {{ region.region_name }}
              </button>
              
              <!-- 分隔線（僅在選中時顯示） -->
              <div 
                v-if="selectedRegionId === region.region_id"
                class="h-4 w-px transition-opacity duration-200 bg-white/30"
              ></div>
              
              <!-- 操作圖標區域（收合效果） -->
              <div class="flex items-center gap-0.5 ml-1 region-actions">
                <!-- 編輯圖標 -->
                <button
                  @click.stop="$emit('edit', region)"
                  class="p-1.5 rounded transition-all duration-200"
                  :class="selectedRegionId === region.region_id
                    ? 'text-white/60 hover:text-white hover:bg-white/20'
                    : 'text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400'"
                  title="編輯專案"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                
                <!-- 刪除圖標 -->
                <button
                  @click.stop="handleDelete(region)"
                  class="p-1.5 rounded transition-all duration-200"
                  :class="selectedRegionId === region.region_id
                    ? 'text-white/60 hover:text-white hover:bg-white/20'
                    : 'text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400'"
                  title="刪除專案"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 建立地區專案按鈕（始終顯示） -->
        <button
          v-if="showCreateButton"
          @click="$emit('create')"
          class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm whitespace-nowrap"
        >
          建立地區專案
        </button>
      </div>
    </div>
    
    <!-- 刪除確認對話框 -->
    <DeleteConfirmModal
      :is-visible="showDeleteConfirm"
      :region-name="deletingRegion?.region_name || ''"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    />
  </div>
</template>

<script>
import axios from 'axios';
import DeleteConfirmModal from './DeleteConfirmModal.vue';
import { error as showError } from '@/utils/simpleAlertService';

export default {
  name: 'RegionSelector',
  components: {
    DeleteConfirmModal
  },
  inject: ['isDarkMode'],
  props: {
    modelValue: {
      type: [String, Number],
      default: null
    },
    showCreateButton: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'region-changed', 'regions-loaded', 'create', 'edit', 'delete'],
  data() {
    return {
      regions: [],
      selectedRegionId: this.modelValue || null, // 使用 region_id 来标识选中的项目
      loading: false,
      showDeleteConfirm: false,
      deletingRegion: null
    };
  },
  computed: {
    selectedRegion() {
      if (!this.selectedRegionId) return null;
      return this.regions.find(r => r.region_id === this.selectedRegionId) || null;
    },
    selectedRegionCode() {
      return this.selectedRegion?.region_code || null;
    }
  },
  async mounted() {
    await this.loadRegions();
    // 如果沒有選中地區，選擇第一個
    if (!this.selectedRegionId && this.regions.length > 0) {
      this.selectRegion(this.regions[0].region_id);
    }
  },
  methods: {
    async loadRegions() {
      try {
        this.loading = true;
        const response = await axios.get('/api/warning-regions');
        if (response.data.success) {
          this.regions = response.data.data.filter(r => r.is_active);
          this.$emit('regions-loaded', this.regions);
        }
      } catch (error) {
        console.error('載入預警地區列表失敗:', error);
      } finally {
        this.loading = false;
      }
    },
    selectRegion(regionId) {
      this.selectedRegionId = regionId;
      const region = this.regions.find(r => r.region_id === regionId);
      // emit region_id 用于标识，region_code 用于 API 调用
      this.$emit('update:modelValue', regionId);
      this.$emit('region-changed', {
        region_id: regionId,
        region_code: region?.region_code || null,
        region: region
      });
    },
    handleDelete(region) {
      this.deletingRegion = region;
      this.showDeleteConfirm = true;
    },
    async confirmDelete() {
      if (!this.deletingRegion || !this.deletingRegion.region_id) return;
      
      try {
        const response = await axios.delete(`/api/warning-regions/id/${this.deletingRegion.region_id}`);
        if (response.data.success) {
          // 如果刪除的是當前選中的地區，清除選擇
          if (this.selectedRegionId === this.deletingRegion.region_id) {
            this.selectedRegionId = null;
            this.$emit('update:modelValue', null);
            this.$emit('region-changed', null);
          }
          // 重新載入地區列表
          await this.loadRegions();
          // 如果還有地區，選擇第一個
          if (this.regions.length > 0 && !this.selectedRegionId) {
            this.selectRegion(this.regions[0].region_id);
          }
          // 關閉確認對話框
          this.cancelDelete();
        }
      } catch (err) {
        console.error('刪除監測地區專案失敗:', err);
        showError(
          '刪除失敗：' + (err.response?.data?.message || err.message),
          '刪除失敗',
          this.isDarkMode
        );
        this.cancelDelete();
      }
    },
    cancelDelete() {
      this.showDeleteConfirm = false;
      this.deletingRegion = null;
    }
  },
  watch: {
    modelValue(newVal) {
      if (newVal !== this.selectedRegionId) {
        this.selectedRegionId = newVal;
      }
    }
  }
};
</script>

<style scoped>
.region-selector {
  margin-bottom: 0;
}

/* 操作圖標區域收合效果 - 只有選中的卡片才顯示 */
.region-actions {
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, width 0.2s ease;
  width: 0;
  overflow: hidden;
  white-space: nowrap;
}

/* 選中狀態時顯示操作圖標，懸停時展開 */
.region-card-selected .region-actions {
  opacity: 1;
  transform: translateX(0);
  width: auto;
}

/* 選中狀態下懸停時保持顯示（確保操作圖標可見） */
.region-card-selected:hover .region-actions {
  opacity: 1;
  transform: translateX(0);
  width: auto;
}
</style>
