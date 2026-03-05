-- 將點位顏色配置表的預設值改為綠色
-- 創建時間: 2025-01-XX

-- 更新表的預設值
ALTER TABLE warning_region_point_colors 
ALTER COLUMN point_color SET DEFAULT 'green';

-- 更新現有記錄中沒有設置顏色的點位為綠色（如果原本是 NULL 或 'red' 且沒有被明確設置過）
-- 注意：這裡只更新那些可能因為舊預設值而設置為 'red' 的記錄
-- 如果用戶已經明確設置過顏色，則不更新
UPDATE warning_region_point_colors
SET point_color = 'green'
WHERE point_color = 'red' 
  AND deleted_at IS NULL
  AND updated_at = created_at; -- 只更新那些從未被修改過的記錄（即使用預設值創建的）

-- 添加註釋
COMMENT ON COLUMN warning_region_point_colors.point_color IS '點位顏色：red, yellow, green（預設為綠色）';

