-- 創建巡查紀錄表
-- 用於存儲例行巡查和特別巡查的數據
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS inspection_records (
    -- 主鍵
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到預警地區
    region_id UUID REFERENCES warning_regions(region_id) ON DELETE CASCADE,
    region_code VARCHAR(100), -- 地區代碼（如：台7線）
    
    -- 里程資訊
    mileage VARCHAR(50) NOT NULL, -- 里程數（如：034K+400）
    
    -- 巡查類型
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('routine', 'special')), -- routine: 例行巡查, special: 特別巡查
    
    -- 巡查時間
    inspection_year INTEGER, -- 年份（如：2024）
    inspection_month INTEGER, -- 月份（1-12，僅例行巡查使用）
    inspection_date DATE, -- 具體巡查日期
    
    -- 巡查數據（動態欄位，存儲在 JSONB 中）
    inspection_data JSONB, -- 存儲巡查的詳細數據（如：檢查項目、結果等）
    
    -- 上傳來源
    source_file_name VARCHAR(255), -- 來源 Excel 文件名
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 上傳時間
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- 軟刪除
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_inspection_records_region ON inspection_records(region_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_region_code ON inspection_records(region_code);
CREATE INDEX IF NOT EXISTS idx_inspection_records_mileage ON inspection_records(mileage);
CREATE INDEX IF NOT EXISTS idx_inspection_records_type ON inspection_records(inspection_type);
CREATE INDEX IF NOT EXISTS idx_inspection_records_year ON inspection_records(inspection_year);
CREATE INDEX IF NOT EXISTS idx_inspection_records_month ON inspection_records(inspection_month);
CREATE INDEX IF NOT EXISTS idx_inspection_records_date ON inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_records_deleted ON inspection_records(deleted_at) WHERE deleted_at IS NULL;

-- 創建唯一索引：同一地區、同一里程、同一類型、同一年份/月份只能有一筆記錄
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_records_unique 
    ON inspection_records(region_code, mileage, inspection_type, inspection_year, COALESCE(inspection_month, 0)) 
    WHERE deleted_at IS NULL;

-- 添加註釋
COMMENT ON TABLE inspection_records IS '巡查紀錄表，用於存儲例行巡查和特別巡查的數據';
COMMENT ON COLUMN inspection_records.record_id IS '巡查紀錄唯一識別碼';
COMMENT ON COLUMN inspection_records.region_id IS '所屬預警地區ID';
COMMENT ON COLUMN inspection_records.region_code IS '地區代碼（如：台7線）';
COMMENT ON COLUMN inspection_records.mileage IS '里程數';
COMMENT ON COLUMN inspection_records.inspection_type IS '巡查類型（routine: 例行巡查, special: 特別巡查）';
COMMENT ON COLUMN inspection_records.inspection_year IS '巡查年份';
COMMENT ON COLUMN inspection_records.inspection_month IS '巡查月份（1-12，僅例行巡查使用）';
COMMENT ON COLUMN inspection_records.inspection_data IS '巡查詳細數據（JSON格式）';

