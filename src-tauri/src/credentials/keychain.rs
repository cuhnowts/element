use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::db::connection::Database;

/// Trait for abstracting secret storage.
/// SqliteSecretStore uses the app database; InMemoryStore is for tests.
pub trait SecretStore: Send + Sync {
    fn set_secret(&self, id: &str, value: &str) -> Result<(), String>;
    fn get_secret(&self, id: &str) -> Result<String, String>;
    fn delete_secret(&self, id: &str) -> Result<(), String>;
}

/// Stores secrets in the SQLite database (secrets table).
pub struct SqliteSecretStore {
    db: Arc<Mutex<Database>>,
}

impl SqliteSecretStore {
    pub fn new(db: Arc<Mutex<Database>>) -> Self {
        Self { db }
    }
}

impl SecretStore for SqliteSecretStore {
    fn set_secret(&self, id: &str, value: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn()
            .execute(
                "INSERT INTO secrets (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
                rusqlite::params![id, value],
            )
            .map_err(|e| format!("Failed to store secret: {}", e))?;
        Ok(())
    }

    fn get_secret(&self, id: &str) -> Result<String, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn()
            .query_row(
                "SELECT value FROM secrets WHERE key = ?1",
                rusqlite::params![id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Secret not found: {}", e))
    }

    fn delete_secret(&self, id: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn()
            .execute(
                "DELETE FROM secrets WHERE key = ?1",
                rusqlite::params![id],
            )
            .map_err(|e| format!("Failed to delete secret: {}", e))?;
        Ok(())
    }
}

/// In-memory secret store for testing (no real keychain access).
#[allow(dead_code)] // used in test builds
pub struct InMemoryStore {
    secrets: Mutex<HashMap<String, String>>,
}

impl InMemoryStore {
    #[allow(dead_code)] // used in test builds
    pub fn new() -> Self {
        Self {
            secrets: Mutex::new(HashMap::new()),
        }
    }
}

impl SecretStore for InMemoryStore {
    fn set_secret(&self, id: &str, value: &str) -> Result<(), String> {
        let mut store = self.secrets.lock().map_err(|e| e.to_string())?;
        store.insert(id.to_string(), value.to_string());
        Ok(())
    }

    fn get_secret(&self, id: &str) -> Result<String, String> {
        let store = self.secrets.lock().map_err(|e| e.to_string())?;
        store
            .get(id)
            .cloned()
            .ok_or_else(|| format!("Secret not found: {}", id))
    }

    fn delete_secret(&self, id: &str) -> Result<(), String> {
        let mut store = self.secrets.lock().map_err(|e| e.to_string())?;
        store.remove(id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_store_set_and_get() {
        let store = InMemoryStore::new();
        store.set_secret("test-id", "my-secret").unwrap();
        assert_eq!(store.get_secret("test-id").unwrap(), "my-secret");
    }

    #[test]
    fn test_in_memory_store_not_found() {
        let store = InMemoryStore::new();
        let result = store.get_secret("nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_in_memory_store_delete() {
        let store = InMemoryStore::new();
        store.set_secret("test-id", "secret").unwrap();
        store.delete_secret("test-id").unwrap();
        assert!(store.get_secret("test-id").is_err());
    }

    #[test]
    fn test_in_memory_store_overwrite() {
        let store = InMemoryStore::new();
        store.set_secret("test-id", "old").unwrap();
        store.set_secret("test-id", "new").unwrap();
        assert_eq!(store.get_secret("test-id").unwrap(), "new");
    }
}
