-- 監測圖資管理表
-- 取代 hardcode 路徑，讓每個警示區域可以各自設定圖資
-- 支援：InSAR 形變圖、道路線形、SHP 圖資、熱點圖

CREATE TABLE IF NOT EXISTS warning_region_layers (
    layer_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code   VARCHAR(100) NOT NULL,
    layer_type    VARCHAR(50)  NOT NULL,   -- 'insar' | 'road' | 'shapefile' | 'hotspot'
    layer_name    VARCHAR(255) NOT NULL,
    storage_path  TEXT         NOT NULL,   -- 相對路徑，供後端 resolveUploadPath 使用
    display_config JSONB       DEFAULT '{}', -- 前端渲染設定（顏色、圖例、透明度等）
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_layer_type CHECK (
        layer_type IN ('insar', 'road', 'shapefile', 'hotspot')
    )
);

CREATE INDEX IF NOT EXISTS idx_wrl_region_code ON warning_region_layers(region_code);
CREATE INDEX IF NOT EXISTS idx_wrl_layer_type  ON warning_region_layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_wrl_active      ON warning_region_layers(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE  warning_region_layers IS '警示區域監測圖資，取代 hardcode 靜態路徑';
COMMENT ON COLUMN warning_region_layers.storage_path   IS '相對於 backend/ 的路徑，例如 uploads/monitoring/taiwan7/INSAR.geojson';
COMMENT ON COLUMN warning_region_layers.display_config IS 'JSON，前端渲染參數，例如 {"maxValue":1500,"opacity":0.8}';

-- 插入現有的台7線圖資（對應原本 hardcode 的路徑）
INSERT INTO warning_region_layers (region_code, layer_type, layer_name, storage_path, display_config)
VALUES
  ('taiwan7', 'insar', 'ATS-InSAR 地表形變',
   'uploads/monitoring/taiwan7/INSAR.geojson',
   '{"velocityMin":-30,"velocityMax":30}'),
  ('taiwan7', 'road', '台7線道路線形',
   'uploads/monitoring/taiwan7/alertRoad.geojson',
   '{"color":"#e85d04","weight":3}')
ON CONFLICT DO NOTHING;
