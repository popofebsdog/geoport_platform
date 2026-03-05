-- 插入台7線復興工務段測試數據
-- 創建時間: 2025-01-XX

-- 檢查是否已存在，如果存在則先刪除（軟刪除）
UPDATE warning_regions 
SET deleted_at = CURRENT_TIMESTAMP 
WHERE region_code = '台7線' AND region_name LIKE '%復興工務段%' AND deleted_at IS NULL;

-- 插入台7線復興工務段測試數據
INSERT INTO warning_regions (
    region_name,
    region_code,
    description,
    location_geometry,
    zoom_level,
    api_config,
    is_active,
    status
) VALUES (
    '台7線復興工務段',
    '台7線',
    '工務段：復興工務段',
    ST_SetSRID(ST_MakePoint(121.289245, 24.884532), 4326),
    16,
    '{
        "microseismic": {
            "endpoint": "",
            "authType": "none",
            "authValue": "",
            "updateInterval": 10
        },
        "earthquake": {
            "endpoint": "",
            "authType": "none",
            "authValue": "",
            "updateInterval": 10
        },
        "rainfall": {
            "endpoint": "",
            "authType": "none",
            "authValue": "",
            "updateInterval": 10
        }
    }'::jsonb,
    TRUE,
    'active'
)
ON CONFLICT (region_code) 
DO UPDATE SET
    region_name = EXCLUDED.region_name,
    description = EXCLUDED.description,
    location_geometry = EXCLUDED.location_geometry,
    zoom_level = EXCLUDED.zoom_level,
    api_config = EXCLUDED.api_config,
    updated_at = CURRENT_TIMESTAMP,
    deleted_at = NULL;

-- 顯示插入結果
SELECT 
    region_id,
    region_name,
    region_code,
    description,
    ST_X(location_geometry) as longitude,
    ST_Y(location_geometry) as latitude,
    is_active,
    status,
    created_at
FROM warning_regions
WHERE region_code = '台7線' AND description LIKE '%復興工務段%' AND deleted_at IS NULL;

