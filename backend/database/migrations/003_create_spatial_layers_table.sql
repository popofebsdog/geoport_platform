-- 創建 spatial_layers 表
-- 對應到 WebGIS 可讀的圖層
-- 創建時間: 2025-09-24

-- 創建 spatial_layers 表
CREATE TABLE IF NOT EXISTS spatial_layers (
    -- 主鍵
    layer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到專案
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 關聯到來源檔案
    source_file_id UUID REFERENCES data_files(file_id) ON DELETE SET NULL,
    
    -- 圖層基本資訊
    layer_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255), -- 顯示名稱
    description TEXT,
    
    -- 幾何類型
    geometry_type geometry_type_enum NOT NULL,
    
    -- 空間參考系統
    srid INTEGER NOT NULL DEFAULT 4326, -- 空間座標系統
    coordinate_system VARCHAR(100), -- 座標系統名稱
    
    -- 空間範圍
    spatial_extent GEOMETRY(POLYGON, 4326), -- 空間範圍 (統一轉換為 WGS84)
    bbox_min_x DECIMAL(15, 8), -- 邊界框最小X
    bbox_min_y DECIMAL(15, 8), -- 邊界框最小Y
    bbox_max_x DECIMAL(15, 8), -- 邊界框最大X
    bbox_max_y DECIMAL(15, 8), -- 邊界框最大Y
    
    -- 圖層統計
    feature_count INTEGER DEFAULT 0, -- 要素數量
    vertex_count INTEGER DEFAULT 0, -- 頂點數量
    
    -- 屬性結構
    attributes JSONB, -- 屬性結構定義
    attribute_count INTEGER DEFAULT 0, -- 屬性欄位數量
    
    -- 圖層設定
    layer_style JSONB, -- 圖層樣式設定 (顏色、線寬等)
    opacity DECIMAL(3,2) DEFAULT 1.0, -- 透明度 (0-1)
    visible BOOLEAN DEFAULT TRUE, -- 是否可見
    z_index INTEGER DEFAULT 0, -- 圖層順序
    
    -- 資料來源資訊
    source_type VARCHAR(50) DEFAULT 'file', -- file, database, service, etc.
    source_config JSONB, -- 資料來源配置
    
    -- 處理狀態
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_progress INTEGER DEFAULT 0, -- 處理進度 (0-100)
    processing_log TEXT, -- 處理日誌
    error_message TEXT, -- 錯誤訊息
    
    -- 資料品質
    data_quality_score DECIMAL(3,2), -- 資料品質評分 (0-1)
    validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid, warning
    validation_errors TEXT[], -- 驗證錯誤訊息
    
    -- 快取資訊
    is_cached BOOLEAN DEFAULT FALSE, -- 是否已快取
    cache_size BIGINT DEFAULT 0, -- 快取大小
    cache_created_at TIMESTAMP WITH TIME ZONE, -- 快取創建時間
    
    -- 版本控制
    version VARCHAR(20) DEFAULT '1.0',
    parent_layer_id UUID REFERENCES spatial_layers(layer_id), -- 父圖層ID
    
    -- 權限控制
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private', -- private, team, public
    
    -- 標記和分類
    tags TEXT[], -- 標籤陣列
    category VARCHAR(100), -- 圖層分類
    
    -- 元數據
    metadata JSONB, -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_spatial_layers_name_length CHECK (LENGTH(layer_name) >= 1),
    CONSTRAINT chk_spatial_layers_srid CHECK (validate_srid(srid)),
    CONSTRAINT chk_spatial_layers_feature_count CHECK (feature_count >= 0),
    CONSTRAINT chk_spatial_layers_vertex_count CHECK (vertex_count >= 0),
    CONSTRAINT chk_spatial_layers_attribute_count CHECK (attribute_count >= 0),
    CONSTRAINT chk_spatial_layers_opacity CHECK (opacity >= 0 AND opacity <= 1),
    CONSTRAINT chk_spatial_layers_processing_progress CHECK (processing_progress >= 0 AND processing_progress <= 100),
    CONSTRAINT chk_spatial_layers_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_spatial_layers_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    CONSTRAINT chk_spatial_layers_access_level CHECK (access_level IN ('private', 'team', 'public')),
    CONSTRAINT chk_spatial_layers_quality_score CHECK (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 1)),
    CONSTRAINT chk_spatial_layers_cache_size CHECK (cache_size >= 0)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_spatial_layers_project_id ON spatial_layers(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_source_file_id ON spatial_layers(source_file_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_name ON spatial_layers USING gin(to_tsvector('chinese', layer_name));
CREATE INDEX IF NOT EXISTS idx_spatial_layers_geometry_type ON spatial_layers(geometry_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_srid ON spatial_layers(srid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_spatial_extent ON spatial_layers USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_visible ON spatial_layers(visible) WHERE deleted_at IS NULL AND visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_z_index ON spatial_layers(z_index) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_processing_status ON spatial_layers(processing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_validation_status ON spatial_layers(validation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_tags ON spatial_layers USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_metadata ON spatial_layers USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_attributes ON spatial_layers USING gin(attributes) WHERE attributes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_created_at ON spatial_layers(created_at DESC) WHERE deleted_at IS NULL;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_spatial_layers_updated_at
    BEFORE UPDATE ON spatial_layers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：更新專案統計
CREATE OR REPLACE FUNCTION update_project_layer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        -- 新增圖層時更新統計
        UPDATE projects 
        SET 
            layer_count = layer_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = NEW.project_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新圖層時更新統計
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            -- 軟刪除圖層
            UPDATE projects 
            SET 
                layer_count = layer_count - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = OLD.project_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            -- 恢復圖層
            UPDATE projects 
            SET 
                layer_count = layer_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = NEW.project_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
        -- 硬刪除圖層時更新統計
        UPDATE projects 
        SET 
            layer_count = layer_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = OLD.project_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_spatial_layers_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON spatial_layers
    FOR EACH ROW
    EXECUTE FUNCTION update_project_layer_stats();

-- 創建觸發器：自動計算邊界框
CREATE OR REPLACE FUNCTION update_layer_bbox()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.spatial_extent IS NOT NULL THEN
        -- 計算邊界框
        NEW.bbox_min_x := ST_XMin(NEW.spatial_extent);
        NEW.bbox_min_y := ST_YMin(NEW.spatial_extent);
        NEW.bbox_max_x := ST_XMax(NEW.spatial_extent);
        NEW.bbox_max_y := ST_YMax(NEW.spatial_extent);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_spatial_layers_update_bbox
    BEFORE INSERT OR UPDATE ON spatial_layers
    FOR EACH ROW
    EXECUTE FUNCTION update_layer_bbox();

-- 創建視圖：活躍圖層
CREATE OR REPLACE VIEW active_spatial_layers AS
SELECT 
    sl.layer_id,
    sl.project_id,
    p.name as project_name,
    sl.source_file_id,
    df.file_name as source_file_name,
    sl.layer_name,
    sl.display_name,
    sl.description,
    sl.geometry_type,
    sl.srid,
    sl.coordinate_system,
    sl.spatial_extent,
    sl.bbox_min_x,
    sl.bbox_min_y,
    sl.bbox_max_x,
    sl.bbox_max_y,
    sl.feature_count,
    sl.vertex_count,
    sl.attributes,
    sl.attribute_count,
    sl.layer_style,
    sl.opacity,
    sl.visible,
    sl.z_index,
    sl.source_type,
    sl.processing_status,
    sl.processing_progress,
    sl.data_quality_score,
    sl.validation_status,
    sl.is_cached,
    sl.cache_size,
    sl.version,
    sl.is_public,
    sl.access_level,
    sl.tags,
    sl.category,
    sl.metadata,
    sl.created_at,
    sl.updated_at
FROM spatial_layers sl
JOIN projects p ON sl.project_id = p.project_id
LEFT JOIN data_files df ON sl.source_file_id = df.file_id
WHERE sl.deleted_at IS NULL AND p.deleted_at IS NULL;

-- 創建視圖：圖層統計
CREATE OR REPLACE VIEW layer_statistics AS
SELECT 
    project_id,
    COUNT(*) as total_layers,
    COUNT(*) FILTER (WHERE geometry_type = 'Point') as point_layers,
    COUNT(*) FILTER (WHERE geometry_type = 'LineString') as line_layers,
    COUNT(*) FILTER (WHERE geometry_type = 'Polygon') as polygon_layers,
    COUNT(*) FILTER (WHERE geometry_type = 'Raster') as raster_layers,
    COUNT(*) FILTER (WHERE visible = TRUE) as visible_layers,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_layers,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_layers,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_layers,
    SUM(feature_count) as total_features,
    SUM(vertex_count) as total_vertices,
    AVG(data_quality_score) as avg_quality_score,
    SUM(cache_size) as total_cache_size
FROM spatial_layers 
WHERE deleted_at IS NULL
GROUP BY project_id;

-- 創建視圖：WebGIS 圖層列表
CREATE OR REPLACE VIEW webgis_layers AS
SELECT 
    sl.layer_id,
    sl.project_id,
    p.name as project_name,
    sl.layer_name,
    sl.display_name,
    sl.geometry_type,
    sl.srid,
    sl.spatial_extent,
    sl.bbox_min_x,
    sl.bbox_min_y,
    sl.bbox_max_x,
    sl.bbox_max_y,
    sl.feature_count,
    sl.attributes,
    sl.layer_style,
    sl.opacity,
    sl.visible,
    sl.z_index,
    sl.is_public,
    sl.access_level,
    sl.tags,
    sl.category,
    sl.created_at
FROM spatial_layers sl
JOIN projects p ON sl.project_id = p.project_id
WHERE sl.deleted_at IS NULL 
  AND p.deleted_at IS NULL 
  AND sl.processing_status = 'completed'
  AND sl.validation_status = 'valid'
ORDER BY sl.z_index, sl.created_at;

-- 添加註釋
COMMENT ON TABLE spatial_layers IS '空間圖層表，對應到 WebGIS 可讀的圖層';
COMMENT ON COLUMN spatial_layers.layer_id IS '圖層唯一識別碼';
COMMENT ON COLUMN spatial_layers.project_id IS '所屬專案ID';
COMMENT ON COLUMN spatial_layers.source_file_id IS '來源檔案ID';
COMMENT ON COLUMN spatial_layers.layer_name IS '圖層名稱';
COMMENT ON COLUMN spatial_layers.display_name IS '顯示名稱';
COMMENT ON COLUMN spatial_layers.geometry_type IS '幾何類型';
COMMENT ON COLUMN spatial_layers.srid IS '空間參考系統ID';
COMMENT ON COLUMN spatial_layers.spatial_extent IS '空間範圍 (WGS84)';
COMMENT ON COLUMN spatial_layers.feature_count IS '要素數量';
COMMENT ON COLUMN spatial_layers.vertex_count IS '頂點數量';
COMMENT ON COLUMN spatial_layers.attributes IS '屬性結構定義 (JSON)';
COMMENT ON COLUMN spatial_layers.layer_style IS '圖層樣式設定 (JSON)';
COMMENT ON COLUMN spatial_layers.opacity IS '透明度 (0-1)';
COMMENT ON COLUMN spatial_layers.visible IS '是否可見';
COMMENT ON COLUMN spatial_layers.z_index IS '圖層順序';
COMMENT ON COLUMN spatial_layers.source_type IS '資料來源類型';
COMMENT ON COLUMN spatial_layers.processing_status IS '處理狀態';
COMMENT ON COLUMN spatial_layers.processing_progress IS '處理進度 (0-100)';
COMMENT ON COLUMN spatial_layers.data_quality_score IS '資料品質評分 (0-1)';
COMMENT ON COLUMN spatial_layers.validation_status IS '驗證狀態';
COMMENT ON COLUMN spatial_layers.is_cached IS '是否已快取';
COMMENT ON COLUMN spatial_layers.cache_size IS '快取大小';
COMMENT ON COLUMN spatial_layers.version IS '圖層版本';
COMMENT ON COLUMN spatial_layers.parent_layer_id IS '父圖層ID (版本控制)';
COMMENT ON COLUMN spatial_layers.metadata IS '額外的元數據 (JSON)';
COMMENT ON COLUMN spatial_layers.deleted_at IS '軟刪除時間戳記';

COMMENT ON VIEW active_spatial_layers IS '活躍圖層視圖 (排除已刪除)';
COMMENT ON VIEW layer_statistics IS '圖層統計資訊視圖';
COMMENT ON VIEW webgis_layers IS 'WebGIS 圖層列表視圖';
