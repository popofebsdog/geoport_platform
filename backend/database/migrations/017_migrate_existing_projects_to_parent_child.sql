-- 遷移現有專案為母子專案結構
-- 創建時間: 2025-01-XX
-- 
-- 策略：
-- 1. 根據地理位置（location_name + road_number）分組現有專案
-- 2. 為每個組創建一個母專案（地點）
-- 3. 將原專案轉換為子專案（時期），關聯到對應的母專案

BEGIN;

-- 臨時表：存儲地理位置組合和對應的母專案ID
CREATE TEMP TABLE IF NOT EXISTS location_groups AS
SELECT DISTINCT
    location_name,
    road_number,
    road_section,
    road_type,
    ST_AsText(location_geometry) as location_wkt,
    ST_X(location_geometry::geometry) as longitude,
    ST_Y(location_geometry::geometry) as latitude,
    array_agg(DISTINCT project_id) as project_ids
FROM projects
WHERE deleted_at IS NULL
    AND location_geometry IS NOT NULL
    AND (location_name IS NOT NULL OR road_number IS NOT NULL)
GROUP BY location_name, road_number, road_section, road_type, location_geometry;

-- 為每個地理位置組合創建母專案
DO $$
DECLARE
    location_rec RECORD;
    parent_id UUID;
    project_ids UUID[];
    project_name TEXT;
BEGIN
    FOR location_rec IN SELECT * FROM location_groups LOOP
        -- 生成母專案名稱（優先使用 location_name，否則使用 road_number）
        IF location_rec.location_name IS NOT NULL AND location_rec.location_name != '' THEN
            project_name := location_rec.location_name;
            IF location_rec.road_number IS NOT NULL THEN
                project_name := project_name || ' ' || location_rec.road_number;
            END IF;
            IF location_rec.road_section IS NOT NULL THEN
                project_name := project_name || ' ' || location_rec.road_section;
            END IF;
        ELSIF location_rec.road_number IS NOT NULL THEN
            project_name := location_rec.road_number;
            IF location_rec.road_section IS NOT NULL THEN
                project_name := project_name || ' ' || location_rec.road_section;
            END IF;
        ELSE
            project_name := '地點專案_' || gen_random_uuid()::text;
        END IF;

        -- 創建母專案
        INSERT INTO projects (
            project_id,
            name,
            description,
            location_name,
            location_geometry,
            road_type,
            road_number,
            road_section,
            is_parent,
            status,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            project_name,
            '由現有專案自動遷移產生的地點專案',
            location_rec.location_name,
            ST_GeomFromText(location_rec.location_wkt, 4326),
            location_rec.road_type,
            location_rec.road_number,
            location_rec.road_section,
            FALSE,  -- 使用 FALSE，因為觸發器會自動設置
            'active',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING project_id INTO parent_id;

        -- 更新該組內的所有專案，設置為子專案
        project_ids := location_rec.project_ids;
        FOR i IN 1..array_length(project_ids, 1) LOOP
            UPDATE projects
            SET 
                parent_project_id = parent_id,
                is_parent = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = project_ids[i]
                AND deleted_at IS NULL;
        END LOOP;

        RAISE NOTICE '已創建母專案: % (ID: %), 關聯 % 個子專案', project_name, parent_id, array_length(project_ids, 1);
    END LOOP;
END $$;

-- 處理沒有地理位置但有名稱和道路資訊的專案
DO $$
DECLARE
    project_rec RECORD;
    parent_id UUID;
    project_name TEXT;
    parent_exists BOOLEAN;
BEGIN
    FOR project_rec IN 
        SELECT DISTINCT ON (road_number, road_section, road_type)
            project_id,
            name,
            location_name,
            road_number,
            road_section,
            road_type,
            start_date,
            end_date,
            description,
            status,
            priority,
            tags,
            is_bookmarked,
            created_at
        FROM projects
        WHERE deleted_at IS NULL
            AND location_geometry IS NULL
            AND road_number IS NOT NULL
            AND parent_project_id IS NULL
        ORDER BY road_number, road_section, road_type, created_at
    LOOP
        -- 檢查是否已存在對應的母專案
        SELECT EXISTS(
            SELECT 1 FROM projects
            WHERE deleted_at IS NULL
                AND is_parent = TRUE
                AND road_number = project_rec.road_number
                AND (road_section = project_rec.road_section OR (road_section IS NULL AND project_rec.road_section IS NULL))
                AND (road_type = project_rec.road_type OR (road_type IS NULL AND project_rec.road_type IS NULL))
        ) INTO parent_exists;

        IF NOT parent_exists THEN
            -- 創建母專案
            project_name := COALESCE(project_rec.location_name, project_rec.road_number);
            IF project_rec.road_section IS NOT NULL THEN
                project_name := project_name || ' ' || project_rec.road_section;
            END IF;

            INSERT INTO projects (
                project_id,
                name,
                description,
                location_name,
                road_type,
                road_number,
                road_section,
                is_parent,
                status,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                project_name,
                '由現有專案自動遷移產生的地點專案',
                project_rec.location_name,
                project_rec.road_type,
                project_rec.road_number,
                project_rec.road_section,
                FALSE,
                'active',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING project_id INTO parent_id;

            RAISE NOTICE '已創建無座標母專案: % (ID: %)', project_name, parent_id;
        ELSE
            -- 找到已存在的母專案
            SELECT project_id INTO parent_id
            FROM projects
            WHERE deleted_at IS NULL
                AND is_parent = TRUE
                AND road_number = project_rec.road_number
                AND (road_section = project_rec.road_section OR (road_section IS NULL AND project_rec.road_section IS NULL))
                AND (road_type = project_rec.road_type OR (road_type IS NULL AND project_rec.road_type IS NULL))
            LIMIT 1;
        END IF;

        -- 將當前專案設置為子專案
        UPDATE projects
        SET 
            parent_project_id = parent_id,
            is_parent = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = project_rec.project_id
            AND deleted_at IS NULL;

        RAISE NOTICE '已將專案 % 關聯到母專案 %', project_rec.name, parent_id;
    END LOOP;
END $$;

-- 處理完全沒有地理位置資訊的專案（單獨創建母專案）
DO $$
DECLARE
    project_rec RECORD;
    parent_id UUID;
BEGIN
    FOR project_rec IN 
        SELECT project_id, name, description, status, created_at
        FROM projects
        WHERE deleted_at IS NULL
            AND location_geometry IS NULL
            AND location_name IS NULL
            AND road_number IS NULL
            AND parent_project_id IS NULL
    LOOP
        -- 為每個專案創建一個單獨的母專案
        INSERT INTO projects (
            project_id,
            name,
            description,
            is_parent,
            status,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            project_rec.name || ' (地點)',
            COALESCE(project_rec.description, '由現有專案自動遷移產生的地點專案'),
            FALSE,
            project_rec.status,
            project_rec.created_at,
            CURRENT_TIMESTAMP
        )
        RETURNING project_id INTO parent_id;

        -- 將原專案設置為子專案
        UPDATE projects
        SET 
            parent_project_id = parent_id,
            is_parent = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = project_rec.project_id;

        RAISE NOTICE '已為專案 % 創建單獨的母專案 %', project_rec.name, parent_id;
    END LOOP;
END $$;

-- 清理臨時表
DROP TABLE IF EXISTS location_groups;

-- 顯示遷移結果統計
DO $$
DECLARE
    parent_count INTEGER;
    child_count INTEGER;
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO parent_count
    FROM projects
    WHERE deleted_at IS NULL AND is_parent = TRUE;

    SELECT COUNT(*) INTO child_count
    FROM projects
    WHERE deleted_at IS NULL AND parent_project_id IS NOT NULL;

    SELECT COUNT(*) INTO orphan_count
    FROM projects
    WHERE deleted_at IS NULL 
        AND parent_project_id IS NULL 
        AND is_parent = FALSE;

    RAISE NOTICE '=== 遷移完成統計 ===';
    RAISE NOTICE '母專案數量: %', parent_count;
    RAISE NOTICE '子專案數量: %', child_count;
    RAISE NOTICE '未關聯專案數量: %', orphan_count;
END $$;

COMMIT;

-- 驗證遷移結果
SELECT 
    '遷移驗證' as check_type,
    COUNT(*) FILTER (WHERE is_parent = TRUE) as parent_count,
    COUNT(*) FILTER (WHERE parent_project_id IS NOT NULL) as child_count,
    COUNT(*) FILTER (WHERE parent_project_id IS NULL AND is_parent = FALSE) as orphan_count
FROM projects
WHERE deleted_at IS NULL;

