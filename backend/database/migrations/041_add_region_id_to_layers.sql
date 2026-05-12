-- 為 warning_region_layers 加上 region_id 欄位（UUID FK）
-- 允許透過 region_id 查詢，不依賴 region_code 的命名一致性

ALTER TABLE warning_region_layers
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES warning_regions(region_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wrl_region_id ON warning_region_layers(region_id);

-- 把現有 taiwan7 / taiwan8 的 region_code 對應到正確的 region_id
UPDATE warning_region_layers wrl
SET region_id = wr.region_id
FROM warning_regions wr
WHERE wr.region_code = wrl.region_code
  AND wrl.region_id IS NULL;
