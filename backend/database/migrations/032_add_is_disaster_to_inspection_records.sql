-- 添加標註災害欄位到巡查紀錄表
-- 創建時間: 2025-01-XX

-- 添加 is_disaster 欄位
ALTER TABLE inspection_records 
ADD COLUMN IF NOT EXISTS is_disaster BOOLEAN DEFAULT FALSE;

-- 添加註釋
COMMENT ON COLUMN inspection_records.is_disaster IS '是否標註為災害（true: 是災害, false: 非災害）';

-- 創建索引以便快速查詢災害記錄
CREATE INDEX IF NOT EXISTS idx_inspection_records_is_disaster 
    ON inspection_records(is_disaster) 
    WHERE is_disaster = TRUE AND deleted_at IS NULL;

