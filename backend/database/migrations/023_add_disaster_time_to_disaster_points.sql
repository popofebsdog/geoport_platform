-- 在災點紀錄表中添加災害時間欄位
-- 創建時間: 2025-11-05

-- 添加災害時間欄位
ALTER TABLE disaster_points 
ADD COLUMN IF NOT EXISTS disaster_time TIMESTAMP WITH TIME ZONE;

-- 添加註釋
COMMENT ON COLUMN disaster_points.disaster_time IS '災害發生時間';

-- 添加索引以便於查詢和排序
CREATE INDEX IF NOT EXISTS idx_disaster_points_disaster_time ON disaster_points(disaster_time);

