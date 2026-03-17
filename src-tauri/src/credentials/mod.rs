pub mod keychain;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

use crate::db::connection::Database;
use keychain::SecretStore;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Credential {
    pub id: String,
    pub name: String,
    pub credential_type: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct CredentialManager {
    db: Arc<Mutex<Database>>,
    secret_store: Box<dyn SecretStore>,
}

impl CredentialManager {
    pub fn new(db: Arc<Mutex<Database>>, secret_store: Box<dyn SecretStore>) -> Self {
        Self { db, secret_store }
    }

    pub fn create(
        &self,
        name: &str,
        credential_type: &str,
        value: &str,
        notes: &str,
    ) -> Result<Credential, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn()
            .execute(
                "INSERT INTO credentials (id, name, credential_type, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![id, name, credential_type, notes, now, now],
            )
            .map_err(|e| e.to_string())?;

        // Store secret in keychain
        self.secret_store.set_secret(&id, value)?;

        Ok(Credential {
            id,
            name: name.to_string(),
            credential_type: credential_type.to_string(),
            notes: notes.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list(&self) -> Result<Vec<Credential>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let mut stmt = db
            .conn()
            .prepare("SELECT id, name, credential_type, notes, created_at, updated_at FROM credentials ORDER BY name")
            .map_err(|e| e.to_string())?;

        let creds = stmt
            .query_map([], |row| {
                Ok(Credential {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    credential_type: row.get(2)?,
                    notes: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;

        creds
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_secret(&self, id: &str) -> Result<String, String> {
        self.secret_store.get_secret(id)
    }

    pub fn update(
        &self,
        id: &str,
        name: Option<&str>,
        credential_type: Option<&str>,
        notes: Option<&str>,
        new_value: Option<&str>,
    ) -> Result<Credential, String> {
        let now = chrono::Utc::now().to_rfc3339();
        let db = self.db.lock().map_err(|e| e.to_string())?;

        // Get existing credential
        let existing = db
            .conn()
            .query_row(
                "SELECT id, name, credential_type, notes, created_at, updated_at FROM credentials WHERE id = ?1",
                rusqlite::params![id],
                |row| {
                    Ok(Credential {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        credential_type: row.get(2)?,
                        notes: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .map_err(|e| e.to_string())?;

        let final_name = name.unwrap_or(&existing.name);
        let final_type = credential_type.unwrap_or(&existing.credential_type);
        let final_notes = notes.unwrap_or(&existing.notes);

        db.conn()
            .execute(
                "UPDATE credentials SET name = ?1, credential_type = ?2, notes = ?3, updated_at = ?4 WHERE id = ?5",
                rusqlite::params![final_name, final_type, final_notes, now, id],
            )
            .map_err(|e| e.to_string())?;

        // Optionally update the secret
        if let Some(value) = new_value {
            self.secret_store.set_secret(id, value)?;
        }

        Ok(Credential {
            id: id.to_string(),
            name: final_name.to_string(),
            credential_type: final_type.to_string(),
            notes: final_notes.to_string(),
            created_at: existing.created_at,
            updated_at: now,
        })
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        // Delete from keychain first (best effort)
        let _ = self.secret_store.delete_secret(id);

        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.conn()
            .execute(
                "DELETE FROM credentials WHERE id = ?1",
                rusqlite::params![id],
            )
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db::migrations;
    use keychain::InMemoryStore;
    use rusqlite::Connection;

    fn setup_test_credential_manager() -> CredentialManager {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        let db = Database::from_connection(conn);
        let db_arc = Arc::new(Mutex::new(db));
        CredentialManager::new(db_arc, Box::new(InMemoryStore::new()))
    }

    #[test]
    fn test_create_stores_metadata_and_secret() {
        let mgr = setup_test_credential_manager();
        let cred = mgr.create("my-api-key", "api_key", "sk-123", "Test key").unwrap();

        assert!(!cred.id.is_empty());
        assert_eq!(cred.name, "my-api-key");
        assert_eq!(cred.credential_type, "api_key");
        assert_eq!(cred.notes, "Test key");

        // Secret should be retrievable
        let secret = mgr.get_secret(&cred.id).unwrap();
        assert_eq!(secret, "sk-123");
    }

    #[test]
    fn test_list_returns_metadata_only() {
        let mgr = setup_test_credential_manager();
        mgr.create("key-1", "api_key", "secret-1", "").unwrap();
        mgr.create("key-2", "token", "secret-2", "notes").unwrap();

        let list = mgr.list().unwrap();
        assert_eq!(list.len(), 2);
        // Credential struct has no secret field -- metadata only
    }

    #[test]
    fn test_get_secret_retrieves_from_store() {
        let mgr = setup_test_credential_manager();
        let cred = mgr.create("test", "api_key", "my-secret", "").unwrap();

        let secret = mgr.get_secret(&cred.id).unwrap();
        assert_eq!(secret, "my-secret");
    }

    #[test]
    fn test_delete_removes_from_both() {
        let mgr = setup_test_credential_manager();
        let cred = mgr.create("deleteme", "api_key", "secret", "").unwrap();

        mgr.delete(&cred.id).unwrap();

        // Should be gone from list
        let list = mgr.list().unwrap();
        assert!(list.is_empty());

        // Should be gone from secret store
        let result = mgr.get_secret(&cred.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_metadata_and_optionally_secret() {
        let mgr = setup_test_credential_manager();
        let cred = mgr.create("original", "api_key", "old-secret", "old notes").unwrap();

        // Update metadata only
        let updated = mgr
            .update(&cred.id, Some("renamed"), None, Some("new notes"), None)
            .unwrap();
        assert_eq!(updated.name, "renamed");
        assert_eq!(updated.notes, "new notes");
        assert_eq!(updated.credential_type, "api_key"); // unchanged

        // Secret should still be the old value
        assert_eq!(mgr.get_secret(&cred.id).unwrap(), "old-secret");

        // Now update with new secret
        let updated2 = mgr
            .update(&cred.id, None, None, None, Some("new-secret"))
            .unwrap();
        assert_eq!(updated2.name, "renamed"); // unchanged
        assert_eq!(mgr.get_secret(&cred.id).unwrap(), "new-secret");
    }

    #[test]
    fn test_migration_creates_tables() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();

        // Check all 4 tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('plugins', 'credentials', 'calendar_accounts', 'calendar_events') ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(tables.len(), 4);
        assert!(tables.contains(&"plugins".to_string()));
        assert!(tables.contains(&"credentials".to_string()));
        assert!(tables.contains(&"calendar_accounts".to_string()));
        assert!(tables.contains(&"calendar_events".to_string()));
    }
}
