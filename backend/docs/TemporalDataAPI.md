# 時序資料解析與圖表生成 API 文檔

## 概述

本 API 提供時序資料的解析、處理和圖表生成功能，支援 CSV 檔案的 X/Y 軸配置和自動圖表生成。

## 功能特色

### 資料解析功能
1. **多 X 軸合併**：選擇多個 X 軸欄位時自動合併（如日期+時間）
2. **單 X 軸輸出**：選擇單一 X 軸時直接輸出
3. **ISO8601 格式轉換**：自動將時間格式轉換為 `YYYY-MM-DDTHH:mm:ss` 格式
4. **多 Y 軸支援**：選擇多個 Y 軸時分別輸出，每個 Y 軸生成獨立的資料集
5. **圖表友好格式**：輸出適合作圖的 JSON 格式

### 圖表生成功能
1. **自動軸區間調整**：根據資料值域自動調整 X/Y 軸範圍
2. **折線圖生成**：使用 Chart.js 生成高品質折線圖
3. **多種輸出格式**：支援 PNG 圖片、JSON 配置、檔案保存
4. **互動式圖表**：支援工具提示、圖例、縮放等功能

## API 端點

### 1. 資料解析 API

#### 獲取可用欄位
```http
GET /api/temporal-data/:temporalId/columns
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "columns": ["日期", "時間", "溫度", "濕度", "壓力"],
    "totalColumns": 5
  }
}
```

#### 解析 CSV 並生成圖表資料
```http
POST /api/temporal-data/:temporalId/parse
```

**請求參數：**
```json
{
  "xAxisColumns": ["日期", "時間"],
  "yAxisColumns": ["溫度", "濕度"],
  "timeFormat": "auto"
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "temporalName": "氣象資料",
    "chartData": {
      "datasets": [
        {
          "label": "溫度",
          "data": [
            {"x": "2024-01-01T10:00:00", "y": 25.5},
            {"x": "2024-01-01T11:00:00", "y": 26.2}
          ],
          "borderColor": "rgba(54, 162, 235, 1)",
          "backgroundColor": "rgba(54, 162, 235, 0.1)",
          "borderWidth": 2,
          "fill": false,
          "tension": 0.1
        },
        {
          "label": "濕度",
          "data": [
            {"x": "2024-01-01T10:00:00", "y": 65.2},
            {"x": "2024-01-01T11:00:00", "y": 63.8}
          ],
          "borderColor": "rgba(255, 99, 132, 1)",
          "backgroundColor": "rgba(255, 99, 132, 0.1)",
          "borderWidth": 2,
          "fill": false,
          "tension": 0.1
        }
      ]
    },
    "metadata": {
      "totalRecords": 100,
      "xAxisColumns": ["日期", "時間"],
      "yAxisColumns": ["溫度", "濕度"],
      "timeFormat": "auto",
      "generatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 2. 圖表生成 API

#### 生成圖表圖片
```http
POST /api/temporal-data/:temporalId/chart/image
```

**請求參數：**
```json
{
  "chartType": "line",
  "title": "氣象資料趨勢圖",
  "xAxisLabel": "時間",
  "yAxisLabel": "數值",
  "width": 800,
  "height": 600,
  "backgroundColor": "white",
  "showLegend": true,
  "showGrid": true
}
```

**回應：** 直接返回 PNG 圖片

#### 生成圖表配置 JSON
```http
POST /api/temporal-data/:temporalId/chart/config
```

**請求參數：**
```json
{
  "chartType": "line",
  "title": "氣象資料趨勢圖",
  "xAxisLabel": "時間",
  "yAxisLabel": "數值",
  "showLegend": true,
  "showGrid": true
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "chartConfig": {
      "type": "line",
      "data": {
        "datasets": [...]
      },
      "options": {
        "responsive": true,
        "plugins": {
          "title": {
            "display": true,
            "text": "氣象資料趨勢圖"
          },
          "legend": {
            "display": true,
            "position": "top"
          }
        },
        "scales": {
          "x": {
            "type": "time",
            "title": {
              "display": true,
              "text": "時間"
            },
            "min": "2024-01-01T00:00:00",
            "max": "2024-01-02T00:00:00"
          },
          "y": {
            "title": {
              "display": true,
              "text": "數值"
            },
            "min": 20,
            "max": 30
          }
        }
      }
    },
    "metadata": {
      "chartType": "line",
      "datasetsCount": 2,
      "generatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 保存圖表圖片
```http
POST /api/temporal-data/:temporalId/chart/save
```

**請求參數：**
```json
{
  "chartType": "line",
  "title": "氣象資料趨勢圖",
  "filename": "weather-chart.png",
  "width": 800,
  "height": 600
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "filename": "weather-chart.png",
    "filePath": "/uploads/charts/weather-chart.png",
    "fileSize": 45678,
    "chartType": "line",
    "dimensions": {"width": 800, "height": 600},
    "savedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 獲取圖表預覽資訊
```http
GET /api/temporal-data/:temporalId/chart/preview
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "name": "氣象資料",
    "description": "每日氣象觀測資料",
    "hasChartConfig": true,
    "datasetsCount": 2,
    "totalRecords": 100,
    "dataRange": {
      "x": {
        "min": "2024-01-01T00:00:00",
        "max": "2024-01-02T00:00:00",
        "isTime": true
      },
      "y": {
        "min": 20,
        "max": 30
      }
    },
    "xAxisColumns": ["日期", "時間"],
    "yAxisColumns": ["溫度", "濕度"],
    "createdAt": "2024-01-15T09:00:00Z"
  }
}
```

## 使用流程

### 1. 資料解析流程
1. 上傳 CSV 檔案到時序資料
2. 調用 `/columns` API 獲取可用欄位
3. 選擇 X 軸和 Y 軸欄位
4. 調用 `/parse` API 解析資料並生成圖表資料

### 2. 圖表生成流程
1. 確保時序資料已有圖表配置
2. 調用圖表生成 API（圖片、配置或保存）
3. 在前端使用返回的資料或配置

## 技術規格

### 支援的檔案格式
- **CSV**：逗號分隔值檔案
- **時間格式**：自動識別多種日期時間格式
- **數值格式**：自動轉換為數值類型

### 圖表庫
- **Chart.js**：主要圖表生成庫
- **chartjs-node-canvas**：服務端圖表渲染
- **chartjs-adapter-date-fns**：時間軸支援

### 輸出格式
- **PNG 圖片**：高解析度圖表圖片
- **JSON 配置**：Chart.js 配置對象
- **ISO8601 時間**：標準時間格式

## 錯誤處理

所有 API 都包含完整的錯誤處理：

```json
{
  "success": false,
  "message": "錯誤描述",
  "error": "詳細錯誤訊息"
}
```

常見錯誤：
- `400`：參數錯誤
- `404`：找不到資源
- `500`：伺服器內部錯誤

## 效能考量

- 大檔案處理：支援大型 CSV 檔案解析
- 記憶體管理：流式處理避免記憶體溢出
- 快取機制：圖表配置快取提升效能
- 並發處理：支援多個請求同時處理
