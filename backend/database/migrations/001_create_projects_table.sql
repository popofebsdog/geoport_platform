-- 創建 projects 表
-- 對應「事件專案資料夾」概念
-- 創建時間: 2025-09-24

-- 創建 projects 表
CREATE TABLE IF NOT EXISTS projects (
    -- 主鍵
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本資訊
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 專案分類
    project_type VARCHAR(100) DEFAULT 'disaster', -- disaster, monitoring, research, etc.
    category VARCHAR(100), -- 災害類型、監測類型等
    
    -- 地理位置資訊
    location_name VARCHAR(255), -- 地點名稱
    location_geometry GEOMETRY(POINT, 4326), -- 主要位置座標 (WGS84)
    location_description TEXT, -- 位置描述
    
    -- 道路資訊
    road_type VARCHAR(50), -- highway, national, railway
    road_number VARCHAR(100), -- 道路編號 (如: 台7線, 國道1號)
    road_section VARCHAR(255), -- 路段描述 (如: 49.8K)
    
    -- 時間資訊
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    event_date TIMESTAMP WITH TIME ZONE, -- 事件發生時間
    
    -- 狀態管理
    status project_status_enum DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- 權限控制
    owner_id UUID, -- 專案負責人
    is_public BOOLEAN DEFAULT FALSE, -- 是否公開
    access_level VARCHAR(20) DEFAULT 'private', -- private, team, public
    
    -- 標記和分類
    tags TEXT[], -- 標籤陣列
    is_bookmarked BOOLEAN DEFAULT FALSE,
    
    -- 統計資訊
    file_count INTEGER DEFAULT 0, -- 檔案數量
    total_size BIGINT DEFAULT 0, -- 總檔案大小 (bytes)
    layer_count INTEGER DEFAULT 0, -- 圖層數量
    
    -- 元數據
    metadata JSONB, -- 額外的元數據
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除
    
    -- 約束條件
    CONSTRAINT chk_projects_name_length CHECK (LENGTH(name) >= 2),
    CONSTRAINT chk_projects_end_after_start CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_projects_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_projects_access_level CHECK (access_level IN ('private', 'team', 'public')),
    CONSTRAINT chk_projects_road_type CHECK (road_type IN ('highway', 'national', 'railway', 'other'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects USING gin(to_tsvector('chinese', name));
CREATE INDEX IF NOT EXISTS idx_projects_description ON projects USING gin(to_tsvector('chinese', description));
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_location_geometry ON projects USING gist(location_geometry) WHERE location_geometry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_road_info ON projects(road_type, road_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING gin(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_metadata ON projects USING gin(metadata) WHERE metadata IS NOT NULL;

-- 創建觸發器：自動更新 updated_at
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：軟刪除
CREATE OR REPLACE FUNCTION soft_delete_project()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- 更新相關的檔案和圖層狀態
        UPDATE data_files SET deleted_at = NEW.deleted_at WHERE project_id = NEW.project_id;
        UPDATE spatial_layers SET deleted_at = NEW.deleted_at WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_soft_delete
    AFTER UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_project();

-- 創建視圖：活躍專案
CREATE OR REPLACE VIEW active_projects AS
SELECT 
    project_id,
    name,
    description,
    project_type,
    category,
    location_name,
    location_geometry,
    road_type,
    road_number,
    road_section,
    start_date,
    end_date,
    event_date,
    status,
    priority,
    owner_id,
    is_public,
    access_level,
    tags,
    is_bookmarked,
    file_count,
    total_size,
    layer_count,
    created_at,
    updated_at
FROM projects 
WHERE deleted_at IS NULL;

-- 創建視圖：專案統計
CREATE OR REPLACE VIEW project_statistics AS
SELECT 
    p.project_id,
    p.name,
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

-- 添加註釋
COMMENT ON TABLE projects IS '專案/事件資料表，對應事件專案資料夾概念';
COMMENT ON COLUMN projects.project_id IS '專案唯一識別碼';
COMMENT ON COLUMN projects.name IS '專案名稱';
COMMENT ON COLUMN projects.description IS '專案描述';
COMMENT ON COLUMN projects.project_type IS '專案類型 (disaster, monitoring, research)';
COMMENT ON COLUMN projects.category IS '專案分類/災害類型';
COMMENT ON COLUMN projects.location_geometry IS '專案主要位置座標 (WGS84)';
COMMENT ON COLUMN projects.road_type IS '道路類型 (highway, national, railway)';
COMMENT ON COLUMN projects.road_number IS '道路編號';
COMMENT ON COLUMN projects.road_section IS '路段描述';
COMMENT ON COLUMN projects.status IS '專案狀態';
COMMENT ON COLUMN projects.priority IS '專案優先級';
COMMENT ON COLUMN projects.owner_id IS '專案負責人ID';
COMMENT ON COLUMN projects.is_public IS '是否公開';
COMMENT ON COLUMN projects.access_level IS '存取權限等級';
COMMENT ON COLUMN projects.tags IS '標籤陣列';
COMMENT ON COLUMN projects.is_bookmarked IS '是否已標記';
COMMENT ON COLUMN projects.file_count IS '檔案數量統計';
COMMENT ON COLUMN projects.total_size IS '總檔案大小 (bytes)';
COMMENT ON COLUMN projects.layer_count IS '圖層數量統計';
COMMENT ON COLUMN projects.metadata IS '額外的元數據 (JSON)';
COMMENT ON COLUMN projects.deleted_at IS '軟刪除時間戳記';

COMMENT ON VIEW active_projects IS '活躍專案視圖 (排除已刪除)';
COMMENT ON VIEW project_statistics IS '專案統計資訊視圖';
