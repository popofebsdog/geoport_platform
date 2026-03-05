-- 創建增強版時序資料表
-- 專門用於 CSV 時序資料管理，包含座標和圖表配置
-- 創建時間: 2025-01-15

-- 首先添加時序資料檔案類型到枚舉
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'temporal_csv_enhanced';

-- 添加 csv 到現有的時序資料類型枚舉
ALTER TYPE temporal_data_type_enum ADD VALUE IF NOT EXISTS 'csv';

-- 創建時序資料表
CREATE TABLE IF NOT EXISTS temporal_data_enhanced (
    -- 主鍵
    temporal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到專案
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 關聯到來源檔案
    source_file_id UUID REFERENCES data_files(file_id) ON DELETE SET NULL,
    
    -- 基本資訊
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type temporal_data_type_enum NOT NULL DEFAULT 'csv',
    
    -- 座標資訊
    longitude DECIMAL(10, 7) NOT NULL,  -- 經度
    latitude DECIMAL(10, 7) NOT NULL,   -- 緯度
    spatial_extent GEOMETRY(POINT, 4326), -- 空間點
    
    -- 時間範圍
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- 資料格式和結構
    data_format VARCHAR(20) NOT NULL DEFAULT 'csv',
    total_records INTEGER DEFAULT 0,
    
    -- 軸線配置
    x_axis_columns TEXT[] NOT NULL,     -- X 軸欄位陣列
    y_axis_columns TEXT[] NOT NULL,     -- Y 軸欄位陣列
    time_format VARCHAR(50) DEFAULT 'auto', -- 時間格式
    
    -- 圖表配置
    chart_config JSONB,                 -- 圖表配置（ApexCharts 格式）
    apex_config JSONB,                  -- ApexCharts 配置
    
    -- 資料結構定義
    data_schema JSONB,                  -- 資料結構定義
    available_columns TEXT[],           -- 可用欄位列表
    
    -- 處理狀態
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_progress INTEGER DEFAULT 0, -- 處理進度 (0-100)
    error_message TEXT,                 -- 錯誤訊息
    
    -- 統計資訊
    min_value DECIMAL(15,6),            -- 最小值
    max_value DECIMAL(15,6),            -- 最大值
    avg_value DECIMAL(15,6),            -- 平均值
    
    -- 權限控制
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private', -- private, team, public
    
    -- 標記和分類
    tags TEXT[],                        -- 標籤陣列
    category VARCHAR(100),              -- 分類
    
    -- 元數據
    metadata JSONB,                     -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_temporal_data_enhanced_name_length CHECK (LENGTH(name) >= 1),
    CONSTRAINT chk_temporal_data_enhanced_longitude CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT chk_temporal_data_enhanced_latitude CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT chk_temporal_data_enhanced_total_records CHECK (total_records >= 0),
    CONSTRAINT chk_temporal_data_enhanced_processing_progress CHECK (processing_progress >= 0 AND processing_progress <= 100),
    CONSTRAINT chk_temporal_data_enhanced_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_temporal_data_enhanced_access_level CHECK (access_level IN ('private', 'team', 'public')),
    CONSTRAINT chk_temporal_data_enhanced_data_format CHECK (data_format = 'csv'),
    CONSTRAINT chk_temporal_data_enhanced_x_axis_columns CHECK (array_length(x_axis_columns, 1) > 0),
    CONSTRAINT chk_temporal_data_enhanced_y_axis_columns CHECK (array_length(y_axis_columns, 1) > 0)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_project_id ON temporal_data_enhanced(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_source_file_id ON temporal_data_enhanced(source_file_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_name ON temporal_data_enhanced USING gin(to_tsvector('chinese', name));
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_data_type ON temporal_data_enhanced(data_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_spatial_extent ON temporal_data_enhanced USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_processing_status ON temporal_data_enhanced(processing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_tags ON temporal_data_enhanced USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_metadata ON temporal_data_enhanced USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_chart_config ON temporal_data_enhanced USING gin(chart_config) WHERE chart_config IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_apex_config ON temporal_data_enhanced USING gin(apex_config) WHERE apex_config IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_enhanced_created_at ON temporal_data_enhanced(created_at DESC) WHERE deleted_at IS NULL;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_temporal_data_enhanced_updated_at
    BEFORE UPDATE ON temporal_data_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：更新專案統計
CREATE OR REPLACE FUNCTION update_project_temporal_enhanced_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        -- 新增時序資料時更新統計
        UPDATE projects 
        SET 
            temporal_data_count = COALESCE(temporal_data_count, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = NEW.project_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新時序資料時更新統計
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            -- 軟刪除時序資料
            UPDATE projects 
            SET 
                temporal_data_count = COALESCE(temporal_data_count, 0) - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = OLD.project_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            -- 恢復時序資料
            UPDATE projects 
            SET 
                temporal_data_count = COALESCE(temporal_data_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = NEW.project_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
        -- 硬刪除時序資料時更新統計
        UPDATE projects 
        SET 
            temporal_data_count = COALESCE(temporal_data_count, 0) - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = OLD.project_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_temporal_data_enhanced_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON temporal_data_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_project_temporal_enhanced_stats();

-- 創建視圖：活躍時序資料
CREATE OR REPLACE VIEW active_temporal_data_enhanced AS
SELECT 
    tde.temporal_id,
    tde.project_id,
    p.name as project_name,
    tde.source_file_id,
    df.file_name as source_file_name,
    df.original_name as original_file_name,
    tde.name,
    tde.description,
    tde.data_type,
    tde.longitude,
    tde.latitude,
    tde.spatial_extent,
    tde.start_time,
    tde.end_time,
    tde.data_format,
    tde.total_records,
    tde.x_axis_columns,
    tde.y_axis_columns,
    tde.time_format,
    tde.chart_config,
    tde.apex_config,
    tde.data_schema,
    tde.available_columns,
    tde.processing_status,
    tde.processing_progress,
    tde.min_value,
    tde.max_value,
    tde.avg_value,
    tde.is_public,
    tde.access_level,
    tde.tags,
    tde.category,
    tde.metadata,
    tde.created_at,
    tde.updated_at
FROM temporal_data_enhanced tde
JOIN projects p ON tde.project_id = p.project_id
LEFT JOIN data_files df ON tde.source_file_id = df.file_id
WHERE tde.deleted_at IS NULL AND p.deleted_at IS NULL;

-- 創建視圖：時序資料統計
CREATE OR REPLACE VIEW temporal_data_enhanced_statistics AS
SELECT 
    project_id,
    COUNT(*) as total_temporal_data,
    COUNT(*) FILTER (WHERE data_format = 'csv') as csv_count,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
    SUM(total_records) as total_records,
    AVG(processing_progress) as avg_processing_progress,
    COUNT(*) FILTER (WHERE apex_config IS NOT NULL) as charts_generated
FROM temporal_data_enhanced 
WHERE deleted_at IS NULL
GROUP BY project_id;

-- 添加註釋
COMMENT ON TABLE temporal_data_enhanced IS '增強版時序資料表，專門用於 CSV 時序資料管理';
COMMENT ON COLUMN temporal_data_enhanced.temporal_id IS '時序資料唯一識別碼';
COMMENT ON COLUMN temporal_data_enhanced.project_id IS '所屬專案ID';
COMMENT ON COLUMN temporal_data_enhanced.source_file_id IS '來源檔案ID';
COMMENT ON COLUMN temporal_data_enhanced.name IS '時序資料名稱';
COMMENT ON COLUMN temporal_data_enhanced.description IS '時序資料描述';
COMMENT ON COLUMN temporal_data_enhanced.data_type IS '資料類型（csv）';
COMMENT ON COLUMN temporal_data_enhanced.longitude IS '經度';
COMMENT ON COLUMN temporal_data_enhanced.latitude IS '緯度';
COMMENT ON COLUMN temporal_data_enhanced.spatial_extent IS '空間點';
COMMENT ON COLUMN temporal_data_enhanced.start_time IS '開始時間';
COMMENT ON COLUMN temporal_data_enhanced.end_time IS '結束時間';
COMMENT ON COLUMN temporal_data_enhanced.data_format IS '資料格式（csv）';
COMMENT ON COLUMN temporal_data_enhanced.total_records IS '總記錄數';
COMMENT ON COLUMN temporal_data_enhanced.x_axis_columns IS 'X軸欄位陣列';
COMMENT ON COLUMN temporal_data_enhanced.y_axis_columns IS 'Y軸欄位陣列';
COMMENT ON COLUMN temporal_data_enhanced.time_format IS '時間格式';
COMMENT ON COLUMN temporal_data_enhanced.chart_config IS '圖表配置（JSON）';
COMMENT ON COLUMN temporal_data_enhanced.apex_config IS 'ApexCharts 配置（JSON）';
COMMENT ON COLUMN temporal_data_enhanced.data_schema IS '資料結構定義（JSON）';
COMMENT ON COLUMN temporal_data_enhanced.available_columns IS '可用欄位列表';
COMMENT ON COLUMN temporal_data_enhanced.processing_status IS '處理狀態';
COMMENT ON COLUMN temporal_data_enhanced.processing_progress IS '處理進度 (0-100)';
COMMENT ON COLUMN temporal_data_enhanced.metadata IS '額外的元數據（JSON）';
COMMENT ON COLUMN temporal_data_enhanced.deleted_at IS '軟刪除時間戳記';

COMMENT ON TYPE temporal_data_type_enum IS '時序資料類型枚舉';
COMMENT ON VIEW active_temporal_data_enhanced IS '活躍時序資料視圖（排除已刪除）';
COMMENT ON VIEW temporal_data_enhanced_statistics IS '時序資料統計資訊視圖';
