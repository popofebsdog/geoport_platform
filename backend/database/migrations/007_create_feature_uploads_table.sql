-- 創建 feature_uploads 表
-- 用於存儲 GeoJSON features 的關聯上傳資料（如圖片、文件等）

CREATE TABLE IF NOT EXISTS feature_uploads (
    -- 主鍵
    upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 外鍵關聯
    data_files_id UUID NOT NULL REFERENCES data_files(file_id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL, -- GeoJSON feature 的 Id 或 ProfileId
    
    -- 上傳資料基本資訊
    upload_name VARCHAR(255) NOT NULL, -- 上傳資料名稱
    upload_description TEXT, -- 上傳資料描述
    upload_type VARCHAR(50) NOT NULL, -- 上傳類型：image, document, video, audio, other
    
    -- 檔案資訊
    file_name VARCHAR(255) NOT NULL, -- 檔案名稱
    original_name VARCHAR(255) NOT NULL, -- 原始檔案名稱
    file_extension VARCHAR(10) NOT NULL, -- 檔案副檔名
    mime_type VARCHAR(100) NOT NULL, -- MIME 類型
    file_size BIGINT NOT NULL, -- 檔案大小（bytes）
    storage_path TEXT NOT NULL, -- 檔案儲存路徑
    file_hash VARCHAR(64), -- 檔案雜湊值
    
    -- 關聯資訊
    feature_properties JSONB, -- 儲存 feature 的 properties 資訊
    upload_metadata JSONB, -- 額外的上傳元資料
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL -- 軟刪除
    
    -- 約束條件
    CONSTRAINT feature_uploads_upload_type_check 
        CHECK (upload_type IN ('image', 'document', 'video', 'audio', 'other'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_feature_uploads_data_files_id ON feature_uploads(data_files_id);
CREATE INDEX IF NOT EXISTS idx_feature_uploads_feature_id ON feature_uploads(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_uploads_upload_type ON feature_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_feature_uploads_created_at ON feature_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_uploads_deleted_at ON feature_uploads(deleted_at);

-- 複合索引：data_files_id + feature_id + deleted_at
CREATE INDEX IF NOT EXISTS idx_feature_uploads_composite ON feature_uploads(data_files_id, feature_id, deleted_at);

-- 創建更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_feature_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feature_uploads_updated_at
    BEFORE UPDATE ON feature_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_uploads_updated_at();

-- 添加註釋
COMMENT ON TABLE feature_uploads IS 'GeoJSON features 的關聯上傳資料表';
COMMENT ON COLUMN feature_uploads.upload_id IS '上傳資料唯一識別碼';
COMMENT ON COLUMN feature_uploads.data_files_id IS '關聯的 data_files 記錄 ID';
COMMENT ON COLUMN feature_uploads.feature_id IS 'GeoJSON feature 的識別碼（如 AA, BB, CC, DD, EE）';
COMMENT ON COLUMN feature_uploads.upload_name IS '上傳資料的名稱';
COMMENT ON COLUMN feature_uploads.upload_description IS '上傳資料的描述';
COMMENT ON COLUMN feature_uploads.upload_type IS '上傳類型：image, document, video, audio, other';
COMMENT ON COLUMN feature_uploads.feature_properties IS '儲存 GeoJSON feature 的 properties 資訊';
COMMENT ON COLUMN feature_uploads.upload_metadata IS '額外的上傳元資料（如座標、標籤等）';
