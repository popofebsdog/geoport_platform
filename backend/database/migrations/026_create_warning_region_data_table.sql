-- 創建預警地區數據表
-- 用於儲存各地區的API介接數據
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS warning_region_data (
    -- 主鍵
    data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯地區
    region_id UUID NOT NULL REFERENCES warning_regions(region_id) ON DELETE CASCADE,
    
    -- 數據類型
    data_type VARCHAR(100) NOT NULL, -- 數據類型（如：chart1, chart2, chart3, rainfall, earthquake等）
    data_category VARCHAR(100), -- 數據分類
    
    -- 數據內容
    data_content JSONB NOT NULL, -- 實際數據內容（JSON格式）
    data_metadata JSONB, -- 數據元數據（時間戳、來源等）
    
    -- 時間資訊
    data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- 數據時間戳
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 收集時間
    
    -- 狀態管理
    is_valid BOOLEAN DEFAULT TRUE, -- 數據是否有效
    status VARCHAR(20) DEFAULT 'active', -- active, archived, error
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_warning_region_data_type_length CHECK (LENGTH(data_type) >= 1)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_warning_region_data_region ON warning_region_data(region_id);
CREATE INDEX IF NOT EXISTS idx_warning_region_data_type ON warning_region_data(data_type);
CREATE INDEX IF NOT EXISTS idx_warning_region_data_timestamp ON warning_region_data(data_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_warning_region_data_category ON warning_region_data(data_category);
CREATE INDEX IF NOT EXISTS idx_warning_region_data_status ON warning_region_data(status);
CREATE INDEX IF NOT EXISTS idx_warning_region_data_valid ON warning_region_data(is_valid) WHERE is_valid = TRUE;
CREATE INDEX IF NOT EXISTS idx_warning_region_data_deleted ON warning_region_data(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warning_region_data_region_type ON warning_region_data(region_id, data_type);

-- 添加註釋
COMMENT ON TABLE warning_region_data IS '預警地區數據表，用於儲存各地區的API介接數據';
COMMENT ON COLUMN warning_region_data.data_id IS '數據唯一識別碼';
COMMENT ON COLUMN warning_region_data.region_id IS '所屬地區ID';
COMMENT ON COLUMN warning_region_data.data_type IS '數據類型（chart1, chart2, chart3等）';
COMMENT ON COLUMN warning_region_data.data_content IS '實際數據內容（JSON格式）';
COMMENT ON COLUMN warning_region_data.data_timestamp IS '數據時間戳';

