-- 創建災點紀錄表
-- 用於存儲子專案的災點紀錄資料
-- 創建時間: 2025-01-XX

CREATE TABLE IF NOT EXISTS disaster_points (
    -- 主鍵
    disaster_point_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 外鍵關聯到專案（projects 表中的專案）
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    
    -- 災點基本資訊
    name VARCHAR(255) NOT NULL, -- 災點名稱
    description TEXT, -- 災點描述
    
    -- 座標資訊 (WGS84)
    location_geometry GEOMETRY(POINT, 4326), -- PostGIS Point 幾何物件
    latitude DECIMAL(10, 7) NOT NULL, -- 緯度
    longitude DECIMAL(10, 7) NOT NULL, -- 經度
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 軟刪除時間
    
    -- 額外資訊
    metadata JSONB -- 額外的元數據
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_disaster_points_project_id ON disaster_points(project_id);
CREATE INDEX IF NOT EXISTS idx_disaster_points_created_at ON disaster_points(created_at);
CREATE INDEX IF NOT EXISTS idx_disaster_points_deleted_at ON disaster_points(deleted_at);
CREATE INDEX IF NOT EXISTS idx_disaster_points_location_geometry ON disaster_points USING GIST(location_geometry);

-- 觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_disaster_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_disaster_points_updated_at
    BEFORE UPDATE ON disaster_points
    FOR EACH ROW
    EXECUTE FUNCTION update_disaster_points_updated_at();

-- 觸發器：自動從 location_geometry 提取緯度和經度
CREATE OR REPLACE FUNCTION extract_disaster_point_lat_lng_from_geometry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_geometry IS NOT NULL THEN
        NEW.latitude = ST_Y(NEW.location_geometry);
        NEW.longitude = ST_X(NEW.location_geometry);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extract_disaster_point_lat_lng_from_geometry
    BEFORE INSERT OR UPDATE ON disaster_points
    FOR EACH ROW
    EXECUTE FUNCTION extract_disaster_point_lat_lng_from_geometry();

-- 註釋
COMMENT ON TABLE disaster_points IS '儲存災點紀錄的資料表';
COMMENT ON COLUMN disaster_points.disaster_point_id IS '災點唯一識別碼';
COMMENT ON COLUMN disaster_points.project_id IS '關聯的專案 ID';
COMMENT ON COLUMN disaster_points.name IS '災點名稱';
COMMENT ON COLUMN disaster_points.description IS '災點描述';
COMMENT ON COLUMN disaster_points.location_geometry IS 'GPS 座標 (PostGIS Point)';
COMMENT ON COLUMN disaster_points.latitude IS '緯度 (從 location_geometry 提取)';
COMMENT ON COLUMN disaster_points.longitude IS '經度 (從 location_geometry 提取)';
COMMENT ON COLUMN disaster_points.created_at IS '創建時間';
COMMENT ON COLUMN disaster_points.updated_at IS '最後更新時間';
COMMENT ON COLUMN disaster_points.deleted_at IS '軟刪除時間';
COMMENT ON COLUMN disaster_points.metadata IS '額外的元數據 (JSONB)';

