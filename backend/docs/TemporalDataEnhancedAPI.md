# 增強版時序資料 API 文檔

## 概述

增強版時序資料 API 提供完整的 CSV 時序資料管理功能，包括上傳、解析、圖表生成和資料管理。使用 ApexCharts 提供美觀的圖表視覺化。

## 功能特色

### 核心功能
1. **CSV 檔案上傳**：支援 CSV 檔案上傳並記錄座標資訊
2. **智能解析**：自動解析 CSV 結構並提取可用欄位
3. **軸線配置**：靈活的 X/Y 軸配置，支援多軸合併
4. **圖表生成**：使用 ApexCharts 生成美觀的互動式圖表
5. **空間定位**：記錄座標資訊，支援地圖定位
6. **完整管理**：提供增刪改查的完整資料管理功能

### 技術特色
- **ApexCharts 整合**：提供美觀的圖表視覺化
- **ISO8601 時間格式**：標準化的時間格式處理
- **多軸合併**：智能合併多個 X 軸欄位（如日期+時間）
- **響應式設計**：支援深色/淺色主題切換
- **實時更新**：圖表配置可即時調整

## API 端點

### 1. 時序資料管理

#### 上傳時序資料
```http
POST /api/temporal-data-enhanced/:projectId/upload
Content-Type: multipart/form-data
```

**請求參數：**
- `file`: CSV 檔案（必需）
- `name`: 時序資料名稱（必需）
- `description`: 描述（可選）
- `longitude`: 經度（必需）
- `latitude`: 緯度（必需）
- `xAxisColumns`: X 軸欄位陣列（必需）
- `yAxisColumns`: Y 軸欄位陣列（必需）
- `timeFormat`: 時間格式（可選，預設 'auto'）

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "fileId": "uuid",
    "name": "氣象觀測資料",
    "description": "每日氣象觀測資料",
    "coordinates": {
      "longitude": 121.5654,
      "latitude": 25.0330
    },
    "availableColumns": ["日期", "時間", "溫度", "濕度", "壓力"],
    "xAxisColumns": ["日期", "時間"],
    "yAxisColumns": ["溫度", "濕度"],
    "timeFormat": "auto",
    "processingStatus": "completed"
  }
}
```

#### 獲取時序資料列表
```http
GET /api/temporal-data-enhanced/:projectId/list
```

**回應範例：**
```json
{
  "success": true,
  "data": [
    {
      "temporal_id": "uuid",
      "project_id": "uuid",
      "name": "氣象觀測資料",
      "description": "每日氣象觀測資料",
      "data_type": "csv",
      "longitude": 121.5654,
      "latitude": 25.0330,
      "spatial_extent": "POINT(121.5654 25.0330)",
      "total_records": 1000,
      "x_axis_columns": ["日期", "時間"],
      "y_axis_columns": ["溫度", "濕度"],
      "time_format": "auto",
      "processing_status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 獲取時序資料詳情
```http
GET /api/temporal-data-enhanced/:temporalId
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporal_id": "uuid",
    "project_id": "uuid",
    "name": "氣象觀測資料",
    "description": "每日氣象觀測資料",
    "data_type": "csv",
    "longitude": 121.5654,
    "latitude": 25.0330,
    "spatial_extent": "POINT(121.5654 25.0330)",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-31T23:59:59Z",
    "total_records": 1000,
    "x_axis_columns": ["日期", "時間"],
    "y_axis_columns": ["溫度", "濕度"],
    "time_format": "auto",
    "chart_config": {
      "datasets": [...]
    },
    "available_columns": ["日期", "時間", "溫度", "濕度", "壓力"],
    "processing_status": "completed",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 更新時序資料
```http
PUT /api/temporal-data-enhanced/:temporalId
Content-Type: application/json
```

**請求參數：**
```json
{
  "name": "更新後的資料名稱",
  "description": "更新後的描述",
  "xAxisColumns": ["日期", "時間"],
  "yAxisColumns": ["溫度", "濕度", "壓力"],
  "timeFormat": "auto"
}
```

#### 刪除時序資料
```http
DELETE /api/temporal-data-enhanced/:temporalId
```

**回應範例：**
```json
{
  "success": true,
  "message": "時序資料已刪除"
}
```

### 2. 圖表生成

#### 解析並生成圖表資料
```http
POST /api/temporal-data-enhanced/:temporalId/parse
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "temporalName": "氣象觀測資料",
    "coordinates": {
      "longitude": 121.5654,
      "latitude": 25.0330
    },
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
        }
      ]
    },
    "metadata": {
      "totalRecords": 1000,
      "xAxisColumns": ["日期", "時間"],
      "yAxisColumns": ["溫度", "濕度"],
      "timeFormat": "auto",
      "generatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### 生成 ApexCharts 配置
```http
POST /api/temporal-data/:temporalId/chart/apex
Content-Type: application/json
```

**請求參數：**
```json
{
  "chartType": "line",
  "title": "氣象資料趨勢圖",
  "xAxisLabel": "時間",
  "yAxisLabel": "數值",
  "showLegend": true,
  "showGrid": true,
  "theme": "light"
}
```

**回應範例：**
```json
{
  "success": true,
  "data": {
    "temporalId": "uuid",
    "apexConfig": {
      "chart": {
        "type": "line",
        "height": 400,
        "background": "#ffffff",
        "toolbar": {
          "show": true,
          "tools": {
            "download": true,
            "selection": true,
            "zoom": true,
            "zoomin": true,
            "zoomout": true,
            "pan": true,
            "reset": true
          }
        },
        "animations": {
          "enabled": true,
          "easing": "easeinout",
          "speed": 800
        }
      },
      "series": [
        {
          "name": "溫度",
          "data": [
            {"x": "2024-01-01T10:00:00", "y": 25.5},
            {"x": "2024-01-01T11:00:00", "y": 26.2}
          ],
          "type": "line"
        }
      ],
      "xaxis": {
        "type": "datetime",
        "title": {
          "text": "時間",
          "style": {
            "fontSize": "14px",
            "fontWeight": "bold",
            "color": "#374151"
          }
        },
        "labels": {
          "style": {
            "colors": "#374151"
          },
          "datetimeFormatter": {
            "year": "yyyy",
            "month": "MMM yyyy",
            "day": "dd MMM",
            "hour": "HH:mm"
          }
        }
      },
      "yaxis": {
        "title": {
          "text": "數值",
          "style": {
            "fontSize": "14px",
            "fontWeight": "bold",
            "color": "#374151"
          }
        }
      },
      "title": {
        "text": "氣象資料趨勢圖",
        "align": "left",
        "style": {
          "fontSize": "18px",
          "fontWeight": "bold",
          "color": "#111827"
        }
      },
      "legend": {
        "show": true,
        "position": "top",
        "horizontalAlign": "center"
      },
      "tooltip": {
        "enabled": true,
        "shared": true,
        "intersect": false,
        "x": {
          "format": "dd MMM yyyy HH:mm"
        }
      },
      "stroke": {
        "curve": "smooth",
        "width": 2
      },
      "fill": {
        "type": "gradient",
        "gradient": {
          "shade": "light",
          "type": "vertical",
          "shadeIntensity": 0.25,
          "gradientToColors": undefined,
          "inverseColors": true,
          "opacityFrom": 0.6,
          "opacityTo": 0.1,
          "stops": [0, 100]
        }
      },
      "colors": [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
        "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
      ]
    },
    "metadata": {
      "chartType": "line",
      "datasetsCount": 2,
      "generatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 前端組件

### 1. TemporalDataManager
主要的時序資料管理組件，整合所有功能。

**使用方式：**
```vue
<TemporalDataManager
  :project-id="projectId"
  @locate="handleLocate"
/>
```

### 2. TemporalDataLayerCard
時序資料圖層卡片，顯示基本資訊和操作按鈕。

**功能：**
- 顯示時序資料基本資訊
- 提供定位、圖表、編輯、刪除按鈕
- 支援深色/淺色主題

### 3. TemporalDataChartModal
圖表模態框，使用 ApexCharts 顯示互動式圖表。

**功能：**
- 動態載入 ApexCharts
- 支援圖表配置調整
- 響應式設計
- 深色/淺色主題支援

### 4. TemporalDataUploadModal
時序資料上傳模態框（現有組件，已更新）。

**功能：**
- CSV 檔案上傳
- 座標輸入
- 軸線配置
- 資料預覽

## 工作流程

### 1. 上傳時序資料
1. 選擇 CSV 檔案
2. 輸入座標資訊
3. 配置 X/Y 軸欄位
4. 上傳並解析資料
5. 生成圖表配置

### 2. 查看和管理
1. 在時序資料列表中查看所有資料
2. 點擊定位按鈕在地圖上定位
3. 點擊圖表按鈕查看詳細圖表
4. 編輯或刪除不需要的資料

### 3. 圖表互動
1. 在圖表模態框中查看圖表
2. 調整圖表標題和軸標籤
3. 切換圖例和網格顯示
4. 使用 ApexCharts 的互動功能

## 資料庫結構

### temporal_data_enhanced 表
```sql
CREATE TABLE temporal_data_enhanced (
    temporal_id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(project_id),
    source_file_id UUID REFERENCES data_files(file_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type temporal_data_type_enum DEFAULT 'csv',
    longitude DECIMAL(10, 7) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    spatial_extent GEOMETRY(POINT, 4326),
    x_axis_columns TEXT[] NOT NULL,
    y_axis_columns TEXT[] NOT NULL,
    time_format VARCHAR(50) DEFAULT 'auto',
    chart_config JSONB,
    apex_config JSONB,
    available_columns TEXT[],
    processing_status VARCHAR(20) DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

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
- `400`：參數錯誤或檔案格式不支援
- `404`：找不到指定的時序資料
- `500`：伺服器內部錯誤或檔案處理失敗

## 效能考量

- **檔案大小限制**：CSV 檔案最大 100MB
- **並發處理**：支援多個檔案同時上傳
- **快取機制**：圖表配置快取提升效能
- **索引優化**：資料庫索引優化查詢效能
- **記憶體管理**：流式處理避免記憶體溢出
