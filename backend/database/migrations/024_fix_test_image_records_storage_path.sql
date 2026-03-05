-- 修復測試影像紀錄：軟刪除不存在的測試文件記錄
-- 創建時間: 2025-01-XX

DO $$
BEGIN
    -- 軟刪除所有測試數據（實際文件不存在的記錄）
    -- 這些是測試數據，實際文件不存在，會造成 404 錯誤
    UPDATE image_records
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE storage_path IN (
        '/uploads/data/disaster-points/test/disaster-photo-1.jpg',
        '/uploads/data/disaster-points/test/disaster-photo-2.jpg',
        '/uploads/data/disaster-points/test/disaster-video-1.mp4'
    )
    AND deleted_at IS NULL;
    
    RAISE NOTICE '已軟刪除測試影像紀錄';
END $$;

