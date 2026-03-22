-- Create themes table (per D-17)
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Add theme_id to projects
ALTER TABLE projects ADD COLUMN theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL;

-- Recreate tasks table to make project_id nullable and add theme_id (per D-18)
PRAGMA foreign_keys=OFF;

CREATE TABLE tasks_new (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    context TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in-progress', 'complete', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
    external_path TEXT,
    due_date TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    duration_minutes INTEGER,
    recurrence_rule TEXT,
    estimated_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Copy existing data: project_id preserved, theme_id NULL (per D-14, D-16)
INSERT INTO tasks_new SELECT
    id, project_id, NULL, title, description, context, status, priority,
    external_path, due_date, scheduled_date, scheduled_time,
    duration_minutes, recurrence_rule, estimated_minutes,
    created_at, updated_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate all indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_theme_id ON tasks(theme_id);

PRAGMA foreign_keys=ON;

-- Indexes for projects and themes
CREATE INDEX IF NOT EXISTS idx_projects_theme_id ON projects(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_sort_order ON themes(sort_order);
