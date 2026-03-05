-- 創建預警地區告警燈號位置表
-- 用於儲存告警燈號的設置位置
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS warning_region_alert_lights (
    -- 主鍵
    light_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯地區
    region_id UUID NOT NULL REFERENCES warning_regions(region_id) ON DELETE CASCADE,
    region_code VARCHAR(100) NOT NULL, -- 地區代碼（用於快速查詢）
    
    -- 點位識別資訊
    road_section VARCHAR(100) NOT NULL, -- 路線名稱（如：台7線）
    mileage VARCHAR(50), -- 里程數（如：000K+000）
    
    -- 告警燈號位置（在里程點上方）
    longitude NUMERIC(10, 7) NOT NULL, -- 經度（里程點的經度）
    latitude NUMERIC(10, 7) NOT NULL, -- 緯度（里程點的緯度）
    
    -- 告警燈號狀態
    current_level VARCHAR(20) DEFAULT 'green', -- 當前燈號等級：red, yellow, green
    is_red_light_on BOOLEAN DEFAULT FALSE, -- 紅燈是否開啟
    show_special_alert BOOLEAN DEFAULT FALSE, -- 是否顯示特殊告警
    special_alert_countdown INTEGER DEFAULT 0, -- 特殊告警倒計時
    
    -- 額外資訊
    metadata JSONB, -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- 軟刪除
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_warning_region_alert_lights_region ON warning_region_alert_lights(region_id);
CREATE INDEX IF NOT EXISTS idx_warning_region_alert_lights_region_code ON warning_region_alert_lights(region_code);
CREATE INDEX IF NOT EXISTS idx_warning_region_alert_lights_road ON warning_region_alert_lights(road_section);
CREATE INDEX IF NOT EXISTS idx_warning_region_alert_lights_location ON warning_region_alert_lights(longitude, latitude);
CREATE INDEX IF NOT EXISTS idx_warning_region_alert_lights_deleted ON warning_region_alert_lights(deleted_at) WHERE deleted_at IS NULL;

-- 創建部分唯一索引：同一地區、同一座標只能有一個未刪除的告警燈號
CREATE UNIQUE INDEX IF NOT EXISTS idx_warning_region_alert_lights_unique 
    ON warning_region_alert_lights(region_code, longitude, latitude) 
    WHERE deleted_at IS NULL;

-- 添加註釋
COMMENT ON TABLE warning_region_alert_lights IS '預警地區告警燈號位置表，用於儲存告警燈號的設置位置';
COMMENT ON COLUMN warning_region_alert_lights.light_id IS '告警燈號唯一識別碼';
COMMENT ON COLUMN warning_region_alert_lights.region_id IS '所屬地區ID';
COMMENT ON COLUMN warning_region_alert_lights.region_code IS '地區代碼（用於快速查詢）';
COMMENT ON COLUMN warning_region_alert_lights.road_section IS '路線名稱';
COMMENT ON COLUMN warning_region_alert_lights.mileage IS '里程數';
COMMENT ON COLUMN warning_region_alert_lights.current_level IS '當前燈號等級（red, yellow, green）';
COMMENT ON COLUMN warning_region_alert_lights.longitude IS '經度（里程點的經度）';
COMMENT ON COLUMN warning_region_alert_lights.latitude IS '緯度（里程點的緯度）';

