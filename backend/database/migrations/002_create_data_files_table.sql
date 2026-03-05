-- 創建 data_files 表
-- 用來記錄上傳的原始資料檔案
-- 創建時間: 2025-09-24

-- 創建 data_files 表
CREATE TABLE IF NOT EXISTS data_files (
    -- 主鍵
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到專案
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 檔案基本資訊
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255), -- 原始檔案名稱
    file_extension VARCHAR(20), -- 檔案副檔名
    
    -- 檔案類型
    file_type file_type_enum NOT NULL,
    mime_type VARCHAR(100), -- MIME 類型
    
    -- 檔案大小和路徑
    file_size BIGINT NOT NULL DEFAULT 0, -- 檔案大小 (bytes)
    storage_path TEXT NOT NULL, -- 實體檔案路徑或 S3 位置
    storage_type VARCHAR(20) DEFAULT 'local', -- local, s3, gcs, etc.
    
    -- 檔案雜湊值 (用於重複檢測)
    file_hash VARCHAR(64), -- SHA-256 雜湊值
    checksum VARCHAR(32), -- MD5 校驗碼
    
    -- 上傳資訊
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploader_id UUID, -- 上傳者ID
    
    -- 檔案狀態
    status VARCHAR(20) DEFAULT 'active', -- active, processing, error, deleted
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- 空間資料相關資訊
    has_spatial_data BOOLEAN DEFAULT FALSE, -- 是否包含空間資料
    spatial_extent GEOMETRY(POLYGON, 4326), -- 空間範圍
    coordinate_system VARCHAR(50), -- 座標系統
    srid INTEGER, -- 空間參考系統ID
    
    -- 資料品質資訊
    data_quality_score DECIMAL(3,2), -- 資料品質評分 (0-1)
    validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid, warning
    validation_errors TEXT[], -- 驗證錯誤訊息
    
    -- 處理資訊
    processing_log TEXT, -- 處理日誌
    error_message TEXT, -- 錯誤訊息
    processing_metadata JSONB, -- 處理相關的元數據
    
    -- 版本控制
    version VARCHAR(20) DEFAULT '1.0',
    parent_file_id UUID REFERENCES data_files(file_id), -- 父檔案ID (用於版本控制)
    
    -- 權限控制
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private', -- private, team, public
    
    -- 標記和分類
    tags TEXT[], -- 標籤陣列
    keywords TEXT[], -- 關鍵字陣列
    
    -- 元數據
    metadata JSONB, -- 額外的元數據 (如 EXIF, 檔案屬性等)
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_data_files_name_length CHECK (LENGTH(file_name) >= 1),
    CONSTRAINT chk_data_files_size_positive CHECK (file_size >= 0),
    CONSTRAINT chk_data_files_status CHECK (status IN ('active', 'processing', 'error', 'deleted')),
    CONSTRAINT chk_data_files_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_data_files_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    CONSTRAINT chk_data_files_access_level CHECK (access_level IN ('private', 'team', 'public')),
    CONSTRAINT chk_data_files_quality_score CHECK (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 1)),
    CONSTRAINT chk_data_files_srid CHECK (srid IS NULL OR validate_srid(srid))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_data_files_project_id ON data_files(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_name ON data_files USING gin(to_tsvector('chinese', file_name));
CREATE INDEX IF NOT EXISTS idx_data_files_type ON data_files(file_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_uploader_id ON data_files(uploader_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_upload_date ON data_files(upload_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_status ON data_files(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_processing_status ON data_files(processing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_spatial_extent ON data_files USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_file_hash ON data_files(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_tags ON data_files USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_keywords ON data_files USING gin(keywords) WHERE keywords IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_metadata ON data_files USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_has_spatial_data ON data_files(has_spatial_data) WHERE has_spatial_data = TRUE;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_data_files_updated_at
    BEFORE UPDATE ON data_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：更新專案統計
CREATE OR REPLACE FUNCTION update_project_file_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        -- 新增檔案時更新統計
        UPDATE projects 
        SET 
            file_count = file_count + 1,
            total_size = total_size + NEW.file_size,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = NEW.project_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新檔案時更新統計
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            -- 軟刪除檔案
            UPDATE projects 
            SET 
                file_count = file_count - 1,
                total_size = total_size - OLD.file_size,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = OLD.project_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            -- 恢復檔案
            UPDATE projects 
            SET 
                file_count = file_count + 1,
                total_size = total_size + NEW.file_size,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = NEW.project_id;
        ELSIF OLD.file_size != NEW.file_size AND NEW.deleted_at IS NULL THEN
            -- 檔案大小變更
            UPDATE projects 
            SET 
                total_size = total_size - OLD.file_size + NEW.file_size,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = NEW.project_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
        -- 硬刪除檔案時更新統計
        UPDATE projects 
        SET 
            file_count = file_count - 1,
            total_size = total_size - OLD.file_size,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = OLD.project_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_data_files_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON data_files
    FOR EACH ROW
    EXECUTE FUNCTION update_project_file_stats();

-- 創建視圖：活躍檔案
CREATE OR REPLACE VIEW active_data_files AS
SELECT 
    df.file_id,
    df.project_id,
    p.name as project_name,
    df.file_name,
    df.original_name,
    df.file_extension,
    df.file_type,
    df.mime_type,
    df.file_size,
    df.storage_path,
    df.storage_type,
    df.file_hash,
    df.upload_date,
    df.uploader_id,
    df.status,
    df.processing_status,
    df.has_spatial_data,
    df.spatial_extent,
    df.coordinate_system,
    df.srid,
    df.data_quality_score,
    df.validation_status,
    df.version,
    df.is_public,
    df.access_level,
    df.tags,
    df.keywords,
    df.metadata,
    df.created_at,
    df.updated_at
FROM data_files df
JOIN projects p ON df.project_id = p.project_id
WHERE df.deleted_at IS NULL AND p.deleted_at IS NULL;

-- 創建視圖：檔案統計
CREATE OR REPLACE VIEW file_statistics AS
SELECT 
    project_id,
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE file_type = 'raster') as raster_files,
    COUNT(*) FILTER (WHERE file_type = 'vector') as vector_files,
    COUNT(*) FILTER (WHERE file_type = 'csv') as csv_files,
    COUNT(*) FILTER (WHERE file_type = 'lidar') as lidar_files,
    COUNT(*) FILTER (WHERE file_type = 'image') as image_files,
    COUNT(*) FILTER (WHERE file_type = 'report') as report_files,
    COUNT(*) FILTER (WHERE has_spatial_data = TRUE) as spatial_files,
    SUM(file_size) as total_size,
    AVG(file_size) as avg_file_size,
    MAX(file_size) as max_file_size,
    MIN(file_size) as min_file_size,
    COUNT(*) FILTER (WHERE status = 'active') as active_files,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_files,
    COUNT(*) FILTER (WHERE status = 'error') as error_files
FROM data_files 
WHERE deleted_at IS NULL
GROUP BY project_id;

-- 添加註釋
COMMENT ON TABLE data_files IS '資料檔案表，記錄上傳的原始資料檔案';
COMMENT ON COLUMN data_files.file_id IS '檔案唯一識別碼';
COMMENT ON COLUMN data_files.project_id IS '所屬專案ID';
COMMENT ON COLUMN data_files.file_name IS '檔案名稱';
COMMENT ON COLUMN data_files.original_name IS '原始檔案名稱';
COMMENT ON COLUMN data_files.file_type IS '檔案類型 (raster, vector, csv, lidar, etc.)';
COMMENT ON COLUMN data_files.file_size IS '檔案大小 (bytes)';
COMMENT ON COLUMN data_files.storage_path IS '檔案儲存路徑';
COMMENT ON COLUMN data_files.storage_type IS '儲存類型 (local, s3, gcs)';
COMMENT ON COLUMN data_files.file_hash IS '檔案雜湊值 (SHA-256)';
COMMENT ON COLUMN data_files.uploader_id IS '上傳者ID';
COMMENT ON COLUMN data_files.has_spatial_data IS '是否包含空間資料';
COMMENT ON COLUMN data_files.spatial_extent IS '空間範圍';
COMMENT ON COLUMN data_files.srid IS '空間參考系統ID';
COMMENT ON COLUMN data_files.data_quality_score IS '資料品質評分 (0-1)';
COMMENT ON COLUMN data_files.validation_status IS '驗證狀態';
COMMENT ON COLUMN data_files.version IS '檔案版本';
COMMENT ON COLUMN data_files.parent_file_id IS '父檔案ID (版本控制)';
COMMENT ON COLUMN data_files.metadata IS '額外的元數據 (JSON)';
COMMENT ON COLUMN data_files.deleted_at IS '軟刪除時間戳記';

COMMENT ON VIEW active_data_files IS '活躍檔案視圖 (排除已刪除)';
COMMENT ON VIEW file_statistics IS '檔案統計資訊視圖';
