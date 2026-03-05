-- 遷移腳本：將子專案的 start_date 複製到 event_date
-- 創建時間: 2025-01-XX
-- 目的：將現有子專案的時間起迄改為使用重要事件日期

-- 更新子專案：如果 event_date 為 NULL 但 start_date 不為 NULL，則將 start_date 複製到 event_date
UPDATE projects
SET 
  event_date = start_date,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  parent_project_id IS NOT NULL  -- 只更新子專案
  AND event_date IS NULL          -- event_date 為空
  AND start_date IS NOT NULL;     -- 但 start_date 有值

-- 顯示更新結果
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM projects
  WHERE parent_project_id IS NOT NULL 
    AND event_date IS NOT NULL;
  
  RAISE NOTICE '已更新子專案數量：%', (
    SELECT COUNT(*) 
    FROM projects 
    WHERE parent_project_id IS NOT NULL 
      AND event_date IS NOT NULL
      AND updated_at >= CURRENT_DATE
  );
  
  RAISE NOTICE '總共擁有 event_date 的子專案數量：%', updated_count;
END $$;

-- 顯示仍使用 start_date/end_date 的子專案（如果有）
SELECT 
  project_id,
  name,
  start_date,
  end_date,
  event_date,
  created_at
FROM projects
WHERE 
  parent_project_id IS NOT NULL
  AND (start_date IS NOT NULL OR end_date IS NOT NULL)
  AND (event_date IS NULL OR event_date != start_date)
ORDER BY created_at DESC
LIMIT 10;

