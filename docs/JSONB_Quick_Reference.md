# JSONB Metadata 快速參考指南

## 標準結構

```json
{
  "data_info": {
    "name": "資料名稱",
    "description": "資料描述", 
    "date": "2024-01-15",
    "source": "資料來源",
    "quality_rating": 4.5
  },
  "spatial_info": {
    "geometry_type": "Point|LineString|Polygon",
    "feature_count": 150,
    "coordinate_system": "WGS84"
  },
  "analysis_info": {
    "type": "potential_analysis|profile_observation|general",
    "intervals": [...],
    "processing_status": "pending|processing|completed|failed"
  },
  "technical_info": {
    "file_hash": "sha256:...",
    "processing_time": "2024-01-15T10:30:00Z",
    "validation_errors": []
  }
}
```

## 常用查詢

```sql
-- 查詢特定描述
WHERE metadata->'data_info'->>'description' ILIKE '%邊坡%'

-- 查詢分析類型
WHERE metadata->'analysis_info'->>'type' = 'potential_analysis'

-- 按日期排序
ORDER BY (metadata->'data_info'->>'date')::date DESC

-- 複合查詢
WHERE project_id = $1 
  AND metadata->'analysis_info'->>'type' = $2
  AND (metadata->'data_info'->>'date')::date >= $3
```

## 程式碼範例

```javascript
// 建立 metadata
const metadata = createMetadata({
  name: formData.name,
  description: formData.description,
  date: formData.date
});

// 更新 metadata
const updated = updateMetadata(existing, {
  data_info: { name: newName }
});

// 提取資料
const dataInfo = extractDataInfo(metadata);
```

## 資料類型

| 類型 | analysis_info.type | 說明 |
|------|-------------------|------|
| 潛勢分析 | `potential_analysis` | 包含 intervals 和 color_scheme |
| 剖面觀測 | `profile_observation` | 線性幾何，通常為 LineString |
| 一般資料 | `general` | 基本資料，無特殊分析需求 |

## 索引

- `idx_data_files_metadata_name` - 名稱查詢
- `idx_data_files_metadata_description` - 描述查詢  
- `idx_data_files_metadata_date` - 日期查詢
- `idx_data_files_metadata_analysis_type` - 分析類型查詢
- `idx_data_files_metadata_data_info` - 複合查詢 (GIN)
- `idx_data_files_metadata_analysis_info` - 分析信息查詢 (GIN)

## 最佳實踐

1. **必填欄位**: `data_info.name`, `data_info.date`, `analysis_info.type`
2. **日期格式**: 使用 `YYYY-MM-DD` 格式
3. **顏色代碼**: 使用十六進制格式 `#ff0000`
4. **向後兼容**: 新欄位設為可選，不破壞現有結構
5. **驗證**: 使用 `validateMetadata()` 檢查結構

## 常見錯誤

❌ **錯誤**: 直接修改 metadata 物件
```javascript
metadata.data_info.name = newName; // 可能不會觸發響應式更新
```

✅ **正確**: 使用輔助函數
```javascript
const updated = updateMetadata(metadata, {
  data_info: { name: newName }
});
```

❌ **錯誤**: 查詢時使用函數
```sql
WHERE LOWER(metadata->'data_info'->>'name') = 'test' -- 無法使用索引
```

✅ **正確**: 使用 ILIKE
```sql
WHERE metadata->'data_info'->>'name' ILIKE '%test%' -- 可以使用索引
```
