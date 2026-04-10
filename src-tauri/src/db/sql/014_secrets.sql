-- Secrets table for storing API keys and credentials in SQLite
-- (replaces OS keychain storage for portability)
CREATE TABLE IF NOT EXISTS secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
