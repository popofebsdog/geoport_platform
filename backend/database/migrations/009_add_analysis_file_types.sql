-- 添加潛勢評估和剖面觀測檔案類型
-- 創建時間: 2025-01-27

-- 添加新的檔案類型到 file_type_enum
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'potential_analysis';
ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'profile_observation';

-- 添加註釋
COMMENT ON TYPE file_type_enum IS '檔案類型枚舉：raster(柵格), vector(向量), csv(表格), lidar(點雲), report(報告), image(影像), document(文件), other(其他), potential_analysis(潛勢評估), profile_observation(剖面觀測)';
