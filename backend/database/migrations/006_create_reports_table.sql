-- 確保 UUID 擴展存在
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(50) NOT NULL, -- 'pdf' or 'url'
    file_path TEXT,                 -- PDF檔案路徑或URL連結
    file_name VARCHAR(255),         -- 原始檔案名稱（如果是PDF）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    owner_id UUID,                  -- FK to users table, to be added later
    is_bookmarked BOOLEAN DEFAULT FALSE
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_reports_title ON reports (title);
CREATE INDEX IF NOT EXISTS idx_reports_file_type ON reports (file_type);
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON reports (owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at);
CREATE INDEX IF NOT EXISTS idx_reports_is_bookmarked ON reports (is_bookmarked);

COMMENT ON TABLE reports IS '報告資料表';
COMMENT ON COLUMN reports.report_id IS '報告唯一識別碼 (UUID)';
COMMENT ON COLUMN reports.title IS '報告標題';
COMMENT ON COLUMN reports.description IS '報告描述';
COMMENT ON COLUMN reports.file_type IS '檔案類型 (pdf 或 url)';
COMMENT ON COLUMN reports.file_path IS '檔案路徑或URL連結';
COMMENT ON COLUMN reports.file_name IS '原始檔案名稱（PDF檔案）';
COMMENT ON COLUMN reports.created_at IS '報告創建時間';
COMMENT ON COLUMN reports.updated_at IS '報告最後更新時間';
COMMENT ON COLUMN reports.deleted_at IS '報告軟刪除時間';
COMMENT ON COLUMN reports.owner_id IS '報告擁有者ID (外鍵)';
COMMENT ON COLUMN reports.is_bookmarked IS '是否已標記';
