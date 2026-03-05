-- 創建潛勢評估數據表
-- 創建時間: 2025-01-27

-- 創建潛勢評估數據表
CREATE TABLE IF NOT EXISTS potential_analysis_data (
    -- 主鍵
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 關聯到 data_files
    file_id UUID NOT NULL REFERENCES data_files(file_id) ON DELETE CASCADE,
    
    -- 數值數據
    value_field VARCHAR(100) NOT NULL, -- 數值欄位名稱
    min_value DECIMAL(15,6), -- 最小值
    max_value DECIMAL(15,6), -- 最大值
    mean_value DECIMAL(15,6), -- 平均值
    std_deviation DECIMAL(15,6), -- 標準差
    
    -- 區間設定
    interval_count INTEGER DEFAULT 5, -- 區間數量
    interval_type VARCHAR(20) DEFAULT 'equal', -- equal(等距), quantile(分位數), custom(自定義)
    intervals JSONB, -- 區間定義 [{"min": 0, "max": 10, "color": "#0000FF", "label": "低風險"}]
    
    -- 顏色映射
    color_scheme VARCHAR(50) DEFAULT 'blue-red', -- 顏色方案
    custom_colors JSONB, -- 自定義顏色
    
    -- 處理狀態
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_log TEXT, -- 處理日誌
    error_message TEXT, -- 錯誤訊息
    
    -- 統計資訊
    feature_count INTEGER, -- 特徵數量
    processed_at TIMESTAMP WITH TIME ZONE, -- 處理完成時間
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 約束條件
    CONSTRAINT chk_potential_analysis_interval_count CHECK (interval_count > 0 AND interval_count <= 20),
    CONSTRAINT chk_potential_analysis_interval_type CHECK (interval_type IN ('equal', 'quantile', 'custom')),
    CONSTRAINT chk_potential_analysis_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_potential_analysis_min_max CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_potential_analysis_file_id ON potential_analysis_data(file_id);
CREATE INDEX IF NOT EXISTS idx_potential_analysis_processing_status ON potential_analysis_data(processing_status);
CREATE INDEX IF NOT EXISTS idx_potential_analysis_value_field ON potential_analysis_data(value_field);

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_potential_analysis_updated_at
    BEFORE UPDATE ON potential_analysis_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加註釋
COMMENT ON TABLE potential_analysis_data IS '潛勢評估數據表，存儲數值區間和顏色映射設定';
COMMENT ON COLUMN potential_analysis_data.analysis_id IS '分析唯一識別碼';
COMMENT ON COLUMN potential_analysis_data.file_id IS '關聯的檔案ID';
COMMENT ON COLUMN potential_analysis_data.value_field IS '數值欄位名稱';
COMMENT ON COLUMN potential_analysis_data.min_value IS '數值最小值';
COMMENT ON COLUMN potential_analysis_data.max_value IS '數值最大值';
COMMENT ON COLUMN potential_analysis_data.mean_value IS '數值平均值';
COMMENT ON COLUMN potential_analysis_data.std_deviation IS '數值標準差';
COMMENT ON COLUMN potential_analysis_data.interval_count IS '區間數量';
COMMENT ON COLUMN potential_analysis_data.interval_type IS '區間類型：equal(等距), quantile(分位數), custom(自定義)';
COMMENT ON COLUMN potential_analysis_data.intervals IS '區間定義JSON';
COMMENT ON COLUMN potential_analysis_data.color_scheme IS '顏色方案';
COMMENT ON COLUMN potential_analysis_data.custom_colors IS '自定義顏色JSON';
COMMENT ON COLUMN potential_analysis_data.processing_status IS '處理狀態';
COMMENT ON COLUMN potential_analysis_data.feature_count IS '特徵數量';
