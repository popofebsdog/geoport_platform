-- 将巡查记录从已删除的地区迁移到活跃的地区
-- 修复灾害热力图统计数据不显示的问题
-- 创建时间: 2025-11-18

-- 背景：
-- inspection_records 表中的记录关联到已被软删除的 warning_regions
-- 导致灾害统计API无法查询到数据

-- 说明：此脚本已于 2025-11-18 执行完成
-- 已将 265 条巡查记录从旧地区 (be7ac7ab-c2ab-477a-b58a-f301e1753353)
-- 迁移到新的活跃地区 (529e7dd0-b563-4fc8-a4b3-ac9aa7d132e7)

-- 验证迁移结果
SELECT 
  '台8臨37線地区的灾害统计' as description,
  mileage,
  COUNT(*) as disaster_count
FROM inspection_records
WHERE region_id = '529e7dd0-b563-4fc8-a4b3-ac9aa7d132e7'
  AND is_disaster = true
  AND deleted_at IS NULL
GROUP BY mileage
ORDER BY mileage;

-- 迁移结果：
-- 020K+400: 6 笔灾害记录
-- 021K+200: 1 笔灾害记录
-- 021K+400: 4 笔灾害记录
-- 021K+500: 4 笔灾害记录
-- 021K+600: 4 笔灾害记录
-- 021K+900: 1 笔灾害记录
-- 总计: 20 笔灾害记录

