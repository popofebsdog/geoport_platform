CREATE TABLE IF NOT EXISTS project_shares (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('disaster', 'warning')),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    region_id UUID REFERENCES warning_regions(region_id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CHECK (expires_at > created_at),
    CHECK ((kind = 'disaster' AND project_id IS NOT NULL AND region_id IS NULL)
        OR (kind = 'warning' AND region_id IS NOT NULL AND project_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON project_shares(project_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_shares_region ON project_shares(region_id) WHERE revoked_at IS NULL;
