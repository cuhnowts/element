use crate::db::connection::Database;

/// Store an API key in the SQLite secrets table.
pub fn store_api_key(db: &Database, credential_key: &str, api_key: &str) -> Result<(), String> {
    db.conn()
        .execute(
            "INSERT INTO secrets (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            rusqlite::params![credential_key, api_key],
        )
        .map_err(|e| format!("Failed to store API key: {}", e))?;
    Ok(())
}

/// Retrieve an API key from the SQLite secrets table.
pub fn get_api_key(db: &Database, credential_key: &str) -> Result<Option<String>, String> {
    match db.conn().query_row(
        "SELECT value FROM secrets WHERE key = ?1",
        rusqlite::params![credential_key],
        |row| row.get(0),
    ) {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve API key: {}", e)),
    }
}

/// Delete an API key from the SQLite secrets table.
pub fn delete_api_key(db: &Database, credential_key: &str) -> Result<(), String> {
    db.conn()
        .execute(
            "DELETE FROM secrets WHERE key = ?1",
            rusqlite::params![credential_key],
        )
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    Ok(())
}

/// Generate a credential_key name for a given provider ID.
pub fn credential_key_for_provider(provider_id: &str) -> String {
    format!("element-ai-{}", provider_id)
}
