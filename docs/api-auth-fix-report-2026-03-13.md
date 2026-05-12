# API 認證修復報告

**日期**：2026-03-13  
**問題類型**：401 Unauthorized / 400 Bad Request / ReferenceError  
**影響範圍**：預警系統、巡查記錄、時序資料、地區管理、災點功能

---

## 一、問題總覽

本次修復涉及四類錯誤，根本原因皆源自前端元件未正確使用帶有 JWT 認證攔截器的 Axios 實例：

| 錯誤類型 | 原因 | 影響功能 |
|---------|------|---------|
| `401 Unauthorized` | 使用裸 `axios` 發送請求，未帶 Bearer Token | 保存巡查記錄、刪除地區、建立專案等 |
| `ReferenceError: axios is not defined` | 替換 import 時遺漏 GET 請求仍使用 `axios` | 載入地區列表、巡查記錄、圖表資料 |
| `400 Bad Request` | 傳入非 UUID 格式的假 `projectId` 至後端 | 預警地圖載入子專案 |
| `showAlert` 命名衝突 | `setup()` 與 `data()` 同名，Vue 3 優先級問題 | 災點刪除確認框無法運作 |

---

## 二、修改明細

### 2.1 災點刪除功能（`ProjectDetail.vue`）

**問題**：`setup()` 返回 `showAlert`（函數），`data()` 也定義 `showAlert: false`（布林），Vue 3 中 `setup()` 優先，導致確認對話框的開關邏輯失效；`handleAlertConfirm` 也過度依賴 `alertType === 'warning'` 判斷。

**修改內容**：
- 將 `data()` 中的 `showAlert` 重命名為 `showLocalAlert`，消除命名衝突
- 模板 `:show="showAlert"` → `:show="showLocalAlert"`
- `showCustomAlert()` 中的 `this.showAlert = true` → `this.showLocalAlert = true`
- `confirmDeleteDisasterPoint`、`handleAlertConfirm`、`handleAlertCancel`、`handleAlertClose` 中的所有 `this.showAlert = false` → `this.showLocalAlert = false`
- `handleAlertConfirm` 移除 `alertType === 'warning'` 判斷，改以 `deleteDisasterPointPending` 為唯一依據
- 新增 marker click / handleDeleteDisasterPoint / handleAlertConfirm 的 `console.log` 追蹤

---

### 2.2 裸 axios 替換為認證 api 實例

**根本原因**：前端 `src/services/api.js` 導出的 `api` 實例有請求攔截器，會自動從 `localStorage` 讀取 `authToken` 並加入 `Authorization: Bearer <token>` header。直接使用 `import axios from 'axios'` 的裸實例不帶 token，所有需認證的後端路由均返回 401。

**修改規則**：
1. `import axios from 'axios'` → `import api from '@/services/api'`
2. `axios.get/post/put/delete('/api/...')` → `api.get/post/put/delete('/...')` （移除 `/api` 前綴，`api.js` 的 `baseURL` 已是 `/api`）
3. `response.data.success` → `response.success`（`api.js` 攔截器已直接返回 `response.data`）
4. `response.data.data` → `response.data`
5. `response.data.message` → `response.message`
6. `.catch(() => ({ data: { success: false } }))` → `.catch(() => ({ success: false, data: null }))`

#### 修改檔案清單

| 檔案 | 修改的 API 呼叫 | 錯誤類型 |
|------|----------------|---------|
| `components/warning/RoutineInspectionModal.vue` | POST 新增、PUT 編輯巡查記錄 | 401 |
| `components/warning/SpecialInspectionModal.vue` | POST 新增、PUT 編輯特別巡查 | 401 |
| `components/warning/InspectionRecordsView.vue` | GET 載入記錄、DELETE 刪除記錄 | 401 / ReferenceError |
| `components/warning/CreateRegionProject.vue` | POST 建立地區專案、PUT 更新地區專案 | 401 |
| `components/warning/RegionSelector.vue` | GET 載入地區列表、DELETE 刪除地區 | 401 / ReferenceError |
| `components/warning/ChartDataPanel.vue` | GET 載入圖表資料（Promise.all 並行請求） | ReferenceError |
| `components/temporal/TemporalDataChartModal.vue` | POST 產生 ApexCharts 配置 | 401 |
| `components/temporal/TemporalDataManager.vue` | GET 載入時序資料列表、DELETE 刪除時序資料 | 401 / ReferenceError |

---

### 2.3 `ProjectMap.vue` — 假 projectId 觸發 400

**問題**：`EarlyWarning.vue` 建立了一個模擬母專案物件供地圖顯示用，其 `projectId` 為字串 `'early-warning-parent'`（非 UUID）。`ProjectMap.vue` 的 `loadChildProjects()` 拿到此 ID 後直接呼叫後端 `GET /api/parent-projects/early-warning-parent/children`，後端 `validateUUID()` 驗證失敗，回傳 400。

```js
// EarlyWarning.vue（問題來源）
mockParentProject: {
  projectId: 'early-warning-parent',  // 非真實 UUID
  is_parent: true,
  ...
}
```

**修改**：在 `ProjectMap.vue` 的 `loadChildProjects()` 加入 UUID 正規表達式驗證，非 UUID 格式直接跳過 API 呼叫：

```js
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(projectId)) {
  console.log('跳過載入子專案：projectId 非 UUID 格式（模擬專案）', projectId)
  return
}
```

---

## 三、修改前後對比

### 認證問題（以 RoutineInspectionModal.vue 為例）

```diff
- import axios from 'axios'
+ import api from '@/services/api'

- response = await axios.post(`/api/warning-regions/${this.regionCode}/inspection-records`, payload)
+ response = await api.post(`/warning-regions/${this.regionCode}/inspection-records`, payload)

- if (response.data.success) {
-   this.$emit('success', response.data.data)
+ if (response.success) {
+   this.$emit('success', response.data)
```

### 命名衝突（ProjectDetail.vue）

```diff
  // data()
- showAlert: false,
+ showLocalAlert: false,

  // template
- <CustomAlert :show="showAlert" ...>
+ <CustomAlert :show="showLocalAlert" ...>

  // showCustomAlert 方法
- this.showAlert = true
+ this.showLocalAlert = true

  // handleAlertConfirm
- if (this.alertType === 'warning' && this.deleteDisasterPointPending) {
+ if (this.deleteDisasterPointPending) {
```

### 400 問題（ProjectMap.vue）

```diff
+ const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
+ if (!uuidRegex.test(projectId)) {
+   console.log('跳過載入子專案：非 UUID 格式', projectId)
+   return
+ }
  const response = await this.$api.get(`/parent-projects/${projectId}/children`)
```

---

## 四、受影響功能驗證清單

| 功能 | 操作 | 預期結果 |
|------|------|---------|
| 災點刪除 | 刪除模式 → 點擊標記 → 確認 | 標記消失，顯示成功訊息 |
| 例行巡查記錄 | 新增 / 編輯巡查記錄 | 保存成功無 401 |
| 特別巡查記錄 | 新增 / 編輯特別巡查 | 保存成功無 401 |
| 巡查記錄刪除 | 點擊刪除記錄 | 刪除成功無 401 |
| 預警地區列表 | 進入預警頁面 | 地區列表正確載入，無 ReferenceError |
| 預警地區刪除 | 刪除監測地區 | 刪除成功無 401 |
| 建立/更新地區專案 | 表單提交 | 成功無 401 |
| 圖表資料載入 | 查看預警圖表 | 圖表正常顯示，無 ReferenceError |
| 時序資料管理 | 載入 / 刪除時序資料 | 正常運作無 401 |
| 圖表配置產生 | 開啟時序圖表 Modal | 圖表正確渲染 |
| 預警地圖子專案 | 進入預警地圖頁面 | 無 400 錯誤 |

---

## 五、根本問題建議

目前多個元件各自引入 `axios`，日後新增功能容易重蹈覆轍。建議：

1. **禁止裸 axios 引入**：在 ESLint 規則中加入 `no-restricted-imports`，禁止 `import axios from 'axios'`，強制使用 `@/services/api`
2. **統一 API 模組**：為各業務域建立專屬 API 模組（如已有的 `disasterPointAPI`、`dataFileAPI`），避免散落在各元件內的 URL 字串

---

*本報告由 AI 助理自動生成*
