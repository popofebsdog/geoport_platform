-- 添加母子專案支援
-- 母專案代表地點，子專案代表時間
-- 創建時間: 2025-11-03

-- 1. 添加 parent_project_id 欄位
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE;

-- 2. 添加 is_parent 欄位標記是否為母專案
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

-- 3. 添加子專案計數欄位
ALTER TABLE projects ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0;

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_is_parent ON projects(is_parent) WHERE deleted_at IS NULL AND is_parent = TRUE;

-- 5. 添加約束：防止循環引用和過深層級
ALTER TABLE projects ADD CONSTRAINT chk_projects_no_self_reference 
  CHECK (parent_project_id IS NULL OR parent_project_id != project_id);

-- 6. 創建觸發器：自動更新 is_parent 標記和子專案計數
CREATE OR REPLACE FUNCTION update_parent_project_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果是新增或更新子專案
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.parent_project_id IS NOT NULL THEN
    -- 標記父專案為母專案
    UPDATE projects 
    SET is_parent = TRUE,
        child_count = (
          SELECT COUNT(*) 
          FROM projects 
          WHERE parent_project_id = NEW.parent_project_id 
            AND deleted_at IS NULL
        )
    WHERE project_id = NEW.parent_project_id;
  END IF;
  
  -- 如果是刪除子專案
  IF TG_OP = 'DELETE' AND OLD.parent_project_id IS NOT NULL THEN
    UPDATE projects 
    SET child_count = (
      SELECT COUNT(*) 
      FROM projects 
      WHERE parent_project_id = OLD.parent_project_id 
        AND deleted_at IS NULL
    )
    WHERE project_id = OLD.parent_project_id;
    
    -- 如果沒有子專案了，取消母專案標記
    UPDATE projects 
    SET is_parent = FALSE 
    WHERE project_id = OLD.parent_project_id 
      AND child_count = 0;
  END IF;
  
  -- 如果更改了 parent_project_id
  IF TG_OP = 'UPDATE' AND OLD.parent_project_id IS DISTINCT FROM NEW.parent_project_id THEN
    -- 更新舊父專案
    IF OLD.parent_project_id IS NOT NULL THEN
      UPDATE projects 
      SET child_count = (
        SELECT COUNT(*) 
        FROM projects 
        WHERE parent_project_id = OLD.parent_project_id 
          AND deleted_at IS NULL
      )
      WHERE project_id = OLD.parent_project_id;
      
      UPDATE projects 
      SET is_parent = FALSE 
      WHERE project_id = OLD.parent_project_id 
        AND child_count = 0;
    END IF;
    
    -- 更新新父專案
    IF NEW.parent_project_id IS NOT NULL THEN
      UPDATE projects 
      SET is_parent = TRUE,
          child_count = (
            SELECT COUNT(*) 
            FROM projects 
            WHERE parent_project_id = NEW.parent_project_id 
              AND deleted_at IS NULL
          )
      WHERE project_id = NEW.parent_project_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_update_parent_project_status ON projects;
CREATE TRIGGER trigger_update_parent_project_status
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_project_status();

-- 7. 創建視圖：母專案列表
CREATE OR REPLACE VIEW parent_projects AS
SELECT 
  p.project_id,
  p.name,
  p.description,
  p.location_name,
  p.location_geometry,
  p.road_type,
  p.road_number,
  p.road_section,
  p.child_count,
  p.status,
  p.created_at,
  p.updated_at,
  -- 聚合子專案的時間範圍
  MIN(c.start_date) as earliest_start_date,
  MAX(c.end_date) as latest_end_date,
  -- 聚合統計
  COALESCE(SUM(c.file_count), 0) as total_file_count,
  COALESCE(SUM(c.total_size), 0) as total_size,
  COALESCE(SUM(c.layer_count), 0) as total_layer_count
FROM projects p
LEFT JOIN projects c ON c.parent_project_id = p.project_id AND c.deleted_at IS NULL
WHERE p.is_parent = TRUE 
  AND p.deleted_at IS NULL
GROUP BY p.project_id, p.name, p.description, p.location_name, p.location_geometry, 
         p.road_type, p.road_number, p.road_section, p.child_count, p.status, 
         p.created_at, p.updated_at;

-- 8. 創建視圖：子專案列表（包含母專案資訊）
CREATE OR REPLACE VIEW child_projects_with_parent AS
SELECT 
  c.project_id,
  c.name,
  c.description,
  c.parent_project_id,
  p.name as parent_name,
  p.location_name as parent_location_name,
  p.road_type as parent_road_type,
  p.road_number as parent_road_number,
  p.road_section as parent_road_section,
  c.start_date,
  c.end_date,
  c.status,
  c.file_count,
  c.total_size,
  c.layer_count,
  c.created_at,
  c.updated_at
FROM projects c
JOIN projects p ON c.parent_project_id = p.project_id
WHERE c.parent_project_id IS NOT NULL 
  AND c.deleted_at IS NULL
  AND p.deleted_at IS NULL;

-- 9. 添加註釋
COMMENT ON COLUMN projects.parent_project_id IS '母專案ID（母專案代表地點，子專案代表時間）';
COMMENT ON COLUMN projects.is_parent IS '是否為母專案';
COMMENT ON COLUMN projects.child_count IS '子專案數量';
COMMENT ON VIEW parent_projects IS '母專案列表視圖（代表地點）';
COMMENT ON VIEW child_projects_with_parent IS '子專案列表視圖（包含母專案資訊）';

-- 10. 更新現有專案統計視圖（先刪除再重建）
DROP VIEW IF EXISTS project_statistics CASCADE;

CREATE VIEW project_statistics AS
SELECT 
  p.project_id,
  p.name,
  p.parent_project_id,
  p.is_parent,
  p.child_count,
  p.status,
  p.file_count,
  p.total_size,
  p.layer_count,
  COALESCE(df.file_count, 0) as actual_file_count,
  COALESCE(sl.layer_count, 0) as actual_layer_count,
  COALESCE(df.total_size, 0) as actual_total_size
FROM projects p
LEFT JOIN (
  SELECT 
    project_id,
    COUNT(*) as file_count,
    SUM(file_size) as total_size
  FROM data_files 
  WHERE deleted_at IS NULL
  GROUP BY project_id
) df ON p.project_id = df.project_id
LEFT JOIN (
  SELECT 
    project_id,
    COUNT(*) as layer_count
  FROM spatial_layers 
  WHERE deleted_at IS NULL
  GROUP BY project_id
) sl ON p.project_id = sl.project_id
WHERE p.deleted_at IS NULL;

