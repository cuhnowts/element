use std::collections::HashMap;
use std::sync::Mutex;

/// Trait for abstracting secret storage.
/// KeychainStore uses the OS keychain; InMemoryStore is for tests.
pub trait SecretStore: Send + Sync {
    fn set_secret(&self, id: &str, value: &str) -> Result<(), String>;
    fn get_secret(&self, id: &str) -> Result<String, String>;
    fn delete_secret(&self, id: &str) -> Result<(), String>;
}

/// Stores secrets in the OS keychain via the keyring crate.
pub struct KeychainStore;

const SERVICE_NAME: &str = "com.element.app";

impl SecretStore for KeychainStore {
    fn set_secret(&self, id: &str, value: &str) -> Result<(), String> {
        let entry =
            keyring::Entry::new(SERVICE_NAME, id).map_err(|e| format!("Keyring error: {}", e))?;
        entry
            .set_password(value)
            .map_err(|e| format!("Failed to store secret: {}", e))
    }

    fn get_secret(&self, id: &str) -> Result<String, String> {
        let entry =
            keyring::Entry::new(SERVICE_NAME, id).map_err(|e| format!("Keyring error: {}", e))?;
        entry
            .get_password()
            .map_err(|e| format!("Failed to retrieve secret: {}", e))
    }

    fn delete_secret(&self, id: &str) -> Result<(), String> {
        let entry =
            keyring::Entry::new(SERVICE_NAME, id).map_err(|e| format!("Keyring error: {}", e))?;
        entry
            .delete_credential()
            .map_err(|e| format!("Failed to delete secret: {}", e))
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
