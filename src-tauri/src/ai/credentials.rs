use keyring::Entry;

const SERVICE_NAME: &str = "com.element.ai-providers";

/// Store an API key in the OS keychain. The `credential_key` is the lookup name
/// (typically "element-ai-{provider_id}"), and `api_key` is the secret value.
pub fn store_api_key(credential_key: &str, api_key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, credential_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    entry.set_password(api_key)
        .map_err(|e| format!("Failed to store API key in keychain: {}", e))
}

/// Retrieve an API key from the OS keychain by its credential_key reference.
pub fn get_api_key(credential_key: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, credential_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve API key from keychain: {}", e)),
    }
}

/// Delete an API key from the OS keychain.
pub fn delete_api_key(credential_key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, credential_key)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already gone, that's fine
        Err(e) => Err(format!("Failed to delete API key from keychain: {}", e)),
    }
}

/// Generate a credential_key name for a given provider ID.
pub fn credential_key_for_provider(provider_id: &str) -> String {
    format!("element-ai-{}", provider_id)
}
