-- 優化 data_files 表的 metadata JSONB 索引
-- 建立時間: 2024-01-15

-- 為常用的 JSONB 查詢建立索引
CREATE INDEX IF NOT EXISTS idx_data_files_metadata_name 
ON data_files USING btree((metadata->'data_info'->>'name'));

CREATE INDEX IF NOT EXISTS idx_data_files_metadata_description 
ON data_files USING btree((metadata->'data_info'->>'description'));

CREATE INDEX IF NOT EXISTS idx_data_files_metadata_date 
ON data_files USING btree((metadata->'data_info'->>'date'));

CREATE INDEX IF NOT EXISTS idx_data_files_metadata_analysis_type 
ON data_files USING btree((metadata->'analysis_info'->>'type'));

-- 為 data_info 整個物件建立 GIN 索引（支援複雜查詢）
CREATE INDEX IF NOT EXISTS idx_data_files_metadata_data_info 
ON data_files USING gin((metadata->'data_info'));

-- 為 analysis_info 整個物件建立 GIN 索引
CREATE INDEX IF NOT EXISTS idx_data_files_metadata_analysis_info 
ON data_files USING gin((metadata->'analysis_info'));

-- 複合索引：專案 + 分析類型
CREATE INDEX IF NOT EXISTS idx_data_files_project_analysis_type 
ON data_files (project_id, (metadata->'analysis_info'->>'type'));

-- 複合索引：專案 + 日期
CREATE INDEX IF NOT EXISTS idx_data_files_project_date 
ON data_files (project_id, (metadata->'data_info'->>'date'));

-- 為檔案類型建立索引
CREATE INDEX IF NOT EXISTS idx_data_files_file_type 
ON data_files (file_type);

-- 為上傳日期建立索引
CREATE INDEX IF NOT EXISTS idx_data_files_upload_date 
ON data_files (upload_date);

-- 為軟刪除建立索引
CREATE INDEX IF NOT EXISTS idx_data_files_deleted_at 
ON data_files (deleted_at) WHERE deleted_at IS NULL;

-- 建立部分索引：只對未刪除的記錄建立索引
CREATE INDEX IF NOT EXISTS idx_data_files_active_metadata_name 
ON data_files USING btree((metadata->'data_info'->>'name')) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_data_files_active_metadata_description 
ON data_files USING btree((metadata->'data_info'->>'description')) 
WHERE deleted_at IS NULL;

-- 建立統計信息（幫助查詢優化器）
ANALYZE data_files;
