-- 插入測試影像紀錄數據
-- 關聯到測試災點紀錄

DO $$
DECLARE
    test_project_id UUID;
    test_disaster_point_id UUID;
BEGIN
    -- 獲取第一個災點紀錄
    SELECT dp.project_id, dp.disaster_point_id
    INTO test_project_id, test_disaster_point_id
    FROM disaster_points dp
    WHERE dp.deleted_at IS NULL
    ORDER BY dp.created_at ASC
    LIMIT 1;

    -- 如果沒有災點紀錄，先創建一個
    IF test_disaster_point_id IS NULL THEN
        -- 獲取第一個子專案
        SELECT project_id INTO test_project_id
        FROM projects
        WHERE parent_project_id IS NOT NULL
          AND deleted_at IS NULL
        LIMIT 1;

        -- 創建測試災點
        INSERT INTO disaster_points (
            project_id,
            name,
            description,
            latitude,
            longitude,
            location_geometry
        )
        VALUES (
            test_project_id,
            '測試災點',
            '用於測試影像紀錄的災點',
            24.6757,
            121.4087,
            ST_SetSRID(ST_MakePoint(121.4087, 24.6757), 4326)
        )
        RETURNING disaster_point_id INTO test_disaster_point_id;
    END IF;

    -- 插入測試影像紀錄（模擬數據，實際文件需要上傳）
    -- 注意：這裡的 storage_path 是模擬路徑，實際使用時需要上傳真實文件
    INSERT INTO image_records (
        project_id,
        media_type,
        file_name,
        original_name,
        file_extension,
        mime_type,
        file_size,
        storage_path,
        metadata
    )
    VALUES
    -- 注意：這些是測試數據，實際文件不存在，僅用於測試資料庫結構
    -- 照片 1（測試數據，實際文件不存在）
    (
        test_project_id,
        'image',
        'test-disaster-photo-1.jpg',
        '災點照片-邊坡滑動.jpg',
        'jpg',
        'image/jpeg',
        2048576, -- 2MB
        NULL, -- 設置為 NULL，因為實際文件不存在
        jsonb_build_object(
            'disaster_point_id', test_disaster_point_id::text,
            'uploaded_at', CURRENT_TIMESTAMP,
            'description', '邊坡滑動區域的現場照片',
            'is_test_data', true
        )
    ),
    -- 照片 2（測試數據，實際文件不存在）
    (
        test_project_id,
        'image',
        'test-disaster-photo-2.jpg',
        '災點照片-裂縫細節.jpg',
        'jpg',
        'image/jpeg',
        1536000, -- 1.5MB
        NULL, -- 設置為 NULL，因為實際文件不存在
        jsonb_build_object(
            'disaster_point_id', test_disaster_point_id::text,
            'uploaded_at', CURRENT_TIMESTAMP,
            'description', '邊坡裂縫的細節照片',
            'is_test_data', true
        )
    ),
    -- 影片 1（測試數據，實際文件不存在）
    (
        test_project_id,
        'video',
        'test-disaster-video-1.mp4',
        '災點影片-現場勘察.mp4',
        'mp4',
        'video/mp4',
        15728640, -- 15MB
        NULL, -- 設置為 NULL，因為實際文件不存在
        jsonb_build_object(
            'disaster_point_id', test_disaster_point_id::text,
            'uploaded_at', CURRENT_TIMESTAMP,
            'description', '現場勘察的影片紀錄',
            'duration', 120,
            'width', 1920,
            'height', 1080,
            'is_test_data', true
        )
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '已插入測試影像紀錄到災點: %', test_disaster_point_id;
    RAISE NOTICE '專案 ID: %', test_project_id;

END $$;

