-- Add estimated_minutes to tasks table (AI-estimated duration, separate from user-set duration_minutes)
ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER;

-- AI provider configuration
-- API keys stored in SQLite secrets table, credential_key references the secrets entry name
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    provider_type TEXT NOT NULL
        CHECK(provider_type IN ('anthropic', 'openai', 'ollama', 'openai_compatible')),
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    base_url TEXT,
    credential_key TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Work hours configuration (singleton row)
CREATE TABLE IF NOT EXISTS work_hours (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    start_time TEXT NOT NULL DEFAULT '09:00',
    end_time TEXT NOT NULL DEFAULT '17:00',
    work_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri',
    buffer_minutes INTEGER NOT NULL DEFAULT 10,
    min_block_minutes INTEGER NOT NULL DEFAULT 30,
    updated_at TEXT NOT NULL
);

-- Scheduled blocks for a given day
CREATE TABLE IF NOT EXISTS scheduled_blocks (
    id TEXT PRIMARY KEY,
    schedule_date TEXT NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL
        CHECK(block_type IN ('work', 'meeting', 'buffer')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_confirmed INTEGER NOT NULL DEFAULT 0,
    source_event_id TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_date ON scheduled_blocks(schedule_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_task ON scheduled_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_default ON ai_providers(is_default);
