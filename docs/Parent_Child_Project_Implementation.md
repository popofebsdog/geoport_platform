# 母子專案系統實施計劃

## 📋 概述

### 目標
將現有的「專案」系統改為「母子專案」架構：
- **母專案**：代表地點（例如：台7線 49.8K）
- **子專案**：代表時間週期（例如：2024年監測、2025年災後調查）

### 設計理念
- 母專案作為地點容器，包含位置、道路資訊
- 子專案包含時間資訊和實際資料（檔案、圖層、報告）
- 使用 `parent_project_id` 實現父子關係
- 向後兼容現有資料（現有專案可以作為獨立專案或轉換為母/子專案）

---

## 🗄️ 資料庫變更

### 1. 新增欄位
```sql
ALTER TABLE projects ADD COLUMN parent_project_id UUID;
ALTER TABLE projects ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN child_count INTEGER DEFAULT 0;
```

### 2. 欄位說明
- `parent_project_id`: 母專案ID（NULL 表示獨立專案或母專案）
- `is_parent`: 是否為母專案（有子專案時自動設為 TRUE）
- `child_count`: 子專案數量（自動計算）

### 3. 執行遷移
```bash
cd /Users/lanyanlin/Desktop/geoport/backend/database
psql -U geoport_user -d geoport -f migrations/016_add_parent_project_support.sql
```

---

## 🎨 前端修改

### 1. 專案列表頁面 (DisasterCollection.vue)

#### A. 顯示模式
- **預設顯示母專案**（地點列表）
- 點擊母專案可展開查看子專案
- 支援「平面模式」查看所有子專案

#### B. 創建專案流程

**原本：**
```
創建專案 → 填寫名稱、描述、地點、道路、時間 → 完成
```

**新流程：**
```
步驟1：創建母專案（地點）
- 名稱：地點名稱（例如：台7線 49.8K 復興區邊坡）
- 描述：地點描述
- 地點座標
- 道路類型、道路編號

步驟2：在母專案下創建子專案（時間）
- 名稱：時間週期名稱（例如：2024年度監測）
- 描述：該時期的描述
- 開始時間、結束時間
```

#### C. UI 調整

##### 專案卡片設計
```vue
<div class="project-card">
  <!-- 母專案卡片 -->
  <div v-if="project.is_parent" class="parent-project">
    <div class="header">
      <h3>{{ project.name }}</h3>
      <span class="badge">母專案 ({{ project.child_count }}個子專案)</span>
    </div>
    <div class="location">
      <icon>📍</icon>
      <span>{{ project.location_name }}</span>
    </div>
    <div class="road-info">
      <span>{{ project.road_number }}</span>
    </div>
    <button @click="toggleChildren">
      {{ showChildren ? '收起' : '展開' }}子專案
    </button>
  </div>
  
  <!-- 子專案卡片（縮排顯示） -->
  <div v-if="showChildren" class="child-projects">
    <div v-for="child in children" class="child-project">
      <icon>📅</icon>
      <h4>{{ child.name }}</h4>
      <span>{{ formatDateRange(child.start_date, child.end_date) }}</span>
      <button @click="openProject(child)">開啟</button>
    </div>
  </div>
</div>
```

### 2. 專案詳情頁面 (ProjectDetail.vue)

#### 麵包屑導航
```vue
<div class="breadcrumb">
  <!-- 如果是子專案，顯示母專案 -->
  <span v-if="project.parent_project_id">
    <a @click="goToParent">{{ parentProject.name }}</a>
    <icon>→</icon>
  </span>
  <span class="current">{{ project.name }}</span>
</div>
```

### 3. 創建專案模態框

#### 新增「專案類型」選擇
```vue
<template>
  <div class="create-project-modal">
    <h2>創建專案</h2>
    
    <!-- 步驟1：選擇專案類型 -->
    <div v-if="step === 1">
      <label>專案類型</label>
      <select v-model="projectType">
        <option value="parent">母專案（新地點）</option>
        <option value="child">子專案（現有地點的新時期）</option>
        <option value="standalone">獨立專案</option>
      </select>
      
      <!-- 如果選擇子專案，顯示母專案選擇 -->
      <div v-if="projectType === 'child'">
        <label>選擇母專案（地點）</label>
        <select v-model="parentProjectId">
          <option v-for="parent in parentProjects" :value="parent.project_id">
            {{ parent.name }} - {{ parent.road_number }}
          </option>
        </select>
      </div>
      
      <button @click="nextStep">下一步</button>
    </div>
    
    <!-- 步驟2：填寫專案資訊 -->
    <div v-if="step === 2">
      <!-- 母專案或獨立專案：需要填寫地點資訊 -->
      <div v-if="projectType === 'parent' || projectType === 'standalone'">
        <input v-model="form.name" placeholder="地點名稱（例如：台7線 49.8K 復興區邊坡）" />
        <textarea v-model="form.description" placeholder="地點描述" />
        <MapLocationPicker v-model="form.location" />
        <select v-model="form.roadType">...</select>
        <input v-model="form.roadNumber" placeholder="道路編號" />
      </div>
      
      <!-- 子專案：只需要時間資訊 -->
      <div v-if="projectType === 'child'">
        <input v-model="form.name" placeholder="時期名稱（例如：2024年度監測）" />
        <textarea v-model="form.description" placeholder="該時期的描述" />
        <DatePicker v-model="form.startDate" label="開始時間" />
        <DatePicker v-model="form.endDate" label="結束時間" />
      </div>
      
      <!-- 獨立專案：需要地點和時間 -->
      <div v-if="projectType === 'standalone'">
        <DatePicker v-model="form.startDate" label="開始時間" />
        <DatePicker v-model="form.endDate" label="結束時間" />
      </div>
      
      <button @click="submit">創建專案</button>
    </div>
  </div>
</template>
```

---

## 🔧 後端 API 修改

### 1. 專案 Controller (projectController.js)

#### A. 獲取專案列表
```javascript
// 新增 query 參數
export const getAllProjects = async (req, res) => {
  const { mode = 'parent' } = req.query; // 'parent' | 'flat' | 'all'
  
  let query;
  if (mode === 'parent') {
    // 只返回母專案和獨立專案
    query = `
      SELECT * FROM projects 
      WHERE (parent_project_id IS NULL) 
        AND deleted_at IS NULL 
      ORDER BY created_at DESC
    `;
  } else if (mode === 'flat') {
    // 返回所有子專案（不包含母專案）
    query = `
      SELECT * FROM projects 
      WHERE (parent_project_id IS NOT NULL) 
        AND deleted_at IS NULL 
      ORDER BY created_at DESC
    `;
  } else {
    // 返回所有專案
    query = `
      SELECT * FROM projects 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
    `;
  }
  
  // ...
};
```

#### B. 獲取子專案列表
```javascript
export const getChildProjects = async (req, res) => {
  const { parentId } = req.params;
  
  const result = await pool.query(`
    SELECT * FROM projects 
    WHERE parent_project_id = $1 
      AND deleted_at IS NULL 
    ORDER BY start_date DESC
  `, [parentId]);
  
  res.json({
    success: true,
    data: result.rows
  });
};
```

#### C. 創建專案
```javascript
export const createProject = async (req, res) => {
  const { 
    name, 
    description, 
    parent_project_id, // 新增
    // ...其他欄位
  } = req.body;
  
  // 如果是子專案，驗證母專案存在
  if (parent_project_id) {
    const parentResult = await pool.query(`
      SELECT * FROM projects WHERE project_id = $1 AND deleted_at IS NULL
    `, [parent_project_id]);
    
    if (parentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '母專案不存在'
      });
    }
  }
  
  // 插入專案
  const result = await pool.query(`
    INSERT INTO projects (
      name, description, parent_project_id, 
      location_geometry, road_type, road_number,
      start_date, end_date, ...
    ) VALUES ($1, $2, $3, ...)
    RETURNING *
  `, [name, description, parent_project_id, ...]);
  
  res.json({
    success: true,
    data: result.rows[0]
  });
};
```

### 2. 新增 API 路由

```javascript
// routes/projects.js

// 獲取母專案列表
router.get('/projects/parents', getParentProjects);

// 獲取特定母專案的子專案
router.get('/projects/:parentId/children', getChildProjects);

// 創建子專案
router.post('/projects/:parentId/children', createChildProject);
```

---

## 📱 使用者體驗

### 1. 專案列表頁面

#### 視圖模式切換
```
[母專案視圖] [平面視圖] [全部視圖]
```

#### 母專案視圖（預設）
```
📍 台7線 49.8K 復興區邊坡  [母專案 3個子專案]
   📅 2024年度監測 (2024/01-2024/12)  [開啟]
   📅 2025年災後調查 (2025/03-2025/06)  [開啟]
   📅 2025年復建追蹤 (2025/07-2025/12)  [開啟]

📍 台9線 125K 蘇澳段邊坡  [母專案 2個子專案]
   📅 2024年定期檢查 (2024/06-2024/08)  [開啟]
   📅 2025年補強工程 (2025/02-2025/05)  [開啟]
```

### 2. 創建流程

#### 情境 A：新地點
```
1. 點擊「創建專案」
2. 選擇「母專案（新地點）」
3. 填寫地點資訊（名稱、座標、道路）
4. 創建成功 → 提示「是否要立即創建第一個子專案（時期）？」
```

#### 情境 B：現有地點新增時期
```
1. 在母專案卡片點擊「新增時期」
2. 填寫時期名稱和時間範圍
3. 創建子專案
4. 自動進入子專案詳情頁面
```

---

## ⚠️ 注意事項

### 1. 資料遷移
- 現有專案預設為「獨立專案」（`parent_project_id = NULL`, `is_parent = FALSE`）
- 可手動將相關專案轉換為母子結構

### 2. 權限控制
- 子專案繼承母專案的權限設定
- 刪除母專案會連帶刪除所有子專案（CASCADE）

### 3. 資料關聯
- 所有資料檔案、圖層、報告關聯到**子專案**
- 母專案的統計資訊從子專案聚合而來

---

## 🚀 實施步驟

### Phase 1: 資料庫 ✅
1. [x] 創建遷移腳本
2. [ ] 執行資料庫遷移
3. [ ] 驗證觸發器和視圖

### Phase 2: 後端 API
1. [ ] 修改專案 Controller
2. [ ] 添加新的 API 路由
3. [ ] 測試 API

### Phase 3: 前端 UI
1. [ ] 修改專案列表組件
2. [ ] 修改創建專案流程
3. [ ] 添加母子專案切換視圖
4. [ ] 修改專案詳情頁面

### Phase 4: 測試
1. [ ] 創建母專案
2. [ ] 創建子專案
3. [ ] 上傳資料到子專案
4. [ ] 驗證統計資訊
5. [ ] 測試刪除行為

---

## 📊 資料範例

### 母專案（地點）
```json
{
  "project_id": "uuid-1",
  "name": "台7線 49.8K 復興區邊坡",
  "description": "復興區大漢溪沿線邊坡監測",
  "parent_project_id": null,
  "is_parent": true,
  "child_count": 3,
  "location_geometry": { "type": "Point", "coordinates": [121.408, 24.675] },
  "road_type": "national",
  "road_number": "台7線",
  "road_section": "49.8K"
}
```

### 子專案（時間）
```json
{
  "project_id": "uuid-2",
  "name": "2024年度監測",
  "description": "2024年定期監測作業",
  "parent_project_id": "uuid-1",
  "is_parent": false,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "file_count": 25,
  "total_size": 1500000000,
  "layer_count": 8
}
```

---

## 🎯 優勢

1. **組織性更好**：同一地點的不同時期資料集中管理
2. **導航更清晰**：地點 → 時期的層級結構
3. **統計更準確**：母專案可聚合所有時期的統計資訊
4. **靈活性**：仍支援獨立專案（不需要母子結構的情況）
5. **擴展性**：未來可支援更多層級（如：母專案 → 子專案 → 子子專案）

