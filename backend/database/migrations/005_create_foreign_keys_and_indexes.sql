-- 創建外鍵約束和額外索引
-- 確保資料完整性和查詢效能
-- 創建時間: 2025-09-24

-- 添加外鍵約束到 projects 表
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_owner_id 
FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- 添加外鍵約束到 data_files 表
ALTER TABLE data_files 
ADD CONSTRAINT fk_data_files_uploader_id 
FOREIGN KEY (uploader_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- 添加外鍵約束到 spatial_layers 表
-- (project_id 和 source_file_id 的外鍵約束已在創建表時添加)

-- 創建額外的複合索引以提升查詢效能

-- projects 表的複合索引
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at ON projects(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON projects(owner_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_road_type_number ON projects(road_type, road_number) WHERE deleted_at IS NULL AND road_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_priority_status ON projects(priority, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_public_status ON projects(is_public, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_bookmarked ON projects(is_bookmarked) WHERE deleted_at IS NULL AND is_bookmarked = TRUE;

-- data_files 表的複合索引
CREATE INDEX IF NOT EXISTS idx_data_files_project_type ON data_files(project_id, file_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_project_status ON data_files(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_type_status ON data_files(file_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_uploader_date ON data_files(uploader_id, upload_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_processing_status ON data_files(processing_status) WHERE deleted_at IS NULL AND processing_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_data_files_validation_status ON data_files(validation_status) WHERE deleted_at IS NULL AND validation_status != 'valid';
CREATE INDEX IF NOT EXISTS idx_data_files_spatial_data ON data_files(has_spatial_data, file_type) WHERE deleted_at IS NULL AND has_spatial_data = TRUE;

-- spatial_layers 表的複合索引
CREATE INDEX IF NOT EXISTS idx_spatial_layers_project_geometry ON spatial_layers(project_id, geometry_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_project_visible ON spatial_layers(project_id, visible) WHERE deleted_at IS NULL AND visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_geometry_srid ON spatial_layers(geometry_type, srid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_processing_status ON spatial_layers(processing_status) WHERE deleted_at IS NULL AND processing_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_spatial_layers_validation_status ON spatial_layers(validation_status) WHERE deleted_at IS NULL AND validation_status != 'valid';
CREATE INDEX IF NOT EXISTS idx_spatial_layers_z_index_visible ON spatial_layers(z_index, visible) WHERE deleted_at IS NULL AND visible = TRUE;

-- users 表的複合索引
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_dept ON users(organization, department) WHERE deleted_at IS NULL AND organization IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verified_active ON users(is_verified, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at DESC) WHERE deleted_at IS NULL AND is_active = TRUE;

-- 創建全文搜尋索引
CREATE INDEX IF NOT EXISTS idx_projects_fulltext ON projects USING gin(
    to_tsvector('chinese', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(location_name, '') || ' ' || 
        COALESCE(road_number, '') || ' ' || 
        COALESCE(road_section, '')
    )
) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_data_files_fulltext ON data_files USING gin(
    to_tsvector('chinese', 
        COALESCE(file_name, '') || ' ' || 
        COALESCE(original_name, '') || ' ' || 
        COALESCE(array_to_string(tags, ' '), '') || ' ' || 
        COALESCE(array_to_string(keywords, ' '), '')
    )
) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_spatial_layers_fulltext ON spatial_layers USING gin(
    to_tsvector('chinese', 
        COALESCE(layer_name, '') || ' ' || 
        COALESCE(display_name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(array_to_string(tags, ' '), '') || ' ' || 
        COALESCE(category, '')
    )
) WHERE deleted_at IS NULL;

-- 創建空間索引 (PostGIS)
CREATE INDEX IF NOT EXISTS idx_projects_location_geom ON projects USING gist(location_geometry) WHERE location_geometry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_spatial_extent_geom ON data_files USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_spatial_extent_geom ON spatial_layers USING gist(spatial_extent) WHERE spatial_extent IS NOT NULL;

-- 創建部分索引以提升效能
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(created_at DESC) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_projects_high_priority ON projects(created_at DESC) WHERE deleted_at IS NULL AND priority IN ('high', 'urgent');
CREATE INDEX IF NOT EXISTS idx_data_files_large ON data_files(file_size DESC) WHERE deleted_at IS NULL AND file_size > 100000000; -- > 100MB
CREATE INDEX IF NOT EXISTS idx_data_files_recent ON data_files(upload_date DESC) WHERE deleted_at IS NULL AND upload_date >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_spatial_layers_visible ON spatial_layers(z_index, layer_name) WHERE deleted_at IS NULL AND visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_recent_login ON users(last_login_at DESC) WHERE deleted_at IS NULL AND last_login_at >= CURRENT_DATE - INTERVAL '7 days';

-- 創建統計資訊更新函數
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    -- 更新所有表的統計資訊
    ANALYZE projects;
    ANALYZE data_files;
    ANALYZE spatial_layers;
    ANALYZE users;
END;
$$ LANGUAGE plpgsql;

-- 創建定期清理函數
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 清理過期的會話
    UPDATE users 
    SET 
        session_token = NULL,
        session_expires_at = NULL
    WHERE session_expires_at IS NOT NULL 
      AND session_expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 創建資料完整性檢查函數
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    issue_type TEXT,
    issue_description TEXT,
    affected_count BIGINT
) AS $$
BEGIN
    -- 檢查孤兒檔案
    RETURN QUERY
    SELECT 
        'data_files'::TEXT,
        'orphaned_files'::TEXT,
        'Files without valid project'::TEXT,
        COUNT(*)::BIGINT
    FROM data_files df
    LEFT JOIN projects p ON df.project_id = p.project_id
    WHERE p.project_id IS NULL OR p.deleted_at IS NOT NULL;
    
    -- 檢查孤兒圖層
    RETURN QUERY
    SELECT 
        'spatial_layers'::TEXT,
        'orphaned_layers'::TEXT,
        'Layers without valid project'::TEXT,
        COUNT(*)::BIGINT
    FROM spatial_layers sl
    LEFT JOIN projects p ON sl.project_id = p.project_id
    WHERE p.project_id IS NULL OR p.deleted_at IS NOT NULL;
    
    -- 檢查統計不一致
    RETURN QUERY
    SELECT 
        'projects'::TEXT,
        'statistics_mismatch'::TEXT,
        'Project statistics do not match actual data'::TEXT,
        COUNT(*)::BIGINT
    FROM projects p
    WHERE p.deleted_at IS NULL
      AND (
          p.file_count != COALESCE((
              SELECT COUNT(*) 
              FROM data_files df 
              WHERE df.project_id = p.project_id AND df.deleted_at IS NULL
          ), 0)
          OR p.layer_count != COALESCE((
              SELECT COUNT(*) 
              FROM spatial_layers sl 
              WHERE sl.project_id = p.project_id AND sl.deleted_at IS NULL
          ), 0)
      );
END;
$$ LANGUAGE plpgsql;

-- 創建修復統計資訊函數
CREATE OR REPLACE FUNCTION repair_project_statistics()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    project_record RECORD;
    actual_file_count INTEGER;
    actual_layer_count INTEGER;
    actual_total_size BIGINT;
BEGIN
    -- 修復所有專案的統計資訊
    FOR project_record IN 
        SELECT project_id FROM projects WHERE deleted_at IS NULL
    LOOP
        -- 計算實際檔案統計
        SELECT 
            COUNT(*),
            SUM(file_size)
        INTO 
            actual_file_count,
            actual_total_size
        FROM data_files 
        WHERE project_id = project_record.project_id AND deleted_at IS NULL;
        
        -- 計算實際圖層統計
        SELECT COUNT(*)
        INTO actual_layer_count
        FROM spatial_layers 
        WHERE project_id = project_record.project_id AND deleted_at IS NULL;
        
        -- 更新專案統計
        UPDATE projects 
        SET 
            file_count = COALESCE(actual_file_count, 0),
            layer_count = COALESCE(actual_layer_count, 0),
            total_size = COALESCE(actual_total_size, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = project_record.project_id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 添加註釋
COMMENT ON FUNCTION update_table_statistics() IS '更新所有表的統計資訊';
COMMENT ON FUNCTION cleanup_old_sessions() IS '清理過期的用戶會話';
COMMENT ON FUNCTION check_data_integrity() IS '檢查資料完整性';
COMMENT ON FUNCTION repair_project_statistics() IS '修復專案統計資訊';

-- 創建定期維護任務的建議
/*
建議的定期維護任務：

1. 每日執行：
   - SELECT cleanup_old_sessions();
   - SELECT update_table_statistics();

2. 每週執行：
   - SELECT * FROM check_data_integrity();
   - SELECT repair_project_statistics();

3. 每月執行：
   - VACUUM ANALYZE;
   - REINDEX DATABASE geoport_db;

4. 監控查詢：
   - 檢查慢查詢日誌
   - 監控索引使用情況
   - 檢查資料庫大小增長
*/
