-- 創建 temporal_data 表
-- 專門用於時序資料管理，支援 GeoJSON、CSV 和 Shapefile 格式
-- 創建時間: 2025-01-15

-- 首先添加時序資料檔案類型到枚舉
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'temporal_geojson';
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'temporal_csv';
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'temporal_shapefile';

-- 創建時序資料類型枚舉
DO $$ BEGIN
    CREATE TYPE temporal_data_type_enum AS ENUM (
        'insar',        -- InSAR 資料
        'gnss',         -- GNSS 資料
        'weather',      -- 氣象資料
        'earthquake',   -- 地震資料
        'rainfall',     -- 降雨資料
        'temperature',  -- 溫度資料
        'humidity',     -- 濕度資料
        'wind',         -- 風速資料
        'pressure',     -- 氣壓資料
        'displacement', -- 位移資料
        'strain',       -- 應變資料
        'other'         -- 其他類型
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 創建時序資料表
CREATE TABLE IF NOT EXISTS temporal_data (
    -- 主鍵
    temporal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到專案
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 關聯到來源檔案
    source_file_id UUID REFERENCES data_files(file_id) ON DELETE SET NULL,
    
    -- 基本資訊
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type temporal_data_type_enum NOT NULL,
    
    -- 時間範圍
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    time_interval INTERVAL, -- 時間間隔（如每小時、每天等）
    
    -- 資料格式和結構
    data_format VARCHAR(20) NOT NULL, -- 'geojson', 'csv', 'shapefile'
    total_records INTEGER DEFAULT 0, -- 總記錄數
    time_series_count INTEGER DEFAULT 0, -- 時間序列數量
    
    -- 空間資訊（如果是 GeoJSON）
    has_spatial_data BOOLEAN DEFAULT FALSE,
    spatial_extent GEOMETRY(POLYGON, 4326), -- 空間範圍
    srid INTEGER DEFAULT 4326, -- 空間參考系統
    feature_count INTEGER DEFAULT 0, -- 空間要素數量
    
    -- 資料結構定義
    data_schema JSONB, -- 資料結構定義（欄位名稱、類型等）
    time_column VARCHAR(100), -- 時間欄位名稱
    value_columns TEXT[], -- 數值欄位名稱陣列
    location_columns TEXT[], -- 位置欄位名稱陣列（經度、緯度等）
    
    -- 圖表配置
    chart_config JSONB, -- 圖表配置（圖表類型、顏色、軸標籤等）
    default_chart_type VARCHAR(50) DEFAULT 'line', -- 預設圖表類型
    
    -- 資料品質
    data_quality_score DECIMAL(3,2), -- 資料品質評分 (0-1)
    validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid, warning
    validation_errors TEXT[], -- 驗證錯誤訊息
    
    -- 處理狀態
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_progress INTEGER DEFAULT 0, -- 處理進度 (0-100)
    processing_log TEXT, -- 處理日誌
    error_message TEXT, -- 錯誤訊息
    
    -- 快取資訊
    is_cached BOOLEAN DEFAULT FALSE, -- 是否已快取
    cache_size BIGINT DEFAULT 0, -- 快取大小
    cache_created_at TIMESTAMP WITH TIME ZONE, -- 快取創建時間
    
    -- 統計資訊
    min_value DECIMAL(15,6), -- 最小值
    max_value DECIMAL(15,6), -- 最大值
    avg_value DECIMAL(15,6), -- 平均值
    std_deviation DECIMAL(15,6), -- 標準差
    
    -- 權限控制
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private', -- private, team, public
    
    -- 標記和分類
    tags TEXT[], -- 標籤陣列
    category VARCHAR(100), -- 分類
    
    -- 元數據
    metadata JSONB, -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_temporal_data_name_length CHECK (LENGTH(name) >= 1),
    CONSTRAINT chk_temporal_data_time_range CHECK (end_time > start_time),
    CONSTRAINT chk_temporal_data_total_records CHECK (total_records >= 0),
    CONSTRAINT chk_temporal_data_time_series_count CHECK (time_series_count >= 0),
    CONSTRAINT chk_temporal_data_feature_count CHECK (feature_count >= 0),
    CONSTRAINT chk_temporal_data_processing_progress CHECK (processing_progress >= 0 AND processing_progress <= 100),
    CONSTRAINT chk_temporal_data_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_temporal_data_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    CONSTRAINT chk_temporal_data_access_level CHECK (access_level IN ('private', 'team', 'public')),
    CONSTRAINT chk_temporal_data_quality_score CHECK (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 1)),
    CONSTRAINT chk_temporal_data_cache_size CHECK (cache_size >= 0),
    CONSTRAINT chk_temporal_data_data_format CHECK (data_format IN ('geojson', 'csv', 'shapefile')),
    CONSTRAINT chk_temporal_data_srid CHECK (srid IS NULL OR validate_srid(srid))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_temporal_data_project_id ON temporal_data(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_source_file_id ON temporal_data(source_file_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_name ON temporal_data USING gin(to_tsvector('chinese', name));
CREATE INDEX IF NOT EXISTS idx_temporal_data_data_type ON temporal_data(data_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_data_format ON temporal_data(data_format) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_start_time ON temporal_data(start_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_end_time ON temporal_data(end_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_time_range ON temporal_data(start_time, end_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_spatial_extent ON temporal_data USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_has_spatial_data ON temporal_data(has_spatial_data) WHERE has_spatial_data = TRUE;
CREATE INDEX IF NOT EXISTS idx_temporal_data_processing_status ON temporal_data(processing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_validation_status ON temporal_data(validation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_tags ON temporal_data USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_metadata ON temporal_data USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_data_schema ON temporal_data USING gin(data_schema) WHERE data_schema IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_chart_config ON temporal_data USING gin(chart_config) WHERE chart_config IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temporal_data_created_at ON temporal_data(created_at DESC) WHERE deleted_at IS NULL;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_temporal_data_updated_at
    BEFORE UPDATE ON temporal_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：更新專案統計
CREATE OR REPLACE FUNCTION update_project_temporal_stats()
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

CREATE TRIGGER trigger_temporal_data_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON temporal_data
    FOR EACH ROW
    EXECUTE FUNCTION update_project_temporal_stats();

-- 創建視圖：活躍時序資料
CREATE OR REPLACE VIEW active_temporal_data AS
SELECT 
    td.temporal_id,
    td.project_id,
    p.name as project_name,
    td.source_file_id,
    df.file_name as source_file_name,
    td.name,
    td.description,
    td.data_type,
    td.start_time,
    td.end_time,
    td.time_interval,
    td.data_format,
    td.total_records,
    td.time_series_count,
    td.has_spatial_data,
    td.spatial_extent,
    td.srid,
    td.feature_count,
    td.data_schema,
    td.time_column,
    td.value_columns,
    td.location_columns,
    td.chart_config,
    td.default_chart_type,
    td.data_quality_score,
    td.validation_status,
    td.processing_status,
    td.processing_progress,
    td.is_cached,
    td.cache_size,
    td.min_value,
    td.max_value,
    td.avg_value,
    td.std_deviation,
    td.is_public,
    td.access_level,
    td.tags,
    td.category,
    td.metadata,
    td.created_at,
    td.updated_at
FROM temporal_data td
JOIN projects p ON td.project_id = p.project_id
LEFT JOIN data_files df ON td.source_file_id = df.file_id
WHERE td.deleted_at IS NULL AND p.deleted_at IS NULL;

-- 創建視圖：時序資料統計
CREATE OR REPLACE VIEW temporal_data_statistics AS
SELECT 
    project_id,
    COUNT(*) as total_temporal_data,
    COUNT(*) FILTER (WHERE data_format = 'geojson') as geojson_count,
    COUNT(*) FILTER (WHERE data_format = 'csv') as csv_count,
    COUNT(*) FILTER (WHERE data_format = 'shapefile') as shapefile_count,
    COUNT(*) FILTER (WHERE data_type = 'weather') as weather_count,
    COUNT(*) FILTER (WHERE data_type = 'earthquake') as earthquake_count,
    COUNT(*) FILTER (WHERE data_type = 'rainfall') as rainfall_count,
    COUNT(*) FILTER (WHERE data_type = 'temperature') as temperature_count,
    COUNT(*) FILTER (WHERE data_type = 'humidity') as humidity_count,
    COUNT(*) FILTER (WHERE data_type = 'wind') as wind_count,
    COUNT(*) FILTER (WHERE data_type = 'pressure') as pressure_count,
    COUNT(*) FILTER (WHERE has_spatial_data = TRUE) as spatial_temporal_count,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
    SUM(total_records) as total_records,
    SUM(time_series_count) as total_time_series,
    SUM(feature_count) as total_features,
    AVG(data_quality_score) as avg_quality_score,
    SUM(cache_size) as total_cache_size
FROM temporal_data 
WHERE deleted_at IS NULL
GROUP BY project_id;

-- 添加註釋
COMMENT ON TABLE temporal_data IS '時序資料表，專門用於時序資料管理';
COMMENT ON COLUMN temporal_data.temporal_id IS '時序資料唯一識別碼';
COMMENT ON COLUMN temporal_data.project_id IS '所屬專案ID';
COMMENT ON COLUMN temporal_data.source_file_id IS '來源檔案ID';
COMMENT ON COLUMN temporal_data.name IS '時序資料名稱';
COMMENT ON COLUMN temporal_data.description IS '時序資料描述';
COMMENT ON COLUMN temporal_data.data_type IS '資料類型（氣象、地震、降雨等）';
COMMENT ON COLUMN temporal_data.start_time IS '開始時間';
COMMENT ON COLUMN temporal_data.end_time IS '結束時間';
COMMENT ON COLUMN temporal_data.time_interval IS '時間間隔';
COMMENT ON COLUMN temporal_data.data_format IS '資料格式（geojson, csv, shapefile）';
COMMENT ON COLUMN temporal_data.total_records IS '總記錄數';
COMMENT ON COLUMN temporal_data.time_series_count IS '時間序列數量';
COMMENT ON COLUMN temporal_data.has_spatial_data IS '是否包含空間資料';
COMMENT ON COLUMN temporal_data.spatial_extent IS '空間範圍';
COMMENT ON COLUMN temporal_data.srid IS '空間參考系統ID';
COMMENT ON COLUMN temporal_data.feature_count IS '空間要素數量';
COMMENT ON COLUMN temporal_data.data_schema IS '資料結構定義（JSON）';
COMMENT ON COLUMN temporal_data.time_column IS '時間欄位名稱';
COMMENT ON COLUMN temporal_data.value_columns IS '數值欄位名稱陣列';
COMMENT ON COLUMN temporal_data.location_columns IS '位置欄位名稱陣列';
COMMENT ON COLUMN temporal_data.chart_config IS '圖表配置（JSON）';
COMMENT ON COLUMN temporal_data.default_chart_type IS '預設圖表類型';
COMMENT ON COLUMN temporal_data.data_quality_score IS '資料品質評分 (0-1)';
COMMENT ON COLUMN temporal_data.validation_status IS '驗證狀態';
COMMENT ON COLUMN temporal_data.processing_status IS '處理狀態';
COMMENT ON COLUMN temporal_data.processing_progress IS '處理進度 (0-100)';
COMMENT ON COLUMN temporal_data.is_cached IS '是否已快取';
COMMENT ON COLUMN temporal_data.cache_size IS '快取大小';
COMMENT ON COLUMN temporal_data.min_value IS '最小值';
COMMENT ON COLUMN temporal_data.max_value IS '最大值';
COMMENT ON COLUMN temporal_data.avg_value IS '平均值';
COMMENT ON COLUMN temporal_data.std_deviation IS '標準差';
COMMENT ON COLUMN temporal_data.metadata IS '額外的元數據（JSON）';
COMMENT ON COLUMN temporal_data.deleted_at IS '軟刪除時間戳記';

COMMENT ON TYPE temporal_data_type_enum IS '時序資料類型枚舉';
COMMENT ON VIEW active_temporal_data IS '活躍時序資料視圖（排除已刪除）';
COMMENT ON VIEW temporal_data_statistics IS '時序資料統計資訊視圖';
