-- GeoPort 災情資料搜集系統 - 資料庫初始化腳本
-- PostgreSQL 版本
-- 創建時間: 2025-09-24

-- 創建資料庫（如果不存在）
-- CREATE DATABASE geoport_db;

-- 連接到資料庫
-- \c geoport_db;

-- 啟用 PostGIS 擴展（用於空間資料處理）
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- 創建自定義類型
DO $$ BEGIN
    CREATE TYPE file_type_enum AS ENUM (
        'raster',      -- 柵格資料 (DEM, 影像等)
        'vector',      -- 向量資料 (Shapefile, GeoJSON等)
        'csv',         -- CSV 表格資料
        'lidar',       -- LiDAR 點雲資料
        'report',      -- 報告文件
        'image',       -- 影像資料
        'document',    -- 其他文件
        'other'        -- 其他類型
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE geometry_type_enum AS ENUM (
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'Raster',
        'Collection'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'admin',       -- 系統管理員
        'editor',      -- 編輯者
        'viewer'       -- 查看者
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status_enum AS ENUM (
        'active',      -- 進行中
        'completed',   -- 已完成
        'archived',    -- 已封存
        'draft'        -- 草稿
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 設置時區
SET timezone = 'Asia/Taipei';

-- 創建函數：自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 創建函數：生成 UUID
CREATE OR REPLACE FUNCTION generate_ulid()
RETURNS TEXT AS $$
DECLARE
    timestamp_part TEXT;
    random_part TEXT;
    result TEXT;
BEGIN
    -- 生成時間戳部分 (10 個字符)
    timestamp_part := LPAD(TO_CHAR(EXTRACT(EPOCH FROM NOW()) * 1000, 'FM999999999999999999'), 10, '0');
    
    -- 生成隨機部分 (16 個字符)
    random_part := LPAD(TO_CHAR(FLOOR(RANDOM() * 10000000000000000), 'FM999999999999999999'), 16, '0');
    
    -- 組合結果
    result := timestamp_part || random_part;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 創建函數：驗證座標系統
CREATE OR REPLACE FUNCTION validate_srid(srid_value INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- 檢查是否為有效的 SRID
    IF srid_value IN (4326, 3826, 3827, 3828, 3857, 900913) THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 創建函數：計算檔案大小
CREATE OR REPLACE FUNCTION format_file_size(size_bytes BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF size_bytes < 1024 THEN
        RETURN size_bytes || ' B';
    ELSIF size_bytes < 1024^2 THEN
        RETURN ROUND(size_bytes / 1024.0, 2) || ' KB';
    ELSIF size_bytes < 1024^3 THEN
        RETURN ROUND(size_bytes / (1024.0^2), 2) || ' MB';
    ELSE
        RETURN ROUND(size_bytes / (1024.0^3), 2) || ' GB';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 創建註釋
COMMENT ON DATABASE geoport_db IS 'GeoPort 災情資料搜集系統資料庫';
COMMENT ON EXTENSION postgis IS 'PostGIS 空間資料處理擴展';
COMMENT ON FUNCTION update_updated_at_column() IS '自動更新 updated_at 欄位的觸發器函數';
COMMENT ON FUNCTION generate_ulid() IS '生成 ULID 格式的唯一識別碼';
COMMENT ON FUNCTION validate_srid(INTEGER) IS '驗證空間座標系統代碼';
COMMENT ON FUNCTION format_file_size(BIGINT) IS '格式化檔案大小顯示';
