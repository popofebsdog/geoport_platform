-- 修改 warning_region_point_colors 表的 road_section 列为可为空
-- 因为在某些情况下，road_section 可能不可用
-- 創建時間: 2025-01-XX

-- 移除 road_section 的 NOT NULL 約束
ALTER TABLE warning_region_point_colors 
ALTER COLUMN road_section DROP NOT NULL;

-- 添加註釋
COMMENT ON COLUMN warning_region_point_colors.road_section IS '路線名稱（如：台7線），可為空';

