# 母子專案系統實施進度

## ✅ 已完成

### 1. 資料庫層 (100%)
- ✅ 創建遷移腳本 `016_add_parent_project_support.sql`
- ✅ 執行資料庫遷移
- ✅ 添加欄位：`parent_project_id`, `is_parent`, `child_count`
- ✅ 創建觸發器自動維護母子關係
- ✅ 創建視圖：`parent_projects`, `child_projects_with_parent`

### 2. 後端 API (100%)
- ✅ 創建母專案 Controller (`parentProjectController.js`)
  - `GET /api/parent-projects` - 獲取所有母專案
  - `GET /api/parent-projects/:id` - 獲取單個母專案
  - `POST /api/parent-projects` - 創建母專案
  - `PUT /api/parent-projects/:id` - 更新母專案
  - `DELETE /api/parent-projects/:id` - 刪除母專案
  
- ✅ 創建子專案 Controller (`childProjectController.js`)
  - `GET /api/parent-projects/:parentId/children` - 獲取母專案的所有子專案
  - `POST /api/parent-projects/:parentId/children` - 創建子專案
  - `GET /api/child-projects` - 獲取所有子專案（平面視圖）
  - `GET /api/child-projects/:id` - 獲取單個子專案
  - `PUT /api/child-projects/:id` - 更新子專案
  - `DELETE /api/child-projects/:id` - 刪除子專案

- ✅ 創建路由檔案
  - `routes/parentProjects.js`
  - `routes/childProjects.js`
  
- ✅ 註冊路由到 `app.js`

### 3. 前端組件 (進行中)
- ✅ 創建 `ParentProjectCard.vue` - 母專案資料夾視圖

## 🚧 待完成

### 前端組件
- [ ] 創建 `ChildProjectTimeline.vue` - 子專案時間軸視圖
- [ ] 創建 `CreateParentProjectModal.vue` - 創建母專案模態框
- [ ] 創建 `CreateChildProjectModal.vue` - 創建子專案模態框
- [ ] 修改 `DisasterCollection.vue` - 整合母子專案視圖

### 測試
- [ ] 測試創建母專案
- [ ] 測試創建子專案
- [ ] 測試資料夾展開/收起
- [ ] 測試時間軸顯示
- [ ] 測試 CRUD 操作

## 📝 下一步行動

1. **創建 ChildProjectTimeline.vue** - 時間軸視圖組件
2. **創建模態框組件** - 母子專案創建流程
3. **整合到 DisasterCollection.vue** - 替換現有專案列表
4. **測試完整流程**

## 🔗 API 端點總覽

### 母專案 API
```
GET    /api/parent-projects           獲取所有母專案（資料夾視圖）
GET    /api/parent-projects/:id       獲取單個母專案
POST   /api/parent-projects           創建母專案（地點）
PUT    /api/parent-projects/:id       更新母專案
DELETE /api/parent-projects/:id       刪除母專案
GET    /api/parent-projects/:id/children  獲取子專案列表
POST   /api/parent-projects/:id/children  創建子專案
```

### 子專案 API
```
GET    /api/child-projects             獲取所有子專案（平面視圖）
GET    /api/child-projects/:id         獲取單個子專案
PUT    /api/child-projects/:id         更新子專案
DELETE /api/child-projects/:id         刪除子專案
```

## 💡 設計特點

### 資料夾呈現（母專案）
- 使用資料夾圖標
- 點擊展開顯示子專案
- 顯示統計資訊：子專案數量、檔案數量
- 操作按鈕：新增時期、定位、編輯、刪除

### 時間軸呈現（子專案）
- 垂直時間軸佈局
- 顯示時間範圍
- 顯示檔案和圖層統計
- 操作按鈕：開啟、編輯、刪除

## 🎨 UI 設計理念

1. **視覺層級清晰**
   - 母專案：資料夾外觀，黃色圖標
   - 子專案：時間軸佈局，藍色時間點

2. **操作直觀**
   - 點擊資料夾展開/收起
   - 點擊時間點開啟子專案
   - 懸停顯示詳細資訊

3. **資訊完整**
   - 母專案顯示地點資訊
   - 子專案顯示時間範圍
   - 統計資訊一目了然

## 📚 使用範例

### 創建母專案（地點）
```javascript
POST /api/parent-projects
{
  "name": "台7線 49.8K 復興區邊坡",
  "description": "復興區大漢溪沿線邊坡監測",
  "location_name": "復興區",
  "locationGeometry": {
    "type": "Point",
    "coordinates": [121.408, 24.675]
  },
  "road_type": "national",
  "road_number": "台7線",
  "road_section": "49.8K"
}
```

### 創建子專案（時期）
```javascript
POST /api/parent-projects/{parentId}/children
{
  "name": "2024年度監測",
  "description": "2024年定期監測作業",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

## 📊 資料流向

```
使用者創建母專案
  ↓
母專案存儲地點資訊（座標、道路）
  ↓
使用者在母專案下創建子專案
  ↓
子專案存儲時間資訊
  ↓
上傳檔案/圖層到子專案
  ↓
母專案自動聚合統計資訊
```

