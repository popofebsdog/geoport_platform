-- Add missing objects from historically partial 005 runs; never replay retired data seeds.
CREATE OR REPLACE FUNCTION search_text_array(items TEXT[])
RETURNS TEXT LANGUAGE SQL IMMUTABLE PARALLEL SAFE
AS $$ SELECT array_to_string(items, ' '); $$;

CREATE INDEX IF NOT EXISTS idx_data_files_fulltext ON data_files USING gin (
    to_tsvector('chinese', COALESCE(file_name, '') || ' ' || COALESCE(original_name, '') || ' ' ||
        COALESCE(search_text_array(tags), '') || ' ' || COALESCE(search_text_array(keywords), ''))
) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spatial_layers_fulltext ON spatial_layers USING gin (
    to_tsvector('chinese', COALESCE(layer_name, '') || ' ' || COALESCE(display_name, '') || ' ' ||
        COALESCE(description, '') || ' ' || COALESCE(search_text_array(tags), '') || ' ' || COALESCE(category, ''))
) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_files_recent ON data_files(upload_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_recent_login ON users(last_login_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS schema_migration_reconciliations (
    version VARCHAR(255) NOT NULL,
    previous_checksum VARCHAR(64) NOT NULL,
    new_checksum VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    backup_sha256 VARCHAR(64) NOT NULL,
    schema_sha256 VARCHAR(64) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (version, previous_checksum, new_checksum)
);
