-- Commit the enum value before 015 uses it in a column default.
ALTER TYPE temporal_data_type_enum ADD VALUE IF NOT EXISTS 'csv';

-- Both temporal controllers and their statistics triggers require these fields.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS temporal_data_count INTEGER DEFAULT 0;
ALTER TABLE temporal_data ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE temporal_data ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);

-- Avoid firing project update triggers when an existing counter is already correct.
DO $$
BEGIN
    IF to_regclass('temporal_data_enhanced') IS NOT NULL THEN
        WITH counts AS (
            SELECT p.project_id,
                (SELECT COUNT(*) FROM temporal_data t WHERE t.project_id = p.project_id AND t.deleted_at IS NULL) +
                (SELECT COUNT(*) FROM temporal_data_enhanced t WHERE t.project_id = p.project_id AND t.deleted_at IS NULL) AS expected
            FROM projects p
        )
        UPDATE projects p SET temporal_data_count = c.expected
        FROM counts c WHERE p.project_id = c.project_id AND p.temporal_data_count IS DISTINCT FROM c.expected;
    ELSE
        WITH counts AS (
            SELECT p.project_id,
                (SELECT COUNT(*) FROM temporal_data t WHERE t.project_id = p.project_id AND t.deleted_at IS NULL) AS expected
            FROM projects p
        )
        UPDATE projects p SET temporal_data_count = c.expected
        FROM counts c WHERE p.project_id = c.project_id AND p.temporal_data_count IS DISTINCT FROM c.expected;
    END IF;
END $$;
