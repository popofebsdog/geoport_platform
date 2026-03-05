-- 創建預警地區配置表
-- 用於管理不同地區的預警配置和API設定
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS warning_regions (
    -- 主鍵
    region_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 地區基本資訊
    region_name VARCHAR(255) NOT NULL UNIQUE, -- 地區名稱（如：台7線示範區、台8線示範區）
    region_code VARCHAR(100) NOT NULL UNIQUE, -- 地區代碼（如：taiwan7、taiwan8）
    description TEXT, -- 地區描述
    
    -- 地理位置資訊
    location_geometry GEOMETRY(POINT, 4326), -- 地區中心位置
    zoom_level INTEGER DEFAULT 12, -- 地圖縮放層級
    
    -- API配置
    api_config JSONB, -- API配置資訊（端點、認證等）
    
    -- 狀態管理
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, maintenance
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_warning_regions_name_length CHECK (LENGTH(region_name) >= 2),
    CONSTRAINT chk_warning_regions_code_length CHECK (LENGTH(region_code) >= 2)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_warning_regions_code ON warning_regions(region_code);
CREATE INDEX IF NOT EXISTS idx_warning_regions_status ON warning_regions(status);
CREATE INDEX IF NOT EXISTS idx_warning_regions_active ON warning_regions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_warning_regions_location ON warning_regions USING GIST(location_geometry);
CREATE INDEX IF NOT EXISTS idx_warning_regions_deleted ON warning_regions(deleted_at) WHERE deleted_at IS NULL;

-- 添加註釋
COMMENT ON TABLE warning_regions IS '預警地區配置表，用於管理不同地區的預警系統配置';
COMMENT ON COLUMN warning_regions.region_id IS '地區唯一識別碼';
COMMENT ON COLUMN warning_regions.region_name IS '地區名稱';
COMMENT ON COLUMN warning_regions.region_code IS '地區代碼（用於API和前端識別）';
COMMENT ON COLUMN warning_regions.api_config IS 'API配置資訊（JSON格式）';
COMMENT ON COLUMN warning_regions.location_geometry IS '地區中心位置座標';

