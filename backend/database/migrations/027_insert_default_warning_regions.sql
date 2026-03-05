-- 插入預設的預警地區配置
-- 創建時間: 2025-01-XX

-- 插入台7線示範區
INSERT INTO warning_regions (region_id, region_name, region_code, description, location_geometry, zoom_level, api_config, is_active, status)
VALUES (
    gen_random_uuid(),
    '台7線示範區',
    'taiwan7',
    '北橫大曼崩塌場址',
    ST_SetSRID(ST_MakePoint(121.2681, 24.8186), 4326),
    12,
    '{"endpoints": {}, "auth": {}}'::jsonb,
    TRUE,
    'active'
)
ON CONFLICT (region_code) DO NOTHING;

-- 插入台8線示範區
INSERT INTO warning_regions (region_id, region_name, region_code, description, location_geometry, zoom_level, api_config, is_active, status)
VALUES (
    gen_random_uuid(),
    '台8線示範區',
    'taiwan8',
    '中部橫貫公路，起點台中東勢至終點花蓮太魯閣',
    ST_SetSRID(ST_MakePoint(121.2674, 24.1826), 4326),
    11,
    '{"endpoints": {}, "auth": {}}'::jsonb,
    TRUE,
    'active'
)
ON CONFLICT (region_code) DO NOTHING;

