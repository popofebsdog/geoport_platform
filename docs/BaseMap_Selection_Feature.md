# 底圖選擇功能實現文檔

## 功能概述

在側邊欄的套疊底圖區域中，新增了底圖選擇功能，允許用戶從已上傳的底圖中選擇並切換到地圖上顯示。

## 實現的組件和功能

### 1. 後端 API

#### 新增 API 端點
- **路徑**: `GET /api/data/project/:projectId/basemaps`
- **功能**: 獲取指定專案的底圖列表
- **控制器**: `getProjectBaseMaps` in `dataController.js`

#### API 響應格式
```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid",
      "name": "底圖名稱",
      "description": "底圖描述",
      "originalName": "原始檔案名.tif",
      "fileType": "raster",
      "fileSize": 1048576,
      "storagePath": "/uploads/data/...",
      "uploadDate": "2024-01-15T10:30:00Z",
      "metadata": {...}
    }
  ]
}
```

#### 支援的檔案類型
- `raster`: 柵格影像檔案（如 TIF、GeoTIFF）
- `image`: 一般影像檔案

### 2. 前端組件

#### BaseMapSelector.vue
**位置**: `frontend/src/components/basemap/BaseMapSelector.vue`

**功能**:
- 下拉選單顯示已上傳的底圖列表
- 顯示底圖詳細信息（檔案名稱、描述、大小、上傳時間）
- 重新整理按鈕
- 載入狀態指示
- 錯誤處理

**Props**:
- `projectId`: 專案 ID
- `isDarkMode`: 深色模式
- `currentBaseMapId`: 當前選中的底圖 ID

**Events**:
- `base-map-selected`: 底圖被選擇時觸發
- `base-map-changed`: 底圖變更時觸發

#### ProjectSidebar.vue 更新
**位置**: `frontend/src/components/project/ProjectSidebar.vue`

**新增功能**:
- 在自有底圖區域整合 BaseMapSelector 組件
- 新增底圖選擇相關的 props 和事件處理
- 保持原有的上傳底圖按鈕功能

**新增 Props**:
- `projectId`: 專案 ID
- `currentBaseMapId`: 當前底圖 ID

**新增 Events**:
- `base-map-selected`: 轉發底圖選擇事件
- `base-map-changed`: 轉發底圖變更事件

#### ProjectMap.vue 更新
**位置**: `frontend/src/components/project/ProjectMap.vue`

**新增功能**:
- 支援自定義底圖圖層的顯示和切換
- 根據檔案類型創建不同的圖層（TIF 使用 ImageOverlay，其他使用 TileLayer）
- 自動調整地圖視圖到底圖範圍
- 切換回默認底圖的功能

**新增 Props**:
- `currentBaseMap`: 當前選中的底圖物件

**新增 Data**:
- `customBaseMapLayer`: 自定義底圖圖層
- `isCustomBaseMapActive`: 是否正在使用自定義底圖

**新增 Methods**:
- `switchToCustomBaseMap()`: 切換到自定義底圖
- `createTifBaseMapLayer()`: 創建 TIF 底圖圖層
- `createTileBaseMapLayer()`: 創建瓦片底圖圖層
- `switchToDefaultBaseMap()`: 切換回默認底圖

#### ProjectDetail.vue 更新
**位置**: `frontend/src/views/ProjectDetail.vue`

**新增功能**:
- 管理底圖選擇狀態
- 處理底圖選擇和變更事件
- 在組件間傳遞底圖相關的 props

**新增 Data**:
- `currentBaseMap`: 當前選中的底圖物件
- `currentBaseMapId`: 當前底圖 ID

**新增 Methods**:
- `onBaseMapSelected()`: 處理底圖選擇事件
- `onBaseMapChanged()`: 處理底圖變更事件

## 使用流程

### 1. 用戶操作流程
1. 用戶進入專案地圖頁面
2. 在側邊欄展開「套疊底圖」區域
3. 展開「自有底圖」子區域
4. 在底圖選擇下拉選單中選擇已上傳的底圖
5. 地圖自動切換到選中的底圖
6. 可以隨時切換回默認底圖或選擇其他底圖

### 2. 技術流程
1. `BaseMapSelector` 組件載入時調用 API 獲取底圖列表
2. 用戶選擇底圖時觸發 `base-map-selected` 事件
3. `ProjectDetail` 接收事件並更新 `currentBaseMap` 狀態
4. `ProjectMap` 監聽到 `currentBaseMap` 變化
5. `ProjectMap` 調用 `switchToCustomBaseMap()` 切換底圖
6. 根據檔案類型創建相應的 Leaflet 圖層
7. 地圖顯示新的底圖

## 技術特點

### 1. 響應式設計
- 支援深色/淺色模式切換
- 自適應的 UI 組件
- 統一的設計風格

### 2. 錯誤處理
- API 調用失敗時的錯誤提示
- 底圖載入失敗時自動切換回默認底圖
- 網路錯誤的優雅處理

### 3. 效能優化
- 按需載入底圖列表
- 圖片預載入和錯誤處理
- 記憶體管理（清理 blob URL）

### 4. 擴展性
- 支援多種檔案格式
- 可輕鬆添加新的底圖類型
- 模組化的組件設計

## 檔案結構

```
frontend/src/
├── components/
│   ├── basemap/
│   │   └── BaseMapSelector.vue          # 底圖選擇組件
│   └── project/
│       ├── ProjectSidebar.vue           # 側邊欄（已更新）
│       └── ProjectMap.vue               # 地圖組件（已更新）
└── views/
    └── ProjectDetail.vue                # 專案詳情頁面（已更新）

backend/src/
├── controllers/
│   └── dataController.js                # 數據控制器（已更新）
└── routes/
    └── data.js                          # 數據路由（已更新）
```

## 測試建議

### 1. 功能測試
- [ ] 上傳不同類型的底圖檔案
- [ ] 測試底圖選擇下拉選單
- [ ] 驗證底圖切換功能
- [ ] 測試切換回默認底圖
- [ ] 驗證深色/淺色模式下的 UI

### 2. 錯誤測試
- [ ] 測試無底圖時的顯示
- [ ] 測試底圖載入失敗的情況
- [ ] 測試網路錯誤的處理
- [ ] 測試無效檔案格式的處理

### 3. 效能測試
- [ ] 測試大量底圖的載入效能
- [ ] 測試大檔案底圖的顯示效能
- [ ] 測試記憶體使用情況

## 未來改進建議

### 1. 功能增強
- 添加底圖預覽縮圖
- 支援底圖透明度調整
- 添加底圖排序和搜尋功能
- 支援底圖的編輯和刪除

### 2. 技術優化
- 添加底圖快取機制
- 支援底圖的漸進式載入
- 優化大檔案的處理
- 添加底圖的壓縮和優化

### 3. 用戶體驗
- 添加底圖載入進度指示
- 支援底圖的拖拽排序
- 添加底圖的收藏功能
- 支援底圖的分享功能

---

**實現日期**: 2024-01-15  
**版本**: 1.0.0  
**狀態**: 已完成並測試
