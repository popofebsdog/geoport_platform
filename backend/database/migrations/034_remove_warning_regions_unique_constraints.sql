-- 移除 warning_regions 表的 UNIQUE 约束
-- 允许创建相同地区代码和名称的多个独立项目
-- 创建时间: 2025-01-XX

-- 移除 region_code 的 UNIQUE 约束
ALTER TABLE warning_regions 
DROP CONSTRAINT IF EXISTS warning_regions_region_code_key;

-- 移除 region_name 的 UNIQUE 约束
ALTER TABLE warning_regions 
DROP CONSTRAINT IF EXISTS warning_regions_region_name_key;

-- 添加注释
COMMENT ON COLUMN warning_regions.region_code IS '地區代碼（允許重複，用於創建多個獨立項目）';
COMMENT ON COLUMN warning_regions.region_name IS '地區名稱（允許重複，用於創建多個獨立項目）';

