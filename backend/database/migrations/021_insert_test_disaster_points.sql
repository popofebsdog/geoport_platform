-- 插入測試災點紀錄數據
-- 需要先有子專案數據，這裡使用第一個子專案的 project_id

-- 獲取第一個子專案的 project_id（假設有子專案）
DO $$
DECLARE
    test_project_id UUID;
    test_disaster_point_id_1 UUID;
    test_disaster_point_id_2 UUID;
    test_disaster_point_id_3 UUID;
BEGIN
    -- 獲取第一個子專案（非父專案）
    SELECT project_id INTO test_project_id
    FROM projects
    WHERE parent_project_id IS NOT NULL
      AND deleted_at IS NULL
    LIMIT 1;

    -- 如果沒有子專案，創建一個測試子專案
    IF test_project_id IS NULL THEN
        -- 先獲取或創建一個父專案
        INSERT INTO projects (
            name,
            description,
            is_parent,
            location_geometry,
            latitude,
            longitude
        )
        SELECT 
            '測試母專案',
            '用於測試災點紀錄的母專案',
            true,
            ST_SetSRID(ST_MakePoint(121.4087, 24.6757), 4326),
            24.6757,
            121.4087
        WHERE NOT EXISTS (
            SELECT 1 FROM projects WHERE name = '測試母專案' AND deleted_at IS NULL
        )
        RETURNING project_id INTO test_project_id;

        -- 創建測試子專案
        INSERT INTO projects (
            name,
            description,
            parent_project_id,
            is_parent,
            location_geometry,
            latitude,
            longitude,
            event_date
        )
        VALUES (
            '測試子專案 - 2024年調查',
            '用於測試災點紀錄的子專案',
            test_project_id,
            false,
            ST_SetSRID(ST_MakePoint(121.4087, 24.6757), 4326),
            24.6757,
            121.4087,
            CURRENT_DATE
        )
        RETURNING project_id INTO test_project_id;
    END IF;

    -- 確保 test_project_id 不為空
    IF test_project_id IS NULL THEN
        RAISE EXCEPTION '無法找到或創建測試專案';
    END IF;

    -- 插入測試災點紀錄 1
    INSERT INTO disaster_points (
        project_id,
        name,
        description,
        latitude,
        longitude,
        location_geometry,
        metadata
    )
    VALUES (
        test_project_id,
        '災點 A - 邊坡滑動',
        '位於道路邊坡的滑動區域，有明顯的裂縫和位移跡象。建議進行監測和加固工程。',
        24.6757,
        121.4087,
        ST_SetSRID(ST_MakePoint(121.4087, 24.6757), 4326),
        jsonb_build_object(
            'priority', 'high',
            'severity', 'medium',
            'project_id', test_project_id::text
        )
    )
    RETURNING disaster_point_id INTO test_disaster_point_id_1;

    -- 插入測試災點紀錄 2
    INSERT INTO disaster_points (
        project_id,
        name,
        description,
        latitude,
        longitude,
        location_geometry,
        metadata
    )
    VALUES (
        test_project_id,
        '災點 B - 土石流潛勢',
        '河道上游的土石流潛勢區域，雨季時需特別注意。已設置監測設備。',
        24.6760,
        121.4090,
        ST_SetSRID(ST_MakePoint(121.4090, 24.6760), 4326),
        jsonb_build_object(
            'priority', 'medium',
            'severity', 'low',
            'project_id', test_project_id::text
        )
    )
    RETURNING disaster_point_id INTO test_disaster_point_id_2;

    -- 插入測試災點紀錄 3
    INSERT INTO disaster_points (
        project_id,
        name,
        description,
        latitude,
        longitude,
        location_geometry,
        metadata
    )
    VALUES (
        test_project_id,
        '災點 C - 道路崩塌',
        '道路邊坡發生崩塌，影響交通。已進行緊急處理，需持續監控。',
        24.6754,
        121.4084,
        ST_SetSRID(ST_MakePoint(121.4084, 24.6754), 4326),
        jsonb_build_object(
            'priority', 'high',
            'severity', 'high',
            'project_id', test_project_id::text
        )
    )
    RETURNING disaster_point_id INTO test_disaster_point_id_3;

    RAISE NOTICE '已插入測試災點紀錄到專案: %', test_project_id;
    RAISE NOTICE '災點 1 ID: %', test_disaster_point_id_1;
    RAISE NOTICE '災點 2 ID: %', test_disaster_point_id_2;
    RAISE NOTICE '災點 3 ID: %', test_disaster_point_id_3;

END $$;

