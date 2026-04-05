use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;

use super::migrations;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir: PathBuf = app_handle.path().app_data_dir()?;
        std::fs::create_dir_all(&app_data_dir)?;

        let db_path = app_data_dir.join("element.db");
        let conn = Connection::open(db_path)?;

        // Foreign keys MUST be enabled before any other query (Pitfall 5)
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        migrations::run_migrations(&conn)?;

        Ok(Database { conn })
    }

    /// Create a Database from an existing connection (for testing with in-memory SQLite)
    #[cfg(test)]
    pub fn from_connection(conn: Connection) -> Self {
        Database { conn }
    }

    /// Open a new connection to the same database file as an existing Database.
    /// Used for spawned async tasks that need their own connection.
    #[allow(dead_code)] // reserved for future async task isolation
    pub fn clone_connection(
        existing: &std::sync::Mutex<Database>,
    ) -> Result<Database, Box<dyn std::error::Error>> {
        let locked = existing
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        let path = locked.conn.path().unwrap_or("").to_string();
        if path.is_empty() {
            return Err("Cannot clone in-memory database connection".into());
        }
        let conn = Connection::open(&path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        Ok(Database { conn })
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}
