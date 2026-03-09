<template>
  <!-- 子專案時間軸視圖 -->
  <div class="timeline-container">
    <div v-for="(child, index) in sortedChildProjects" :key="child.project_id" class="timeline-item">
      <!-- 時間軸連接線 - 最後一個項目不需要額外的連接線，因為動畫按鈕會從下方往上連接 -->
      <div class="timeline-line" 
           v-if="index < sortedChildProjects.length - 1"></div>
      
      <!-- 時間軸節點（可點擊定位） -->
      <div class="timeline-node-wrapper">
        <div 
          class="timeline-node timeline-node-locatable"
          @click="$emit('locate', child)"
          :title="`定位 ${child.name} 到地圖`"
        >
          <span class="node-number">{{ index + 1 }}</span>
          <!-- 定位圖標（hover 時顯示） -->
          <div class="node-locate-icon">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
        </div>
      </div>
      
      <!-- 時間軸內容卡片 -->
      <div 
        class="timeline-content"
        :class="isDarkMode ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-600/50' : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow-md'"
      >
        <!-- 卡片右上角操作按鈕 -->
        <div class="flex items-center gap-2 absolute top-3 right-3 z-10">
          <!-- 編輯按鈕 -->
          <button
            @click.stop="$emit('edit', child)"
            class="p-1.5 rounded-md transition-all duration-300"
            :class="isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'"
            title="編輯專案"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <!-- 刪除按鈕 -->
          <button
            @click.stop="handleDelete(child)"
            class="p-1.5 rounded-md transition-all duration-300"
            :class="isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'"
            title="刪除專案"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
        
        <!-- 時間範圍標籤（卡片內） -->
        <div class="time-range-badge" :class="getStatusBadgeClass(child.status)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="ml-1.5 font-medium">{{ formatDateRange(child) }}</span>
        </div>
        
        <!-- 專案名稱 -->
        <h4 
          class="text-lg font-bold mb-2 transition-colors duration-300 cursor-pointer group"
          :class="isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'"
          @click="$emit('open', child)"
        >
          {{ child.name }}
          <svg class="w-4 h-4 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </h4>
        
        <!-- 描述 -->
        <p 
          v-if="child.description" 
          class="text-sm mb-4 line-clamp-2 leading-relaxed"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          {{ child.description }}
        </p>
        
        <!-- 操作按鈕 -->
        <div class="flex items-center justify-center space-x-2 pt-3 border-t"
             :class="isDarkMode ? 'border-slate-700' : 'border-gray-200'">
          <!-- 事件詳情 -->
          <button
            @click.stop="$emit('show-detail', child)"
            class="px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm whitespace-nowrap"
            :class="isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30'"
          >
            事件詳情
          </button>
          
          <!-- 影像紀錄 -->
          <button
            @click="$emit('disaster-record', child)"
            class="px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm whitespace-nowrap"
            :class="isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30'"
          >
            影像紀錄
          </button>
          
          <!-- 調查紀錄 -->
          <button
            @click="$emit('open', child)"
            class="px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 transform hover:scale-105 shadow-sm whitespace-nowrap"
            :class="isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30'"
          >
            調查紀錄
          </button>
        </div>
      </div>
    </div>
    
    <!-- 當沒有子專案時，只顯示新增紀錄按鈕 -->
    <div v-if="sortedChildProjects.length === 0" class="timeline-item timeline-add-record-item">
      <!-- 新增紀錄節點包裝器 -->
      <div class="timeline-add-record-node-wrapper">
        <div class="timeline-add-record-node">
          <!-- 加號圖標 -->
          <svg class="add-record-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="rgba(255, 255, 255, 0.1)"/>
            <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      
      <!-- 新增紀錄卡片（可點擊，固定顯示） -->
      <div class="timeline-add-record-expanded" @click="$emit('add-record')">
        <div class="add-record-expanded-content">
          <div class="flex items-center justify-center py-3">
            <span class="add-record-expanded-text">新增紀錄</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 當有子專案時，顯示整合的功能按鈕區域 - 新增紀錄 / 動畫模式 -->
    <div v-else class="timeline-item timeline-action-item" 
         :class="isAnimationMode ? 'timeline-animation-item' : 'timeline-add-record-item'">
      <!-- 從節點往上連接到最後一個項目的連接線 -->
      <div class="animation-timeline-line-up"></div>
      
      <!-- 節點包裝器 -->
      <div class="timeline-action-node-wrapper">
        <div class="timeline-action-node" 
             :class="isAnimationMode ? 'timeline-animation-node' : 'timeline-add-record-node'">
          <!-- 播放圖標 - 動畫模式 -->
          <svg v-if="isAnimationMode" class="action-icon animation-play-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="rgba(255, 255, 255, 0.1)"/>
            <path d="M10 8L16 12L10 16V8Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
          </svg>
          <!-- 加號圖標 - 新增紀錄 -->
          <svg v-else class="action-icon add-record-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="rgba(255, 255, 255, 0.1)"/>
            <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      
      <!-- 功能卡片（可點擊，固定顯示） -->
      <div class="timeline-action-expanded" 
           :class="isAnimationMode ? 'timeline-animation-expanded' : 'timeline-add-record-expanded'"
           @click="handleActionClick">
        <div class="action-expanded-content"
             :class="isAnimationMode ? 'animation-expanded-content' : 'add-record-expanded-content'">
          <div class="flex items-center justify-between py-3 px-4">
            <!-- 主要功能文字 -->
            <span class="action-expanded-text"
                  :class="isAnimationMode ? 'animation-expanded-text' : 'add-record-expanded-text'">
              {{ isAnimationMode ? '瀏覽模式' : '新增紀錄' }}
            </span>
            
            <!-- 切換按鈕（僅當有子專案時顯示） -->
            <div class="action-toggle-wrapper">
              <button 
                @click.stop="toggleMode"
                class="action-toggle-btn"
                :class="isAnimationMode ? 'toggle-animation' : 'toggle-add-record'"
              >
                <svg class="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </button>
              <!-- Tooltip -->
              <div class="toggle-tooltip">
                {{ isAnimationMode ? '切換到新增紀錄' : '切換到瀏覽模式' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'
import { confirm } from '@/utils/simpleAlertService'

export default {
  name: 'ChildProjectTimeline',
  props: {
    childProjects: {
      type: Array,
      required: true
    },
    isDarkMode: {
      type: Boolean,
      default: false
    },
    parentProject: {
      type: Object,
      required: true
    }
  },
  emits: ['open', 'edit', 'delete', 'locate', 'disaster-record', 'animation-mode', 'add-record', 'show-detail'],
  setup(props, { emit }) {
    // 解析日期字串（支援多種格式，包括 PostgreSQL 格式）
    const parseDate = (dateString) => {
      if (!dateString) return null
      
      try {
        // 處理 PostgreSQL 格式：2025-11-01 00:00:00.000 +0800
        // 或：2025-11-01T00:00:00.000Z
        let normalized = String(dateString).trim()
        
        // 如果有空格（PostgreSQL 格式），轉換為 ISO 格式
        if (normalized.includes(' ')) {
          // 移除毫秒部分 .000
          normalized = normalized.replace(/\.\d{3,}/g, '')
          
          // 處理時區：+0800 或 -0500
          const timezoneMatch = normalized.match(/([+-]\d{4})/)
          if (timezoneMatch) {
            const timezone = timezoneMatch[1]
            // 轉換 +0800 為 +08:00 格式
            const tzFormatted = `${timezone.slice(0, 3)}:${timezone.slice(3)}`
            normalized = normalized.replace(/[+-]\d{4}/, tzFormatted)
          }
          
          // 將空格替換為 T（ISO 格式）
          normalized = normalized.replace(' ', 'T')
        }
        
        const date = new Date(normalized)
        return isNaN(date.getTime()) ? null : date
      } catch (error) {
        console.warn('解析日期失敗:', dateString, error)
        return null
      }
    }
    
    // 按時間排序（最舊的在前）
    const sortedChildProjects = computed(() => {
      return [...props.childProjects].sort((a, b) => {
        // 優先使用 event_date，其次 start_date，最後 created_at
        const dateA = parseDate(a.event_date) || parseDate(a.start_date) || new Date(a.created_at)
        const dateB = parseDate(b.event_date) || parseDate(b.start_date) || new Date(b.created_at)
        return dateA - dateB // 最舊的在前
      })
    })
    
    // 格式化日期（只顯示重要事件日期和時間，不顯示時間區間）
    const formatDateRange = (child) => {
      // 只顯示 event_date，不顯示時間區間
      if (child.event_date) {
        const eventDate = parseDate(child.event_date)
        if (eventDate) {
          const year = eventDate.getFullYear()
          const month = String(eventDate.getMonth() + 1).padStart(2, '0')
          const day = String(eventDate.getDate()).padStart(2, '0')
          const hours = String(eventDate.getHours()).padStart(2, '0')
          const minutes = String(eventDate.getMinutes()).padStart(2, '0')
          
          // 如果有時間（不是 00:00），顯示時間
          if (hours !== '00' || minutes !== '00') {
            return `${year}/${month}/${day} ${hours}:${minutes}`
          } else {
            return `${year}/${month}/${day}`
          }
        }
      }
      
      return '未設定時間'
    }
    
    const getStatusBadgeClass = (status) => {
      // 統一使用藍色風格，不再使用狀態顏色
      return 'time-badge-blue'
    }
    
    // 模式切換狀態：true = 動畫模式，false = 新增紀錄
    // 預設：有子專案時為動畫模式
    const isAnimationMode = ref(props.childProjects.length > 0)
    
    // 切換模式（僅當有子專案時可用）
    const toggleMode = () => {
      if (sortedChildProjects.value.length > 0) {
        isAnimationMode.value = !isAnimationMode.value
      }
    }
    
    // 處理主要功能點擊
    const handleActionClick = () => {
      if (isAnimationMode.value) {
        emit('animation-mode')
      } else {
        emit('add-record')
      }
    }
    
    // 處理刪除事件
    const handleDelete = async (child) => {
      // 顯示確認對話框
      const confirmed = await confirm(
        `確定要刪除時期「${child.name}」嗎？`,
        '刪除確認',
        props.isDarkMode
      )
      
      
      if (confirmed) {
        emit('delete', child)
      } else {
      }
    }
    
    // 監聽子專案變化，自動調整模式
    watch(() => props.childProjects.length, (newLength) => {
      if (newLength === 0) {
        // 沒有子專案時，自動切換到新增紀錄模式
        isAnimationMode.value = false
      } else if (newLength > 0 && !isAnimationMode.value) {
        // 有子專案時，預設為動畫模式
        isAnimationMode.value = true
      }
    })
    
    return {
      sortedChildProjects,
      formatDateRange,
      getStatusBadgeClass,
      isAnimationMode,
      toggleMode,
      handleActionClick,
      handleDelete
    }
  }
}
</script>

<style scoped>
.timeline-container {
  position: relative;
  padding-left: 1.5rem;
  overflow: visible; /* 允許連接線超出容器 */
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

/* 時間軸連接線 - 從當前圓點中心延伸到下一個圓點中心 */
.timeline-line {
  position: absolute;
  left: 0;
  top: 50%; /* 從當前卡片中間（圓點中心）開始 */
  width: 2px;
  /* 計算方式：
     從當前圓點中心（50%）到下一個圓點中心：
     1. 當前卡片剩餘：100% - 50% = 50%
     2. 卡片間距：2rem (margin-bottom)
     3. 下一個卡片高度的一半（假設高度相近）：約當前卡片高度的 50%
     總高度：50% + 2rem + 50% = 100% + 2rem
     但由於 CSS calc 的限制，使用較大的值確保連接
  */
  height: calc(150% + 2rem);
  margin-left: 13px; /* 調整為圓點中心（28px / 2 = 14px，減去線條寬度的一半） */
  background-color: rgb(59, 130, 246); /* blue-500 純色 */
  border-radius: 1px;
  z-index: 1; /* 在圓點下方 */
}

/* 動畫項目是最後一個，不應該有向下的連接線 - 使用更具體的選擇器覆蓋所有情況 */
.timeline-animation-item.timeline-item:last-child .timeline-line,
.timeline-animation-item .timeline-line,
.timeline-animation-item.timeline-item .timeline-line,
.timeline-animation-item.timeline-item:last-child::after,
.timeline-animation-item.timeline-item:last-child::before,
.timeline-animation-item > .timeline-line {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  background: none !important;
  background-color: transparent !important;
  overflow: hidden !important;
  content: none !important;
  position: absolute !important;
  left: -9999px !important; /* 移到視圖外 */
  top: -9999px !important;
}

/* 確保動畫項目本身不生成連接線 */
.timeline-animation-item::before,
.timeline-animation-item::after {
  content: none !important;
  display: none !important;
  visibility: hidden !important;
}

/* 從動畫節點往上連接到最後一個項目的連接線 */
.animation-timeline-line-up {
  position: absolute;
  left: 0;
  bottom: 50%; /* 從動畫節點中心開始 */
  top: calc(-100% - 2rem - 14px); /* 往上延伸到最後一個項目節點中心（14px是節點包裝器高度的一半） */
  width: 2px;
  margin-left: 13px; /* 調整為圓點中心（28px / 2 = 14px，減去線條寬度的一半） */
  background-color: rgb(59, 130, 246);
  border-radius: 1px;
  z-index: 1; /* 在節點下方 */
  background-image: none;
  background-clip: padding-box;
  pointer-events: none;
}

/* 時間軸節點包裝器 - 卡片中間 */
.timeline-node-wrapper {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10; /* 在連接線上方 */
}

/* 時間軸節點 - 美觀的藍色圓形 */
.timeline-node {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 2px 8px rgba(59, 130, 246, 0.4),
    0 0 0 6px rgba(59, 130, 246, 0.1);
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 可點擊定位的節點 */
.timeline-node-locatable {
  cursor: pointer;
}

.timeline-node-locatable:hover {
  transform: scale(1.15);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 4px 12px rgba(34, 197, 94, 0.6),
    0 0 0 8px rgba(34, 197, 94, 0.2);
  background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(22, 163, 74) 100%);
}

.timeline-node-wrapper:hover .timeline-node:not(.timeline-node-locatable) {
  transform: scale(1.15);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 4px 12px rgba(59, 130, 246, 0.6),
    0 0 0 8px rgba(59, 130, 246, 0.2);
}

/* 定位圖標（hover 時顯示） */
.node-locate-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 12;
  pointer-events: none;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.timeline-node-locatable:hover .node-locate-icon {
  opacity: 1;
}

.timeline-node-locatable:hover .node-number {
  opacity: 0;
}

/* 節點中的數字 */
.node-number {
  font-size: 11px;
  font-weight: 700;
  color: white;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 11;
  user-select: none;
  transition: opacity 0.3s ease;
}

/* 時間軸內容卡片 */
.timeline-content {
  padding: 1.25rem;
  border-radius: 0.75rem;
  border-width: 1px;
  transition: all 0.3s ease;
  margin-left: 20px;
  position: relative;
}

/* 卡片右上角編輯按鈕 */
.timeline-card-edit-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.375rem;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.timeline-card-edit-btn:hover {
  transform: scale(1.1);
}

.timeline-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24px;
  width: 0;
  height: 0;
  margin-left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  transition: border-color 0.3s ease;
}

:global(.dark) .timeline-content::before {
  border-right: 8px solid rgb(51, 65, 85);
}

:global(.dark) .timeline-content:hover::before {
  border-right-color: rgb(71, 85, 105);
}

.timeline-content:not(:global(.dark))::before {
  border-right: 8px solid rgb(229, 231, 235);
}

.timeline-content:not(:global(.dark)):hover::before {
  border-right-color: rgb(249, 250, 251);
}

/* 時間範圍標籤 - 統一藍色風格 */
.time-range-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  border-width: 1px;
  transition: all 0.2s ease;
}

.time-badge-blue {
  background: linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(219, 234, 254) 100%);
  color: rgb(30, 64, 175);
  border-color: rgb(191, 219, 254);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
}

:global(.dark) .time-badge-blue {
  background: linear-gradient(135deg, rgb(30, 58, 138) 0%, rgb(30, 64, 175) 100%);
  color: rgb(191, 219, 254);
  border-color: rgb(59, 130, 246);
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
}

.time-badge-blue:hover {
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

:global(.dark) .time-badge-blue:hover {
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

/* 文字截斷 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2; /* 標準屬性 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 動畫模式項目 - 作為時間軸項目（最後一個） */
.timeline-animation-item {
  position: relative;
  margin-top: 2rem; /* 與其他時間軸項目的間距一致 */
  margin-bottom: 0; /* 最後一個節點，不需要底部間距 */
  min-height: 80px; /* 確保有足夠高度容納展開的卡片 */
  overflow: visible; /* 允許連接線超出容器 */
  z-index: 1;
}

/* 確保動畫項目不顯示任何連接線（因為它是最後一個，不需要向下連接） */
.timeline-animation-item .timeline-line,
.timeline-animation-item > .timeline-line,
.timeline-animation-item.timeline-item .timeline-line,
.timeline-animation-item.timeline-item:last-child .timeline-line,
.timeline-animation-item.timeline-item:last-child::after,
.timeline-animation-item.timeline-item:last-child::before {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
  background: none !important;
  background-color: transparent !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -9999px !important; /* 移到視圖外 */
  top: -9999px !important;
  content: none !important;
}

/* 確保動畫項目本身不生成連接線 */
.timeline-animation-item::after,
.timeline-animation-item::before {
  content: none !important;
  display: none !important;
  visibility: hidden !important;
}

/* 特別處理：確保動畫項目不會繼承任何連接線樣式 */
.timeline-animation-item.timeline-item * .timeline-line {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  height: 0 !important;
  width: 0 !important;
}


/* 整合的功能節點包裝器 - 與時間軸節點一致 */
.timeline-action-node-wrapper {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10; /* 在卡片上方 */
}

/* 動畫模式節點包裝器（繼承） */
.timeline-animation-node-wrapper,
.timeline-add-record-node-wrapper {
  /* 繼承 timeline-action-node-wrapper 的樣式 */
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* 動畫模式節點 - 藍色主題，優化設計（純裝飾，不可點擊） */
.timeline-animation-node {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 0 0 6px rgba(59, 130, 246, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  z-index: 10;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  border: none;
  padding: 0;
  overflow: visible;
}

.timeline-animation-item:hover .timeline-animation-node {
  transform: scale(1.1);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 6px 20px rgba(59, 130, 246, 0.5),
    0 0 0 8px rgba(59, 130, 246, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  background: linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(59, 130, 246) 100%);
}

/* 播放圖標 - 優化設計 */
.animation-play-icon {
  width: 18px;
  height: 18px;
  color: white;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.timeline-animation-item:hover .animation-play-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
}

/* 卡片中的播放圖標 */
.animation-play-icon-large {
  transition: transform 0.3s ease;
}

.timeline-animation-item:hover .animation-play-icon-large {
  transform: scale(1.15);
}

/* 外框圓動畫效果 */
.timeline-animation-node::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: -1;
}

.timeline-animation-node-wrapper:hover .timeline-animation-node::before {
  width: 40px;
  height: 40px;
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.6);
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}

/* 動畫模式卡片（固定顯示，可點擊，與時間軸卡片一樣寬度） */
.timeline-animation-expanded {
  position: absolute;
  left: 20px; /* 與時間軸卡片對齊（margin-left: 20px） */
  top: 50%;
  transform: translateY(-50%);
  opacity: 1; /* 固定顯示 */
  pointer-events: auto; /* 允許點擊 */
  transition: all 0.3s ease;
  z-index: 5; /* 在節點下方（節點是 z-index: 10），但在連接線上方 */
  width: calc(100% - 20px); /* 與時間軸卡片一樣寬度（只需要減去節點的間距） */
  cursor: pointer; /* 可點擊 */
}

.animation-expanded-content {
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 100%;
  position: relative;
  cursor: pointer;
  /* 藍色主題背景 */
  background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
  border-color: rgb(96, 165, 250);
  box-shadow: 
    0 2px 8px rgba(59, 130, 246, 0.25),
    0 1px 3px rgba(59, 130, 246, 0.15);
}

.timeline-animation-expanded:hover .animation-expanded-content {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgb(96, 165, 250) 0%, rgb(59, 130, 246) 100%);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.35),
    0 4px 8px rgba(59, 130, 246, 0.25);
  border-color: rgb(147, 197, 253);
}

:global(.dark) .animation-expanded-content {
  background: linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%);
  border-color: rgb(59, 130, 246);
  box-shadow: 
    0 2px 8px rgba(59, 130, 246, 0.4),
    0 1px 3px rgba(59, 130, 246, 0.25);
}

:global(.dark) .timeline-animation-expanded:hover .animation-expanded-content {
  background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.5),
    0 4px 8px rgba(59, 130, 246, 0.35);
  border-color: rgb(96, 165, 250);
}

.animation-expanded-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24px;
  width: 0;
  height: 0;
  margin-left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  transition: border-color 0.3s ease;
  /* 藍色主題箭頭 */
  border-right: 8px solid rgb(59, 130, 246);
}

.timeline-animation-expanded:hover .animation-expanded-content::before {
  border-right-color: rgb(96, 165, 250);
}

:global(.dark) .animation-expanded-content::before {
  border-right: 8px solid rgb(37, 99, 235);
}

:global(.dark) .timeline-animation-expanded:hover .animation-expanded-content::before {
  border-right-color: rgb(59, 130, 246);
}

.animation-expanded-text {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.3s ease;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* 新增紀錄項目 - 與動畫模式項目類似，但使用綠色主題 */
.timeline-add-record-item {
  position: relative;
  margin-top: 2rem;
  margin-bottom: 0;
  min-height: 80px;
  overflow: visible;
  z-index: 1;
}

/* 新增紀錄節點包裝器 */
.timeline-add-record-node-wrapper {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* 新增紀錄節點 - 綠色主題 */
.timeline-add-record-node {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(22, 163, 74) 100%);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 4px 12px rgba(34, 197, 94, 0.4),
    0 0 0 6px rgba(34, 197, 94, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
  z-index: 10;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  border: none;
  padding: 0;
  overflow: visible;
}

.timeline-add-record-item:hover .timeline-add-record-node {
  transform: scale(1.1);
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 1),
    0 6px 20px rgba(34, 197, 94, 0.5),
    0 0 0 8px rgba(34, 197, 94, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.4);
  background: linear-gradient(135deg, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 100%);
}

/* 加號圖標 */
.add-record-icon {
  width: 18px;
  height: 18px;
  color: white;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.timeline-add-record-item:hover .add-record-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
}

/* 新增紀錄卡片（固定顯示，可點擊） */
.timeline-add-record-expanded {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 1;
  pointer-events: auto;
  transition: all 0.3s ease;
  z-index: 5;
  width: calc(100% - 20px);
  cursor: pointer;
}

.add-record-expanded-content {
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 100%;
  position: relative;
  cursor: pointer;
  /* 綠色主題背景 */
  background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(22, 163, 74) 100%);
  border-color: rgb(74, 222, 128);
  box-shadow: 
    0 2px 8px rgba(34, 197, 94, 0.25),
    0 1px 3px rgba(34, 197, 94, 0.15);
}

.timeline-add-record-expanded:hover .add-record-expanded-content {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 100%);
  box-shadow: 
    0 8px 20px rgba(34, 197, 94, 0.35),
    0 4px 8px rgba(34, 197, 94, 0.25);
  border-color: rgb(134, 239, 172);
}

:global(.dark) .add-record-expanded-content {
  background: linear-gradient(135deg, rgb(22, 163, 74) 0%, rgb(21, 128, 61) 100%);
  border-color: rgb(34, 197, 94);
  box-shadow: 
    0 2px 8px rgba(34, 197, 94, 0.4),
    0 1px 3px rgba(34, 197, 94, 0.25);
}

:global(.dark) .timeline-add-record-expanded:hover .add-record-expanded-content {
  background: linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(22, 163, 74) 100%);
  box-shadow: 
    0 8px 20px rgba(34, 197, 94, 0.5),
    0 4px 8px rgba(34, 197, 94, 0.35);
  border-color: rgb(74, 222, 128);
}

.add-record-expanded-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24px;
  width: 0;
  height: 0;
  margin-left: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  transition: border-color 0.3s ease;
  /* 綠色主題箭頭 */
  border-right: 8px solid rgb(34, 197, 94);
}

.timeline-add-record-expanded:hover .add-record-expanded-content::before {
  border-right-color: rgb(74, 222, 128);
}

:global(.dark) .add-record-expanded-content::before {
  border-right: 8px solid rgb(22, 163, 74);
}

:global(.dark) .timeline-add-record-expanded:hover .add-record-expanded-content::before {
  border-right-color: rgb(34, 197, 94);
}

.add-record-expanded-text {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.3s ease;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* 統一的 action 卡片樣式 */
.timeline-action-expanded {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 1;
  pointer-events: auto;
  transition: all 0.3s ease;
  z-index: 5;
  width: calc(100% - 20px);
  cursor: pointer;
}

.action-expanded-content {
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 100%;
  position: relative;
  cursor: pointer;
}

.action-expanded-text {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.3s ease;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* 切換按鈕包裝器 */
.action-toggle-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 切換按鈕樣式 - 更明顯的設計 */
.action-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.action-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.15);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 0 0 2px rgba(255, 255, 255, 0.2) inset;
}

.action-toggle-btn:active {
  transform: scale(1.05);
}

.toggle-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.action-toggle-btn:hover .toggle-icon {
  transform: rotate(90deg);
}

/* 動畫模式下的切換按鈕 */
.toggle-animation {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.toggle-animation:hover {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.7);
  box-shadow: 
    0 4px 16px rgba(59, 130, 246, 0.5),
    0 0 0 2px rgba(59, 130, 246, 0.2) inset;
}

/* 新增紀錄模式下的切換按鈕 */
.toggle-add-record {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.toggle-add-record:hover {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.7);
  box-shadow: 
    0 4px 16px rgba(34, 197, 94, 0.5),
    0 0 0 2px rgba(34, 197, 94, 0.2) inset;
}

/* Tooltip 樣式 */
.toggle-tooltip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toggle-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 6px solid rgba(0, 0, 0, 0.85);
}

.action-toggle-wrapper:hover .toggle-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(-4px);
}

/* 圖標樣式 */
.action-icon {
  width: 18px;
  height: 18px;
  color: white;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.timeline-action-item:hover .action-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
}

/* 響應式調整 */
@media (max-width: 640px) {
  .timeline-container {
    padding-left: 1.25rem;
  }
  
  .timeline-node-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .timeline-node {
    width: 24px;
    height: 24px;
  }
  
  .node-number {
    font-size: 10px;
  }
  
  .timeline-content {
    margin-left: 16px;
  }
  
  .timeline-animation-node-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .timeline-animation-node {
    width: 24px;
    height: 24px;
  }
  
  .animation-play-icon {
    width: 9px;
    height: 9px;
  }
}
</style>

