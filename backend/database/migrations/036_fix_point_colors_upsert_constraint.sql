-- 修复点位颜色配置表的 UPSERT 约束问题
-- 删除部分唯一索引，改用完整的唯一约束
-- 创建时间: 2025-11-18

-- 删除旧的部分唯一索引
DROP INDEX IF EXISTS idx_warning_region_point_colors_unique;

-- 创建新的唯一约束（不使用 WHERE 条件）
-- 注意：这个约束会防止同一地区的同一坐标有多个配置（包括已删除的）
-- 但由于我们使用软删除，这是可以接受的
ALTER TABLE warning_region_point_colors
ADD CONSTRAINT unique_region_location 
UNIQUE (region_id, longitude, latitude);

-- 添加注释
COMMENT ON CONSTRAINT unique_region_location ON warning_region_point_colors IS '确保同一地区的同一坐标只有一个点位颜色配置';

