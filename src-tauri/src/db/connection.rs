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

    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}
