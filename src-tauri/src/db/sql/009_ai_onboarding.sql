-- Add ai_mode to projects (per D-17, D-18, AIAS-01)
ALTER TABLE projects ADD COLUMN ai_mode TEXT NOT NULL DEFAULT 'on-demand'
    CHECK(ai_mode IN ('on-demand', 'track-suggest', 'track-auto-execute'));

-- General app settings key-value store (for CLI tool path and future settings)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
