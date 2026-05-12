# 災點刪除功能修復報告

**日期**：2026-03-13  
**修改檔案**：`frontend/src/views/ProjectDetail.vue`  
**問題描述**：在地圖頁面進入刪除模式後，點擊地圖上的災點標記無法執行刪除操作

---

## 一、問題診斷

### 1.1 表面現象
使用者在 `http://localhost:5173/disaster-collection?project=<id>` 頁面，點擊「刪除模式」按鈕後，提示欄顯示「點擊地圖上的紅色驚嘆號標記進行刪除」，但實際點擊標記後，刪除確認對話框無法正常顯示或確認按鈕無反應。

### 1.2 根本原因：Vue 3 命名衝突（`showAlert`）

`ProjectDetail.vue` 中同時存在兩個同名的 `showAlert`：

| 來源 | 類型 | 宣告位置 |
|------|------|----------|
| `setup()` 返回 `useAlert()` 的 `showAlert` | **函數** (Function) | `setup()` → line 1174, 1180 |
| `data()` 定義的 `showAlert: false` | **布林值** (Boolean) | `data()` → line 1416 |

**Vue 3 行為規則**：`setup()` 的返回值優先級高於 `data()`。

因此：
- 模板中 `:show="showAlert"` 綁定到了 **函數引用**（始終為 truthy），導致 `CustomAlert` 對話框狀態異常
- `this.showAlert = true` 無法正確操作布林資料屬性，而是嘗試覆蓋 `setup()` 的函數
- 刪除確認對話框的開關邏輯完全失效

### 1.3 次要問題：`handleAlertConfirm` 邏輯過度依賴 `alertType`

```js
// 修改前（脆弱）
handleAlertConfirm() {
  if (this.alertType === 'warning' && this.deleteDisasterPointPending) {
    this.confirmDeleteDisasterPoint()
  } else {
    this.showAlert = false
  }
}
```

若 `alertType` 因任何原因不等於 `'warning'`（例如前一個 alert 尚未正確重置），即使 `deleteDisasterPointPending` 已設定，刪除也不會執行。

---

## 二、修改內容

### 2.1 重命名 `data()` 中的 `showAlert` → `showLocalAlert`

**目的**：消除與 `setup()` 返回的 `showAlert` 函數之間的命名衝突，讓模板與方法能正確操作布林狀態。

#### 模板（line 525）
```diff
- :show="showAlert"
+ :show="showLocalAlert"
```

#### data() 定義（line 1416）
```diff
- showAlert: false, // 顯示自定義提示框
+ showLocalAlert: false, // 顯示自定義提示框（避免與 setup() 的 showAlert 衝突）
```

#### showCustomAlert 方法
```diff
  showCustomAlert(type, title, message) {
    this.alertType = type
    this.alertTitle = title
    this.alertMessage = message
-   this.showAlert = true
+   this.showLocalAlert = true
  },
```

#### confirmDeleteDisasterPoint 方法
```diff
  this.deleteDisasterPointPending = null
- this.showAlert = false
+ this.showLocalAlert = false
```

#### handleAlertConfirm / handleAlertCancel / handleAlertClose
```diff
  handleAlertConfirm() {
    if (this.deleteDisasterPointPending) {
      this.confirmDeleteDisasterPoint()
    } else {
-     this.showAlert = false
+     this.showLocalAlert = false
    }
  },
  handleAlertCancel() {
    this.deleteDisasterPointPending = null
-   this.showAlert = false
+   this.showLocalAlert = false
  },
  handleAlertClose() {
    this.deleteDisasterPointPending = null
-   this.showAlert = false
+   this.showLocalAlert = false
  },
```

### 2.2 簡化 `handleAlertConfirm` 判斷邏輯

**目的**：不再依賴 `alertType === 'warning'` 作為輔助條件，改以專用旗標 `deleteDisasterPointPending` 為唯一判斷依據，使邏輯更簡潔、更穩健。

```diff
  handleAlertConfirm() {
-   if (this.alertType === 'warning' && this.deleteDisasterPointPending) {
+   if (this.deleteDisasterPointPending) {
      this.confirmDeleteDisasterPoint()
    } else {
      this.showLocalAlert = false
    }
  },
```

### 2.3 新增 console.log 追蹤（除錯輔助）

在 `marker.on('click')` 及 `handleDeleteDisasterPoint`、`handleAlertConfirm` 加入 log，方便未來排查問題：

```js
// marker 點擊時
console.log('[marker click] 災點:', disasterPoint.name, '| 目前模式:', this.disasterPointMode)

// 進入 handleDeleteDisasterPoint
console.log('[handleDeleteDisasterPoint] 災點:', disasterPoint?.name, '|', disasterPoint?.disaster_point_id)
console.log('[handleDeleteDisasterPoint] deleteDisasterPointPending 已設定，顯示確認框')

// 進入 handleAlertConfirm
console.log('[handleAlertConfirm] alertType:', this.alertType, 'deleteDisasterPointPending:', !!this.deleteDisasterPointPending)
```

---

## 三、修改前後流程對比

### 修改前（失效）

```
[點擊刪除模式按鈕]
  ↓
setDisasterPointMode('delete') → disasterPointMode = 'delete'
  ↓
[點擊災點標記]
  ↓
handleDeleteDisasterPoint(disasterPoint)
  ↓
showCustomAlert('warning', ...) → this.showAlert = true
  ↑ 問題：setup() showAlert 是函數，data() showAlert 被衝突
  → 確認對話框無法正確顯示
  ↓
[即使對話框顯示] → handleAlertConfirm()
  ↓
alertType === 'warning'? 可能失敗 → 刪除不執行
```

### 修改後（正常）

```
[點擊刪除模式按鈕]
  ↓
setDisasterPointMode('delete') → disasterPointMode = 'delete'
  ↓
[點擊災點標記]
  ↓
handleDeleteDisasterPoint(disasterPoint)
  ↓
showCustomAlert('warning', ...) → this.showLocalAlert = true ✓
  → CustomAlert 對話框正確顯示
  ↓
[使用者點擊「確定」] → handleAlertConfirm()
  ↓
deleteDisasterPointPending 非 null → confirmDeleteDisasterPoint() ✓
  ↓
disasterPointAPI.delete(disasterPointId) ✓
  ↓
成功：移除標記 + 顯示成功訊息 + 重新載入災點列表
```

---

## 四、相關檔案清單

| 檔案 | 修改類型 | 說明 |
|------|----------|------|
| `frontend/src/views/ProjectDetail.vue` | Bug Fix | 重命名 `showAlert` → `showLocalAlert`，簡化確認邏輯，新增除錯 log |
| `frontend/src/services/api.js` | 先前修改 | 新增 `disasterPointAPI`，`delete` 方法使用 Axios 攔截器確保帶有 JWT token |

---

## 五、測試建議

1. 進入 `http://localhost:5173/disaster-collection?project=<id>`
2. 選擇一個子專案（非母專案），確認地圖上有災點標記
3. 點擊「刪除」模式按鈕，提示欄出現「點擊地圖上的紅色標記進行刪除」
4. 點擊任一紅色數字標記，應出現確認對話框
5. 點擊「確定」，標記應從地圖上消失，並顯示「災點紀錄已刪除」訊息
6. 開啟瀏覽器 DevTools Console，確認無 TypeError 或 401 錯誤

---

*本報告由 AI 助理自動生成*
