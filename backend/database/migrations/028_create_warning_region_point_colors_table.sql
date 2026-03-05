-- 創建預警地區點位顏色配置表
-- 用於儲存每個點位的顏色配置（紅、黃、綠）
-- 創建時間: 2025-11-07

CREATE TABLE IF NOT EXISTS warning_region_point_colors (
    -- 主鍵
    point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯地區
    region_id UUID NOT NULL REFERENCES warning_regions(region_id) ON DELETE CASCADE,
    
    -- 點位識別資訊
    road_section VARCHAR(100) NOT NULL, -- 路線名稱（如：台7線）
    mileage VARCHAR(50), -- 里程數（如：000K+000）
    longitude NUMERIC(10, 7) NOT NULL, -- 經度
    latitude NUMERIC(10, 7) NOT NULL, -- 緯度
    
           -- 顏色配置
           point_color VARCHAR(20) DEFAULT 'green', -- 點位顏色：red, yellow, green（預設為綠色）
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- 軟刪除
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_warning_region_point_colors_region ON warning_region_point_colors(region_id);
CREATE INDEX IF NOT EXISTS idx_warning_region_point_colors_road ON warning_region_point_colors(road_section);
CREATE INDEX IF NOT EXISTS idx_warning_region_point_colors_color ON warning_region_point_colors(point_color);
CREATE INDEX IF NOT EXISTS idx_warning_region_point_colors_deleted ON warning_region_point_colors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warning_region_point_colors_location ON warning_region_point_colors(longitude, latitude);

-- 創建部分唯一索引：同一地區、同一座標只能有一個未刪除的顏色配置
CREATE UNIQUE INDEX IF NOT EXISTS idx_warning_region_point_colors_unique 
    ON warning_region_point_colors(region_id, longitude, latitude) 
    WHERE deleted_at IS NULL;

-- 添加註釋
COMMENT ON TABLE warning_region_point_colors IS '預警地區點位顏色配置表，用於儲存每個點位的顏色配置';
COMMENT ON COLUMN warning_region_point_colors.point_id IS '點位顏色配置唯一識別碼';
COMMENT ON COLUMN warning_region_point_colors.region_id IS '所屬地區ID';
COMMENT ON COLUMN warning_region_point_colors.road_section IS '路線名稱';
COMMENT ON COLUMN warning_region_point_colors.mileage IS '里程數';
COMMENT ON COLUMN warning_region_point_colors.point_color IS '點位顏色（red, yellow, green）';

