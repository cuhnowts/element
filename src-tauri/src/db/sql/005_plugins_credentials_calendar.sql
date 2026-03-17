-- Plugin metadata (loaded plugins and their state)
CREATE TABLE IF NOT EXISTS plugins (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    author TEXT,
    capabilities TEXT NOT NULL DEFAULT '[]',  -- JSON array
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'error', 'disabled', 'loading')),
    error_message TEXT,
    loaded_at TEXT NOT NULL,
    plugin_path TEXT NOT NULL
);

-- Credential metadata (secrets stored in OS keychain, not here)
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    credential_type TEXT NOT NULL DEFAULT 'api_key'
        CHECK(credential_type IN ('api_key', 'token', 'secret', 'oauth_token')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Calendar accounts
CREATE TABLE IF NOT EXISTS calendar_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'outlook')),
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    credential_id TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    sync_token TEXT,
    last_synced_at TEXT,
    color_index INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Cached calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    all_day INTEGER NOT NULL DEFAULT 0,
    attendees TEXT NOT NULL DEFAULT '[]',  -- JSON array
    status TEXT NOT NULL DEFAULT 'confirmed',
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_credentials_name ON credentials(name);
