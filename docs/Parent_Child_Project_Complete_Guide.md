# 母子專案系統完整實施指南

## ✅ 已完成實施

### 1. 資料庫層 ✓
- ✅ 遷移腳本：`backend/database/migrations/016_add_parent_project_support.sql`
- ✅ 新增欄位：
  - `parent_project_id` - 母專案 ID
  - `is_parent` - 是否為母專案
  - `child_count` - 子專案數量
- ✅ 觸發器：自動維護 `child_count`
- ✅ 視圖：
  - `parent_projects` - 母專案列表
  - `child_projects_with_parent` - 帶母專案資訊的子專案列表

### 2. 後端 API ✓
#### 母專案 Controller
**檔案**：`backend/src/controllers/parentProjectController.js`

**API 端點**：
- `GET /api/parent-projects` - 獲取所有母專案
- `GET /api/parent-projects/:id` - 獲取單個母專案
- `POST /api/parent-projects` - 創建母專案
- `PUT /api/parent-projects/:id` - 更新母專案
- `DELETE /api/parent-projects/:id` - 刪除母專案
- `GET /api/parent-projects/:id/children` - 獲取子專案列表
- `POST /api/parent-projects/:id/children` - 創建子專案

#### 子專案 Controller
**檔案**：`backend/src/controllers/childProjectController.js`

**API 端點**：
- `GET /api/child-projects` - 獲取所有子專案
- `GET /api/child-projects/:id` - 獲取單個子專案
- `PUT /api/child-projects/:id` - 更新子專案
- `DELETE /api/child-projects/:id` - 刪除子專案

#### 路由檔案
- `backend/src/routes/parentProjects.js`
- `backend/src/routes/childProjects.js`
- 已註冊到 `backend/src/app.js`

### 3. 前端組件 ✓

#### 母專案卡片（資料夾視圖）
**檔案**：`frontend/src/components/project/ParentProjectCard.vue`

**特點**：
- 🗂️ 資料夾圖標，點擊展開/收起
- 📊 顯示地點資訊、道路資訊
- 🔢 統計子專案數量、檔案數量
- ⚡ 操作：新增時期、定位、編輯、刪除
- 🎨 支援深色/淺色模式

#### 子專案時間軸
**檔案**：`frontend/src/components/project/ChildProjectTimeline.vue`

**特點**：
- ⏰ 垂直時間軸佈局
- 📅 顯示時間範圍標籤
- 🎨 狀態顏色（進行中/已完成/規劃中/已暫停）
- 📂 檔案和圖層統計
- ⚡ 操作：開啟、編輯、刪除

#### 創建母專案模態框
**檔案**：`frontend/src/components/project/CreateParentProjectModal.vue`

**欄位**：
- 地點名稱 *（必填）
- 地點描述
- 行政區域
- 地點座標 (WGS84) *（必填）
  - 緯度
  - 經度
- 道路類型與編號
  - 類型：公路/國道/鐵路
  - 編號：例如「台7線」
  - 路段/樁號：例如「49.8K」
- 標籤（選填）

#### 創建子專案模態框
**檔案**：`frontend/src/components/project/CreateChildProjectModal.vue`

**欄位**：
- 時期名稱 *（必填）
- 時期描述
- 起迄時間 *（必填）
  - 開始時間
  - 結束時間
  - 自動計算監測週期
- 重要事件日期（選填）
- 優先級
  - 低/中/高
- 標籤（選填）

#### 專案管理頁面
**檔案**：`frontend/src/views/ProjectManagement.vue`

**特點**：
- 🔍 搜尋功能
- 📁 母專案資料夾視圖
- ⏰ 子專案時間軸視圖
- ➕ 新增地點/時期
- 🔄 自動載入子專案
- 📊 統計資訊展示

### 4. 路由配置 ✓
**檔案**：`frontend/src/router/index.js`

**新增路由**：
```javascript
{
  path: '/projects',
  name: 'ProjectManagement',
  component: ProjectManagement,
  meta: { title: '專案管理' }
}
```

---

## 🎯 系統架構

### 概念模型

```
母專案（地點）
├── 名稱：台7線 49.8K 復興區邊坡
├── 座標：(121.408, 24.675)
├── 道路：台7線 49.8K
└── 子專案（時間週期）
    ├── 2024年定期監測 (2024/01 - 2024/12)
    ├── 2023年定期監測 (2023/01 - 2023/12)
    └── 2022年定期監測 (2022/01 - 2022/12)
```

### 資料流向

```
使用者操作
    ↓
創建母專案（地點）
    ↓
存儲地點資訊（座標、道路等）
    ↓
在母專案下創建子專案（時期）
    ↓
子專案存儲時間資訊
    ↓
上傳檔案/圖層到子專案
    ↓
母專案自動聚合統計
```

---

## 🚀 使用指南

### 1. 創建母專案（地點）

1. 點擊「新增地點」按鈕
2. 填寫地點資訊：
   - 地點名稱（例如：台7線 49.8K 復興區邊坡）
   - 地點描述
   - 行政區域（例如：桃園市復興區）
   - 座標（WGS84）
   - 道路資訊（選填）
3. 點擊「創建地點專案」

### 2. 創建子專案（時期）

1. 在母專案卡片上點擊「➕」圖標
2. 填寫時期資訊：
   - 時期名稱（例如：2024年度定期監測）
   - 時期描述
   - 開始和結束時間
   - 優先級
3. 點擊「創建時期專案」

### 3. 查看專案

- **展開資料夾**：點擊母專案卡片可展開/收起子專案時間軸
- **定位地點**：點擊定位圖標可在地圖上定位
- **開啟子專案**：點擊時間軸上的「開啟專案」按鈕

### 4. 管理專案

- **編輯**：點擊編輯圖標修改專案資訊
- **刪除**：點擊刪除圖標移除專案
  - 刪除母專案會提示確認（會一併刪除所有子專案）
  - 刪除子專案只影響該時期

---

## 📊 API 使用範例

### 創建母專案
```javascript
POST /api/parent-projects
Content-Type: application/json

{
  "name": "台7線 49.8K 復興區邊坡",
  "description": "復興區大漢溪沿線邊坡監測",
  "location_name": "桃園市復興區",
  "locationGeometry": {
    "type": "Point",
    "coordinates": [121.408, 24.675]
  },
  "road_type": "highway",
  "road_number": "台7線",
  "road_section": "49.8K",
  "tags": ["邊坡", "監測", "重點區域"]
}
```

### 創建子專案
```javascript
POST /api/parent-projects/{parentId}/children
Content-Type: application/json

{
  "name": "2024年度定期監測",
  "description": "2024年定期監測作業",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "event_date": null,
  "priority": "normal",
  "tags": ["定期監測", "UAV"]
}
```

### 獲取母專案及其子專案
```javascript
// 1. 獲取所有母專案
GET /api/parent-projects

// 2. 獲取特定母專案的子專案
GET /api/parent-projects/{parentId}/children

// 3. 獲取單個子專案詳情
GET /api/child-projects/{childId}
```

---

## 🎨 UI 設計理念

### 視覺層級
1. **母專案（地點）**
   - 🗂️ 黃色資料夾圖標
   - 較大的卡片
   - 展開式設計

2. **子專案（時期）**
   - ⏰ 藍色時間點
   - 時間軸佈局
   - 狀態顏色區分

### 操作流程
1. 使用者看到地點（資料夾）
2. 點擊展開查看時間軸
3. 選擇特定時期開啟
4. 進入專案詳情頁面

### 資訊展示
- **母專案**：地點、道路、子專案數量、總檔案數
- **子專案**：時間範圍、狀態、檔案統計

---

## 🔧 技術細節

### 資料庫觸發器
```sql
-- 自動維護 child_count
CREATE TRIGGER trigger_update_project_child_count
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_project_child_count();
```

### 前端狀態管理
- 使用 Vue 3 Composition API
- `ref` 管理響應式資料
- `computed` 計算過濾結果
- `inject` 獲取深色模式狀態

### API 調用
```javascript
// 使用全局 $api 實例
const response = await window.$api.get('/parent-projects')
const response = await window.$api.post('/parent-projects', data)
```

---

## 📝 開發筆記

### 已實現功能
- ✅ 母子專案資料庫結構
- ✅ 完整的 CRUD API
- ✅ 資料夾式 UI（母專案）
- ✅ 時間軸式 UI（子專案）
- ✅ 創建專案模態框
- ✅ 搜尋功能
- ✅ 統計資訊聚合
- ✅ 深色/淺色模式支援

### 待開發功能
- ⏳ 編輯母專案模態框
- ⏳ 編輯子專案模態框
- ⏳ 地圖定位整合
- ⏳ 批量操作
- ⏳ 專案匯出/匯入
- ⏳ 權限控制

---

## 🐛 測試清單

### 後端測試
- [ ] 創建母專案
- [ ] 創建子專案
- [ ] 獲取母專案列表
- [ ] 獲取子專案列表
- [ ] 更新母專案
- [ ] 更新子專案
- [ ] 刪除子專案
- [ ] 刪除母專案（含子專案檢查）
- [ ] 觸發器測試（child_count 自動更新）

### 前端測試
- [ ] 母專案卡片渲染
- [ ] 展開/收起動畫
- [ ] 子專案時間軸渲染
- [ ] 創建母專案流程
- [ ] 創建子專案流程
- [ ] 搜尋功能
- [ ] 深色/淺色模式切換
- [ ] 響應式設計（不同螢幕尺寸）

### 整合測試
- [ ] 創建完整的母子專案流程
- [ ] 刪除流程測試
- [ ] 統計資訊更新
- [ ] 子專案導航到詳情頁面

---

## 📞 如何使用

### 訪問專案管理頁面
1. 啟動前端開發服務器：
   ```bash
   cd frontend
   npm run dev
   ```

2. 在瀏覽器訪問：
   ```
   http://localhost:5173/projects
   ```

### 或從主導航進入
- 在應用程式主導航中添加「專案管理」連結
- 路徑：`/projects`

---

## 🎉 完成！

母子專案系統已經完整實施：
- ✅ 資料庫層面完成
- ✅ 後端 API 完成
- ✅ 前端 UI 組件完成
- ✅ 路由配置完成

**可以開始測試了！**

訪問 `http://localhost:5173/projects` 查看效果。

