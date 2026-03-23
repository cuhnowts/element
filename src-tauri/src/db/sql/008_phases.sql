ALTER TABLE projects ADD COLUMN directory_path TEXT;

CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id);

ALTER TABLE tasks ADD COLUMN phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
