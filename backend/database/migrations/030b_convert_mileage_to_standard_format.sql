-- 將巡查記錄的里程數轉換為標準格式
-- 例如：22.5K -> 022K+500, 22.0K -> 022K+000
-- 創建時間: 2025-01-XX

-- 創建臨時函數來轉換里程數格式
CREATE OR REPLACE FUNCTION convert_mileage_to_standard(mileage_text TEXT)
RETURNS TEXT AS $$
DECLARE
  km_part INTEGER;
  decimal_part NUMERIC;
  meter_part INTEGER;
  km_str TEXT;
  meter_str TEXT;
BEGIN
  -- 如果已經是標準格式，直接返回
  IF mileage_text ~ '^\d{3}K\+\d{3}$' THEN
    RETURN mileage_text;
  END IF;
  
  -- 處理範圍格式（例如：17.07-17.2K），取起始值
  IF mileage_text ~ '\d+\.?\d*-\d+\.?\d*K' THEN
    mileage_text := regexp_replace(mileage_text, '^(\d+\.?\d*)-.*', '\1');
  END IF;
  
  -- 提取公里數和小數部分
  -- 處理小數格式（例如：22.5K）
  IF mileage_text ~ '^\d+\.\d+K' THEN
    km_part := CAST(regexp_replace(mileage_text, '^(\d+)\.\d+K.*', '\1') AS INTEGER);
    decimal_part := CAST('0.' || regexp_replace(mileage_text, '^\d+\.(\d+)K.*', '\1') AS NUMERIC);
    meter_part := ROUND((decimal_part * 1000)::NUMERIC)::INTEGER;
  -- 處理整數格式（例如：22K）
  ELSIF mileage_text ~ '^\d+K' THEN
    km_part := CAST(regexp_replace(mileage_text, '^(\d+)K.*', '\1') AS INTEGER);
    meter_part := 0;
  ELSE
    -- 無法解析，返回原始值
    RETURN mileage_text;
  END IF;
  
  -- 格式化為三位數公里數 + K + 三位數米數
  km_str := LPAD(km_part::TEXT, 3, '0');
  meter_str := LPAD(meter_part::TEXT, 3, '0');
  
  RETURN km_str || 'K+' || meter_str;
END;
$$ LANGUAGE plpgsql;

-- 更新所有巡查記錄的里程數
UPDATE inspection_records
SET mileage = convert_mileage_to_standard(mileage)
WHERE mileage IS NOT NULL 
  AND mileage !~ '^\d{3}K\+\d{3}$'  -- 只更新非標準格式的
  AND deleted_at IS NULL;

-- 刪除臨時函數
DROP FUNCTION IF EXISTS convert_mileage_to_standard(TEXT);

-- 添加註釋
COMMENT ON COLUMN inspection_records.mileage IS '里程數，標準格式為：三位數K+三位數米（例如：022K+500）';

