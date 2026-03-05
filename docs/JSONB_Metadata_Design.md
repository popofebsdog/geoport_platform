# JSONB Metadata 設計文檔

## 概述

本文檔描述了 GeoPort 系統中 `data_files` 表 `metadata` JSONB 欄位的設計規範、使用方法和最佳實踐。

## 設計理念

### 為什麼使用 JSONB？

1. **資料多樣性**：不同類型的資料（潛勢分析、剖面觀測、一般資料）有不同的屬性需求
2. **靈活性**：可以輕鬆添加新的屬性而不需要修改資料庫結構
3. **查詢能力**：PostgreSQL 的 JSONB 支援高效的查詢和索引
4. **擴展性**：未來可以輕鬆添加新的資料類型

### 設計原則

- **標準化結構**：所有 metadata 都遵循統一的結構
- **分類清晰**：將不同性質的資訊分組存儲
- **向後兼容**：新版本不會破壞現有資料
- **查詢優化**：為常用查詢建立適當的索引

## 標準化結構

### 完整結構範例

```json
{
  "data_info": {
    "name": "邊坡監測數據",
    "description": "2024年邊坡位移監測數據",
    "date": "2024-01-15",
    "source": "field_survey",
    "quality_rating": 4.5,
    "tags": ["landslide", "monitoring", "displacement"]
  },
  "spatial_info": {
    "geometry_type": "Point",
    "feature_count": 150,
    "coordinate_system": "WGS84",
    "bounds": {
      "min_x": 121.5,
      "min_y": 25.0,
      "max_x": 121.6,
      "max_y": 25.1
    },
    "spatial_resolution": "1m"
  },
  "analysis_info": {
    "type": "potential_analysis",
    "intervals": [
      {
        "min": 0,
        "max": 0.3,
        "color": "#00ff00",
        "label": "低風險",
        "description": "風險值在 0-0.3 之間"
      },
      {
        "min": 0.3,
        "max": 0.6,
        "color": "#ffff00",
        "label": "中風險",
        "description": "風險值在 0.3-0.6 之間"
      },
      {
        "min": 0.6,
        "max": 1.0,
        "color": "#ff0000",
        "label": "高風險",
        "description": "風險值在 0.6-1.0 之間"
      }
    ],
    "color_scheme": "blue-red",
    "processing_status": "completed",
    "analysis_method": "machine_learning",
    "confidence_level": 0.85
  },
  "technical_info": {
    "file_hash": "sha256:abc123def456...",
    "processing_time": "2024-01-15T10:30:00Z",
    "validation_errors": [],
    "file_size_bytes": 1048576,
    "compression_type": "gzip",
    "encoding": "utf-8"
  }
}
```

## 各區塊詳細說明

### 1. data_info（資料基本信息）

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `name` | string | ✅ | 資料名稱 | "邊坡監測數據" |
| `description` | string | ✅ | 資料描述 | "2024年邊坡位移監測數據" |
| `date` | string | ✅ | 資料日期 (YYYY-MM-DD) | "2024-01-15" |
| `source` | string | ❌ | 資料來源 | "field_survey", "drone_survey", "satellite" |
| `quality_rating` | number | ❌ | 品質評分 (1-5) | 4.5 |
| `tags` | array | ❌ | 標籤陣列 | ["landslide", "monitoring"] |

### 2. spatial_info（空間信息）

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `geometry_type` | string | ❌ | 幾何類型 | "Point", "LineString", "Polygon" |
| `feature_count` | number | ❌ | 特徵數量 | 150 |
| `coordinate_system` | string | ❌ | 座標系統 | "WGS84", "TWD97" |
| `bounds` | object | ❌ | 空間範圍 | `{"min_x": 121.5, "min_y": 25.0, "max_x": 121.6, "max_y": 25.1}` |
| `spatial_resolution` | string | ❌ | 空間解析度 | "1m", "10m", "30m" |

### 3. analysis_info（分析信息）

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `type` | string | ✅ | 分析類型 | "potential_analysis", "profile_observation", "general" |
| `intervals` | array | ❌ | 分析間隔 | 見下方 intervals 結構 |
| `color_scheme` | string | ❌ | 顏色方案 | "blue-red", "green-yellow-red", "default" |
| `processing_status` | string | ❌ | 處理狀態 | "pending", "processing", "completed", "failed" |
| `analysis_method` | string | ❌ | 分析方法 | "machine_learning", "statistical", "manual" |
| `confidence_level` | number | ❌ | 信心度 (0-1) | 0.85 |

#### intervals 結構

```json
{
  "min": 0,
  "max": 0.3,
  "color": "#00ff00",
  "label": "低風險",
  "description": "風險值在 0-0.3 之間"
}
```

### 4. technical_info（技術信息）

| 欄位 | 類型 | 必填 | 說明 | 範例 |
|------|------|------|------|------|
| `file_hash` | string | ❌ | 檔案雜湊值 | "sha256:abc123..." |
| `processing_time` | string | ❌ | 處理時間 (ISO 8601) | "2024-01-15T10:30:00Z" |
| `validation_errors` | array | ❌ | 驗證錯誤列表 | [] |
| `file_size_bytes` | number | ❌ | 檔案大小（位元組） | 1048576 |
| `compression_type` | string | ❌ | 壓縮類型 | "gzip", "zip", "none" |
| `encoding` | string | ❌ | 編碼格式 | "utf-8", "big5" |

## 資料類型規範

### 潛勢分析 (potential_analysis)

```json
{
  "data_info": {
    "name": "邊坡潛勢分析",
    "description": "基於機器學習的邊坡潛勢分析結果",
    "date": "2024-01-15",
    "source": "machine_learning",
    "quality_rating": 4.8,
    "tags": ["landslide", "potential", "ml"]
  },
  "spatial_info": {
    "geometry_type": "Polygon",
    "feature_count": 150,
    "coordinate_system": "WGS84",
    "spatial_resolution": "10m"
  },
  "analysis_info": {
    "type": "potential_analysis",
    "intervals": [
      {
        "min": 0,
        "max": 0.3,
        "color": "#00ff00",
        "label": "低風險",
        "description": "風險值在 0-0.3 之間"
      },
      {
        "min": 0.3,
        "max": 0.6,
        "color": "#ffff00",
        "label": "中風險",
        "description": "風險值在 0.3-0.6 之間"
      },
      {
        "min": 0.6,
        "max": 1.0,
        "color": "#ff0000",
        "label": "高風險",
        "description": "風險值在 0.6-1.0 之間"
      }
    ],
    "color_scheme": "green-yellow-red",
    "processing_status": "completed",
    "analysis_method": "machine_learning",
    "confidence_level": 0.85
  },
  "technical_info": {
    "file_hash": "sha256:abc123...",
    "processing_time": "2024-01-15T10:30:00Z",
    "validation_errors": [],
    "file_size_bytes": 2097152
  }
}
```

### 剖面觀測 (profile_observation)

```json
{
  "data_info": {
    "name": "邊坡剖面觀測",
    "description": "無人機拍攝的邊坡剖面觀測資料",
    "date": "2024-01-15",
    "source": "drone_survey",
    "quality_rating": 4.5,
    "tags": ["profile", "drone", "observation"]
  },
  "spatial_info": {
    "geometry_type": "LineString",
    "feature_count": 25,
    "coordinate_system": "WGS84",
    "spatial_resolution": "1m"
  },
  "analysis_info": {
    "type": "profile_observation",
    "intervals": [],
    "color_scheme": "default",
    "processing_status": "pending",
    "analysis_method": "manual"
  },
  "technical_info": {
    "file_hash": "sha256:def456...",
    "processing_time": null,
    "validation_errors": [],
    "file_size_bytes": 5242880
  }
}
```

### 一般資料 (general)

```json
{
  "data_info": {
    "name": "氣象監測資料",
    "description": "降雨量與溫度監測資料",
    "date": "2024-01-15",
    "source": "weather_station",
    "quality_rating": 4.2,
    "tags": ["weather", "rainfall", "temperature"]
  },
  "spatial_info": {
    "geometry_type": "Point",
    "feature_count": 1,
    "coordinate_system": "WGS84"
  },
  "analysis_info": {
    "type": "general",
    "intervals": [],
    "color_scheme": "default",
    "processing_status": "completed"
  },
  "technical_info": {
    "file_hash": "sha256:ghi789...",
    "processing_time": "2024-01-15T09:15:00Z",
    "validation_errors": [],
    "file_size_bytes": 1024
  }
}
```

## 資料庫索引

### 已建立的索引

```sql
-- 基本查詢索引
CREATE INDEX idx_data_files_metadata_name 
ON data_files USING btree((metadata->'data_info'->>'name'));

CREATE INDEX idx_data_files_metadata_description 
ON data_files USING btree((metadata->'data_info'->>'description'));

CREATE INDEX idx_data_files_metadata_date 
ON data_files USING btree((metadata->'data_info'->>'date'));

CREATE INDEX idx_data_files_metadata_analysis_type 
ON data_files USING btree((metadata->'analysis_info'->>'type'));

-- 複合索引
CREATE INDEX idx_data_files_metadata_data_info 
ON data_files USING gin((metadata->'data_info'));

CREATE INDEX idx_data_files_metadata_analysis_info 
ON data_files USING gin((metadata->'analysis_info'));

-- 專案相關索引
CREATE INDEX idx_data_files_project_analysis_type 
ON data_files (project_id, (metadata->'analysis_info'->>'type'));

CREATE INDEX idx_data_files_project_date 
ON data_files (project_id, (metadata->'data_info'->>'date'));

-- 部分索引（只對未刪除的記錄）
CREATE INDEX idx_data_files_active_metadata_name 
ON data_files USING btree((metadata->'data_info'->>'name')) 
WHERE deleted_at IS NULL;
```

## 查詢範例

### 基本查詢

```sql
-- 查詢特定描述的資料
SELECT * FROM data_files 
WHERE metadata->'data_info'->>'description' ILIKE '%邊坡%'
AND deleted_at IS NULL;

-- 查詢特定類型的分析資料
SELECT * FROM data_files 
WHERE metadata->'analysis_info'->>'type' = 'potential_analysis'
AND deleted_at IS NULL;

-- 按日期排序
SELECT * FROM data_files 
ORDER BY (metadata->'data_info'->>'date')::date DESC;
```

### 複合查詢

```sql
-- 查詢特定專案的潛勢分析資料
SELECT 
  file_id,
  file_name,
  metadata->'data_info'->>'name' as data_name,
  metadata->'data_info'->>'description' as description,
  metadata->'data_info'->>'date' as data_date,
  metadata->'analysis_info'->>'confidence_level' as confidence
FROM data_files 
WHERE project_id = $1
  AND metadata->'analysis_info'->>'type' = 'potential_analysis'
  AND (metadata->'data_info'->>'date')::date >= $2
  AND (metadata->'data_info'->>'date')::date <= $3
  AND deleted_at IS NULL
ORDER BY (metadata->'data_info'->>'date')::date DESC;
```

### 統計查詢

```sql
-- 按分析類型統計
SELECT 
  metadata->'analysis_info'->>'type' as analysis_type,
  COUNT(*) as count
FROM data_files 
WHERE deleted_at IS NULL
GROUP BY metadata->'analysis_info'->>'type'
ORDER BY count DESC;

-- 按日期統計
SELECT 
  DATE((metadata->'data_info'->>'date')::timestamp) as date,
  COUNT(*) as count
FROM data_files 
WHERE deleted_at IS NULL
  AND metadata->'data_info'->>'date' IS NOT NULL
GROUP BY DATE((metadata->'data_info'->>'date')::timestamp)
ORDER BY date DESC;
```

## 程式碼使用範例

### 後端使用

```javascript
import { createMetadata, updateMetadata, extractDataInfo } from '../utils/metadataHelper.js';

// 建立新資料的 metadata
const metadata = createMetadata(
  {
    name: '邊坡監測數據',
    description: '2024年邊坡位移監測數據',
    date: '2024-01-15',
    source: 'field_survey',
    quality_rating: 4.5
  },
  {
    geometry_type: 'Point',
    feature_count: 150,
    coordinate_system: 'WGS84'
  },
  {
    type: 'potential_analysis',
    intervals: [...],
    processing_status: 'completed'
  },
  {
    file_hash: 'sha256:abc123...',
    processing_time: new Date().toISOString()
  }
);

// 更新現有 metadata
const updatedMetadata = updateMetadata(existingMetadata, {
  data_info: {
    name: newName,
    description: newDescription
  }
});

// 提取資料信息
const dataInfo = extractDataInfo(metadata);
```

### 前端使用

```javascript
// 建立新資料
const createNewData = (formData) => {
  const metadata = createPotentialAnalysisMetadata({
    name: formData.name,
    description: formData.description,
    date: formData.date
  });
  
  return {
    file_name: formData.name,
    metadata: JSON.stringify(metadata)
  };
};

// 更新資料
const updateExistingData = (existingMetadata, formData) => {
  const updatedMetadata = updateDataMetadata(existingMetadata, {
    name: formData.name,
    description: formData.description,
    date: formData.date
  });
  
  return JSON.stringify(updatedMetadata);
};

// 提取顯示資料
const extractDisplayData = (metadata) => {
  const dataInfo = extractDataInfo(metadata);
  return {
    name: dataInfo.name,
    description: dataInfo.description,
    date: dataInfo.date,
    source: dataInfo.source,
    qualityRating: dataInfo.quality_rating
  };
};
```

## 最佳實踐

### 1. 資料驗證

```javascript
// 驗證 metadata 結構
const validateMetadata = (metadata) => {
  const errors = [];
  
  if (!metadata.data_info?.name) {
    errors.push('data_info.name 是必填的');
  }
  
  if (!metadata.data_info?.date) {
    errors.push('data_info.date 是必填的');
  }
  
  if (metadata.analysis_info?.type) {
    const validTypes = ['potential_analysis', 'profile_observation', 'general'];
    if (!validTypes.includes(metadata.analysis_info.type)) {
      errors.push(`無效的分析類型: ${metadata.analysis_info.type}`);
    }
  }
  
  return errors;
};
```

### 2. 向後兼容

```javascript
// 處理舊版本的 metadata
const migrateOldMetadata = (oldMetadata) => {
  // 如果沒有 data_info，從根層級遷移
  if (!oldMetadata.data_info && oldMetadata.data_name) {
    return {
      data_info: {
        name: oldMetadata.data_name,
        description: oldMetadata.data_description,
        date: oldMetadata.data_date
      },
      ...oldMetadata
    };
  }
  
  return oldMetadata;
};
```

### 3. 錯誤處理

```javascript
// 安全的 metadata 存取
const getMetadataValue = (metadata, path, defaultValue = null) => {
  try {
    const keys = path.split('.');
    let value = metadata;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  } catch (error) {
    console.error('Metadata 存取錯誤:', error);
    return defaultValue;
  }
};
```

## 遷移指南

### 從舊結構遷移

如果現有的 metadata 使用不同的結構，可以使用以下遷移腳本：

```sql
-- 遷移腳本範例
UPDATE data_files 
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      metadata,
      '{data_info}',
      jsonb_build_object(
        'name', COALESCE(metadata->>'data_name', ''),
        'description', COALESCE(metadata->>'data_description', ''),
        'date', COALESCE(metadata->>'data_date', '')
      )
    ),
    '{analysis_info}',
    jsonb_build_object(
      'type', COALESCE(metadata->>'analysis_type', 'general')
    )
  ),
  '{technical_info}',
  jsonb_build_object(
    'processing_time', COALESCE(metadata->>'processing_time', null)
  )
)
WHERE metadata ? 'data_name' OR metadata ? 'data_description';
```

## 效能優化

### 1. 查詢優化

- 使用已建立的索引
- 避免在 WHERE 子句中使用函數
- 使用部分索引減少索引大小

### 2. 儲存優化

- 定期清理無用的 metadata 欄位
- 使用適當的資料類型
- 避免過度嵌套

### 3. 快取策略

```javascript
// 快取常用的 metadata 查詢結果
const cache = new Map();

const getCachedMetadata = (fileId) => {
  if (cache.has(fileId)) {
    return cache.get(fileId);
  }
  
  const metadata = fetchMetadataFromDB(fileId);
  cache.set(fileId, metadata);
  return metadata;
};
```

## 故障排除

### 常見問題

1. **查詢效能慢**
   - 檢查是否使用了適當的索引
   - 避免在 WHERE 子句中使用函數

2. **JSONB 結構不一致**
   - 使用驗證函數檢查結構
   - 實施資料遷移腳本

3. **記憶體使用過高**
   - 檢查 JSONB 欄位大小
   - 考慮分割大型 metadata

### 除錯工具

```sql
-- 檢查 metadata 結構
SELECT 
  file_id,
  jsonb_pretty(metadata) as formatted_metadata
FROM data_files 
WHERE file_id = 'your-file-id';

-- 檢查索引使用情況
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM data_files 
WHERE metadata->'data_info'->>'name' ILIKE '%邊坡%';
```

## 版本歷史

- **v1.0** (2024-01-15): 初始設計，建立標準化結構
- **v1.1** (2024-01-15): 添加索引優化和查詢範例
- **v1.2** (2024-01-15): 添加最佳實踐和故障排除指南

## 相關檔案

- `backend/src/utils/metadataHelper.js` - 輔助函數
- `backend/src/examples/metadataUsage.js` - 使用範例
- `backend/database/migrations/012_optimize_metadata_indexes.sql` - 索引優化
- `backend/src/controllers/dataController.js` - 控制器實作

---

**注意**: 本文檔會隨著系統發展持續更新，請定期檢查最新版本。
