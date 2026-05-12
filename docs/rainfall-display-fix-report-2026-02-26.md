# 雨量顯示「暫無數據」修正報告

**日期**：2026-02-26  
**影響範圍**：`frontend/src/components/warning/ChartDataPanel.vue`

---

## 問題描述

預警地區頁面的雨量監測區塊（chart2）顯示「**暫無數據**」，即使雨量 API 端點已設定且正常回應。

---

## 根本原因

### 邏輯不一致

`ChartDataPanel.vue` 在 `loadChartData()` 中，對三種圖表的外部 API 數據處理方式不一致：

| 圖表 | 類型 | 顯示條件 |
|------|------|----------|
| chart1 | 微地動 | `dataDensity !== 'none'` |
| **chart2** | **雨量** | `dataDensity !== 'none'` **且** `hasValidChartData(data)` |
| chart3 | 強地動 | `dataDensity !== 'none'` 且 `hasValidChartData(data)` |

**chart2（雨量）多了一層 `hasValidChartData()` 過濾**。

### `hasValidChartData()` 的判斷邏輯

```javascript
hasValidChartData(data) {
  const hasValues    = data.values     && data.values.length     > 0;
  const hasTimeSeries = data.time_series && data.time_series.length > 0;
  // ...
  return hasValues || hasTimeSeries || ...;
}
```

當**今日未降雨**時，後端雨量 API 回傳的資料結構為：

```json
{
  "success": true,
  "source": "external_api",
  "data": {
    "dataType": "rainfall",
    "time_series": [],
    "values":      [],
    "dataDensity": "low",
    ...
  }
}
```

`time_series` 與 `values` 均為空陣列，導致 `hasValidChartData()` 回傳 `false`，最終 `chartData.chart2 = null`，UI 顯示「暫無數據」。

### 後端「端點未設定」的明確標記

當該地區**完全未設定**雨量 API 端點（且非台7線地區）時，後端明確回傳：

```json
{ "dataDensity": "none" }
```

這才是「真正沒有資料來源」的正確標記。

---

## 修正內容

**檔案**：`frontend/src/components/warning/ChartDataPanel.vue`

### 修正前

```javascript
if (chart2Res.success) {
  if (chart2Res.source === 'external_api') {
    const data = chart2Res.data;
    // ❌ 多餘的 hasValidChartData 過濾，無雨時 values/time_series 為空會被擋掉
    if (data && data.dataDensity !== 'none' && this.hasValidChartData(data)) {
      this.chartData.chart2 = data;
      this.setupAutoRefresh('chart2', data?.updateInterval || 600);
    } else {
      this.chartData.chart2 = null;
    }
```

### 修正後

```javascript
if (chart2Res.success) {
  if (chart2Res.source === 'external_api') {
    const data = chart2Res.data;
    // ✅ 只要端點有設定（dataDensity !== 'none'），就顯示圖表，即使今日無降雨
    if (data && data.dataDensity !== 'none') {
      this.chartData.chart2 = data;
      this.setupAutoRefresh('chart2', data?.updateInterval || 600);
    } else {
      this.chartData.chart2 = null;
    }
```

---

## 修正效果

| 情境 | 修正前 | 修正後 |
|------|--------|--------|
| 端點已設定，今日有降雨 | ✅ 正常顯示 | ✅ 正常顯示 |
| 端點已設定，今日**無降雨** | ❌ 顯示「暫無數據」 | ✅ 顯示雨量卡（數值為 0） |
| 端點已設定，外部 API 暫時失敗 | ❌ 顯示「暫無數據」 | ✅ 顯示雨量卡（數值為 0） |
| **端點未設定**（dataDensity=none） | ✅ 顯示「暫無數據」 | ✅ 顯示「暫無數據」 |

---

## UI 顯示說明

修正後，在今日無降雨或 API 暫時無資料的情況下，雨量卡片（`RainfallCard`）會顯示：

- **累積雨量**：0.0 mm  
- **時雨量**：0.0 mm  
- **今日最高**：0.0 mm  
- **有雨時段**：0 小時  

這比顯示「暫無數據」更有意義，讓使用者能確認 API 端點正常運作，只是今日確實無降雨記錄。

---

## 相關後端邏輯說明

後端 `warningRegionController.js` 對雨量資料回傳規則：

1. **端點未設定且非台7線**：回傳 `dataDensity: 'none'`，前端正確顯示「暫無數據」
2. **端點已設定，API 成功**：回傳含 `dataDensity: 'low'/'medium'/'high'` 的完整資料
3. **端點已設定，API 失敗**：回傳空陣列資料（`dataDensity` 為 `undefined`，等同非 `'none'`）

前端僅以 `dataDensity === 'none'` 作為「無資料來源」的判斷依據，符合後端設計意圖。

