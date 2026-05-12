<template>
  <div class="region-selector mb-3">
    <div class="flex items-center gap-0 h-10">

      <!-- 標籤 -->
      <span class="text-[11px] font-semibold uppercase tracking-widest pr-4 border-r flex-shrink-0 transition-colors"
            :class="isDarkMode ? 'text-slate-600 border-slate-800' : 'text-gray-400 border-gray-200'">
        監測地區
      </span>

      <!-- 地區 Tab 列表 -->
      <div class="flex items-stretch flex-1 overflow-x-auto no-scrollbar">

        <!-- 載入中 -->
        <div v-if="loading" class="flex items-center gap-2 px-4">
          <div class="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin"
               :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'"></div>
          <span class="text-xs" :class="isDarkMode ? 'text-slate-600' : 'text-gray-400'">載入中</span>
        </div>

        <!-- 空列表 -->
        <div v-else-if="regions.length === 0" class="flex items-center px-4 gap-1.5">
          <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-xs" :class="isDarkMode ? 'text-slate-500' : 'text-gray-400'">無法載入地區列表</span>
        </div>

        <!-- 地區按鈕列（底線式 tab） -->
        <template v-else>
          <div
            v-for="region in regions"
            :key="region.region_id || region.region_code"
            class="region-tab flex items-stretch"
            :class="{ 'is-selected': selectedRegionId === region.region_id, 'is-dark': isDarkMode }"
          >
            <!-- 地區名稱 -->
            <button
              @click="selectRegion(region.region_id)"
              class="region-tab-btn px-4 h-full flex items-center text-sm font-medium whitespace-nowrap transition-colors"
            >
              {{ region.region_name }}
            </button>

            <!-- 操作按鈕（選中後滑入） -->
            <div class="region-actions flex items-center gap-0">
              <button
                @click.stop="$emit('edit', region)"
                class="p-1.5 h-full flex items-center transition-colors"
                :class="isDarkMode
                  ? 'text-slate-600 hover:text-slate-300'
                  : 'text-gray-300 hover:text-gray-600'"
                title="編輯"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                @click.stop="handleDelete(region)"
                class="p-1.5 h-full flex items-center transition-colors"
                :class="isDarkMode
                  ? 'text-slate-600 hover:text-red-400'
                  : 'text-gray-300 hover:text-red-500'"
                title="刪除"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- 建立按鈕 -->
      <button
        v-if="showCreateButton"
        @click="$emit('create')"
        class="flex-shrink-0 ml-2 px-3 py-1.5 text-xs font-semibold border rounded transition-colors whitespace-nowrap"
        :class="isDarkMode
          ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
          : 'border-gray-300 text-brand hover:border-brand hover:bg-brand-light'"
      >
        + 建立地區
      </button>
    </div>

    <!-- 底部分隔線 -->
    <div class="mt-0 border-b transition-colors" :class="isDarkMode ? 'border-slate-800' : 'border-gray-200'"></div>

    <!-- 刪除確認 -->
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
import api from '@/services/api';
import DeleteConfirmModal from './DeleteConfirmModal.vue';
import { error as showError } from '@/utils/simpleAlertService';

export default {
  name: 'RegionSelector',
  components: { DeleteConfirmModal },
  inject: ['isDarkMode'],
  props: {
    modelValue:        { type: [String, Number], default: null },
    showCreateButton:  { type: Boolean, default: true }
  },
  emits: ['update:modelValue', 'region-changed', 'regions-loaded', 'create', 'edit', 'delete'],
  data() {
    return {
      regions: [],
      selectedRegionId: this.modelValue || null,
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
    if (!this.selectedRegionId && this.regions.length > 0) {
      this.selectRegion(this.regions[0].region_id);
    }
  },
  methods: {
    async loadRegions() {
      try {
        this.loading = true;
        const response = await api.get('/warning-regions');
        if (response.success) {
          this.regions = response.data.filter(r => r.is_active);
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
      this.$emit('update:modelValue', regionId);
      this.$emit('region-changed', {
        region_id: regionId,
        region_code: region?.region_code || null,
        region
      });
    },
    handleDelete(region) {
      this.deletingRegion = region;
      this.showDeleteConfirm = true;
    },
    async confirmDelete() {
      if (!this.deletingRegion?.region_id) return;
      try {
        const response = await api.delete(`/warning-regions/id/${this.deletingRegion.region_id}`);
        if (response.success) {
          if (this.selectedRegionId === this.deletingRegion.region_id) {
            this.selectedRegionId = null;
            this.$emit('update:modelValue', null);
            this.$emit('region-changed', null);
          }
          await this.loadRegions();
          if (this.regions.length > 0 && !this.selectedRegionId) {
            this.selectRegion(this.regions[0].region_id);
          }
          this.cancelDelete();
        }
      } catch (err) {
        console.error('刪除監測地區專案失敗:', err);
        showError('刪除失敗：' + (err.response?.data?.message || err.message), '刪除失敗', this.isDarkMode);
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
      if (newVal !== this.selectedRegionId) this.selectedRegionId = newVal;
    }
  }
};
</script>

<style scoped>
/* 隱藏水平捲動條但保留功能 */
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Tab 容器 */
.region-tab {
  position: relative;
  border-bottom: 2px solid transparent;
  transition: border-color 0.15s ease;
}

/* 淺色 */
.region-tab .region-tab-btn    { color: #6b7280; }
.region-tab:hover .region-tab-btn { color: #111827; }
.region-tab.is-selected .region-tab-btn { color: #111827; font-weight: 600; }
.region-tab.is-selected        { border-bottom-color: #1e5c8a; }

/* 深色 */
.region-tab.is-dark .region-tab-btn { color: #475569; }
.region-tab.is-dark:hover .region-tab-btn { color: #f1f5f9; }
.region-tab.is-dark.is-selected .region-tab-btn { color: #f1f5f9; }
.region-tab.is-dark.is-selected  { border-bottom-color: #3378b5; }

/* 操作按鈕：選中前隱藏 */
.region-actions {
  width: 0;
  overflow: hidden;
  opacity: 0;
  transition: width 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}
.region-tab.is-selected .region-actions {
  width: auto;
  opacity: 1;
}
</style>
