-- 創建影像紀錄表
-- 用於存儲子專案的照片和影片上傳資料
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS image_records (
    -- 主鍵
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 外鍵關聯到子專案（projects 表中的子專案）
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 媒體類型
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    
    -- 檔案基本資訊
    file_name VARCHAR(255) NOT NULL, -- 儲存的檔案名稱
    original_name VARCHAR(255) NOT NULL, -- 原始檔案名稱
    file_extension VARCHAR(10) NOT NULL, -- 檔案副檔名（如 .jpg, .mp4）
    mime_type VARCHAR(100) NOT NULL, -- MIME 類型（如 image/jpeg, video/mp4）
    file_size BIGINT NOT NULL, -- 檔案大小（bytes）
    
    -- 檔案儲存路徑
    storage_path TEXT NOT NULL, -- 檔案在伺服器上的儲存路徑
    thumbnail_path TEXT, -- 縮圖路徑（僅照片使用，影片可能為空）
    file_hash VARCHAR(64), -- 檔案雜湊值（用於去重和驗證）
    
    -- 媒體屬性（僅影片）
    duration DECIMAL(10, 2), -- 影片時長（秒）
    width INTEGER, -- 寬度（像素）
    height INTEGER, -- 高度（像素）
    frame_rate DECIMAL(5, 2), -- 幀率（fps，僅影片）
    bitrate INTEGER, -- 位元率（bps，僅影片）
    
    -- 照片專屬屬性
    camera_make VARCHAR(100), -- 相機品牌（EXIF）
    camera_model VARCHAR(100), -- 相機型號（EXIF）
    taken_at TIMESTAMP WITH TIME ZONE, -- 拍攝時間（EXIF）
    location_geometry GEOMETRY(POINT, 4326), -- GPS 座標（EXIF）
    latitude DECIMAL(10, 7), -- 緯度（EXIF）
    longitude DECIMAL(10, 7), -- 經度（EXIF）
    
    -- 描述和標籤
    description TEXT, -- 描述
    tags TEXT[], -- 標籤陣列
    
    -- 元數據
    metadata JSONB, -- 額外的元數據（EXIF、影片編碼資訊等）
    
    -- 處理狀態
    processing_status VARCHAR(20) DEFAULT 'completed', -- pending, processing, completed, failed
    processing_error TEXT, -- 處理錯誤訊息
    
    -- 統計資訊
    view_count INTEGER DEFAULT 0, -- 查看次數
    download_count INTEGER DEFAULT 0, -- 下載次數
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_image_records_file_size CHECK (file_size > 0),
    CONSTRAINT chk_image_records_duration CHECK (duration IS NULL OR duration >= 0),
    CONSTRAINT chk_image_records_dimensions CHECK (
        (width IS NULL OR width > 0) AND 
        (height IS NULL OR height > 0)
    )
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_image_records_project_id ON image_records(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_records_media_type ON image_records(media_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_records_created_at ON image_records(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_records_deleted_at ON image_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_records_file_hash ON image_records(file_hash) WHERE file_hash IS NOT NULL;

-- 複合索引：project_id + media_type + deleted_at（常用查詢）
CREATE INDEX IF NOT EXISTS idx_image_records_project_media ON image_records(project_id, media_type, deleted_at) WHERE deleted_at IS NULL;

-- 空間索引（用於 GPS 座標查詢）
CREATE INDEX IF NOT EXISTS idx_image_records_location ON image_records USING GIST(location_geometry) WHERE location_geometry IS NOT NULL;

-- 創建更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_image_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_image_records_updated_at
    BEFORE UPDATE ON image_records
    FOR EACH ROW
    EXECUTE FUNCTION update_image_records_updated_at();

-- 創建觸發器：自動從 location_geometry 提取經緯度
CREATE OR REPLACE FUNCTION extract_image_record_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_geometry IS NOT NULL THEN
        NEW.latitude = ST_Y(NEW.location_geometry);
        NEW.longitude = ST_X(NEW.location_geometry);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extract_image_record_coordinates
    BEFORE INSERT OR UPDATE ON image_records
    FOR EACH ROW
    WHEN (NEW.location_geometry IS NOT NULL)
    EXECUTE FUNCTION extract_image_record_coordinates();

-- 添加註釋
COMMENT ON TABLE image_records IS '子專案的影像紀錄表（照片和影片）';
COMMENT ON COLUMN image_records.media_id IS '媒體唯一識別碼';
COMMENT ON COLUMN image_records.project_id IS '關聯的子專案 ID';
COMMENT ON COLUMN image_records.media_type IS '媒體類型：image（照片）或 video（影片）';
COMMENT ON COLUMN image_records.file_name IS '儲存的檔案名稱（UUID 格式）';
COMMENT ON COLUMN image_records.original_name IS '使用者上傳的原始檔案名稱';
COMMENT ON COLUMN image_records.storage_path IS '檔案在伺服器上的儲存路徑';
COMMENT ON COLUMN image_records.thumbnail_path IS '縮圖路徑（僅照片使用）';
COMMENT ON COLUMN image_records.file_hash IS '檔案雜湊值（SHA-256），用於去重和驗證';
COMMENT ON COLUMN image_records.duration IS '影片時長（秒）';
COMMENT ON COLUMN image_records.width IS '媒體寬度（像素）';
COMMENT ON COLUMN image_records.height IS '媒體高度（像素）';
COMMENT ON COLUMN image_records.frame_rate IS '影片幀率（fps）';
COMMENT ON COLUMN image_records.bitrate IS '影片位元率（bps）';
COMMENT ON COLUMN image_records.camera_make IS '相機品牌（從 EXIF 提取）';
COMMENT ON COLUMN image_records.camera_model IS '相機型號（從 EXIF 提取）';
COMMENT ON COLUMN image_records.taken_at IS '拍攝時間（從 EXIF 提取）';
COMMENT ON COLUMN image_records.location_geometry IS 'GPS 座標（從 EXIF 提取，PostGIS POINT）';
COMMENT ON COLUMN image_records.latitude IS '緯度（從 location_geometry 自動提取）';
COMMENT ON COLUMN image_records.longitude IS '經度（從 location_geometry 自動提取）';
COMMENT ON COLUMN image_records.metadata IS '額外的元數據（EXIF、影片編碼資訊等）';
COMMENT ON COLUMN image_records.processing_status IS '處理狀態：pending, processing, completed, failed';
COMMENT ON COLUMN image_records.view_count IS '查看次數';
COMMENT ON COLUMN image_records.download_count IS '下載次數';

