use uuid::Uuid;

use crate::ai::anthropic::AnthropicProvider;
use crate::ai::credentials;
use crate::ai::ollama::OllamaProvider;
use crate::ai::openai::OpenAiProvider;
use crate::ai::openai_compat::OpenAiCompatProvider;
use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, AiProviderConfig, CreateProviderInput, ModelInfo, ProviderType,
};
use crate::db::connection::Database;

pub struct AiGateway {
    client: reqwest::Client,
}

impl AiGateway {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub fn create_provider(
        &self,
        db: &Database,
        input: CreateProviderInput,
    ) -> Result<AiProviderConfig, String> {
        let id = Uuid::new_v4().to_string();

        // Store API key in OS keychain if provided
        let credential_key = if let Some(ref api_key) = input.api_key {
            let cred_key = credentials::credential_key_for_provider(&id);
            credentials::store_api_key(&cred_key, api_key)?;
            Some(cred_key)
        } else {
            None
        };

        let now = chrono::Utc::now().to_rfc3339();
        let provider_type_str = input.provider_type.to_string();
        let base_url_str = input.base_url.as_deref();
        let credential_key_str = credential_key.as_deref();

        db.conn()
            .execute(
                "INSERT INTO ai_providers (id, provider_type, name, model, base_url, credential_key, is_default, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
                rusqlite::params![
                    id,
                    provider_type_str,
                    input.name,
                    input.model,
                    base_url_str,
                    credential_key_str,
                    now,
                    now,
                ],
            )
            .map_err(|e| format!("Failed to insert provider: {}", e))?;

        Ok(AiProviderConfig {
            id,
            provider_type: input.provider_type,
            name: input.name,
            model: input.model,
            base_url: input.base_url,
            credential_key,
            is_default: false,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_providers(&self, db: &Database) -> Result<Vec<AiProviderConfig>, String> {
        let mut stmt = db
            .conn()
            .prepare("SELECT id, provider_type, name, model, base_url, credential_key, is_default, created_at, updated_at FROM ai_providers ORDER BY created_at")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let providers = stmt
            .query_map([], |row| {
                let provider_type_str: String = row.get(1)?;
                let is_default_int: i32 = row.get(6)?;
                Ok(AiProviderConfig {
                    id: row.get(0)?,
                    provider_type: ProviderType::from_db_str(&provider_type_str)
                        .unwrap_or(ProviderType::Openai),
                    name: row.get(2)?,
                    model: row.get(3)?,
                    base_url: row.get(4)?,
                    credential_key: row.get(5)?,
                    is_default: is_default_int != 0,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })
            .map_err(|e| format!("Failed to query providers: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(providers)
    }

    pub fn remove_provider(&self, db: &Database, id: &str) -> Result<(), String> {
        // Get provider config first to clean up keychain
        let config = self.get_provider_config(db, id)?;

        // Delete API key from OS keychain if present
        if let Some(ref cred_key) = config.credential_key {
            credentials::delete_api_key(cred_key)?;
        }

        db.conn()
            .execute("DELETE FROM ai_providers WHERE id = ?1", rusqlite::params![id])
            .map_err(|e| format!("Failed to delete provider: {}", e))?;

        Ok(())
    }

    pub fn set_default(&self, db: &Database, id: &str) -> Result<(), String> {
        db.conn()
            .execute("UPDATE ai_providers SET is_default = 0", [])
            .map_err(|e| format!("Failed to clear defaults: {}", e))?;

        db.conn()
            .execute(
                "UPDATE ai_providers SET is_default = 1 WHERE id = ?1",
                rusqlite::params![id],
            )
            .map_err(|e| format!("Failed to set default: {}", e))?;

        Ok(())
    }

    pub fn get_default_provider(
        &self,
        db: &Database,
    ) -> Result<Box<dyn AiProvider>, AiError> {
        let config = self
            .get_default_config(db)
            .map_err(|e| AiError::ProviderNotFound(e))?;
        self.build_provider(&config)
    }

    pub fn get_default_config(&self, db: &Database) -> Result<AiProviderConfig, String> {
        let mut stmt = db
            .conn()
            .prepare("SELECT id, provider_type, name, model, base_url, credential_key, is_default, created_at, updated_at FROM ai_providers WHERE is_default = 1 LIMIT 1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let config = stmt
            .query_row([], |row| {
                let provider_type_str: String = row.get(1)?;
                let is_default_int: i32 = row.get(6)?;
                Ok(AiProviderConfig {
                    id: row.get(0)?,
                    provider_type: ProviderType::from_db_str(&provider_type_str)
                        .unwrap_or(ProviderType::Openai),
                    name: row.get(2)?,
                    model: row.get(3)?,
                    base_url: row.get(4)?,
                    credential_key: row.get(5)?,
                    is_default: is_default_int != 0,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            })
            .map_err(|_| "No default AI provider configured".to_string())?;

        Ok(config)
    }

    pub fn build_provider(
        &self,
        config: &AiProviderConfig,
    ) -> Result<Box<dyn AiProvider>, AiError> {
        match config.provider_type {
            ProviderType::Anthropic => {
                let api_key = self.get_api_key_for_config(config)?;
                Ok(Box::new(AnthropicProvider::new(api_key, config.model.clone())))
            }
            ProviderType::Openai => {
                let api_key = self.get_api_key_for_config(config)?;
                Ok(Box::new(OpenAiProvider::new(api_key, config.model.clone())))
            }
            ProviderType::Ollama => {
                Ok(Box::new(OllamaProvider::new(
                    config.base_url.clone(),
                    config.model.clone(),
                )))
            }
            ProviderType::OpenaiCompatible => {
                let api_key = config
                    .credential_key
                    .as_ref()
                    .and_then(|ck| credentials::get_api_key(ck).ok().flatten());
                Ok(Box::new(OpenAiCompatProvider::new(
                    config
                        .base_url
                        .clone()
                        .unwrap_or_else(|| "http://localhost:8080".to_string()),
                    api_key,
                    config.model.clone(),
                )))
            }
        }
    }

    pub fn test_connection(&self, db: &Database, id: &str) -> Result<AiProviderConfig, String> {
        self.get_provider_config(db, id)
    }

    pub fn list_models_for_provider(
        &self,
        db: &Database,
        id: &str,
    ) -> Result<AiProviderConfig, String> {
        self.get_provider_config(db, id)
    }

    fn get_provider_config(&self, db: &Database, id: &str) -> Result<AiProviderConfig, String> {
        let mut stmt = db
            .conn()
            .prepare("SELECT id, provider_type, name, model, base_url, credential_key, is_default, created_at, updated_at FROM ai_providers WHERE id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        stmt.query_row(rusqlite::params![id], |row| {
            let provider_type_str: String = row.get(1)?;
            let is_default_int: i32 = row.get(6)?;
            Ok(AiProviderConfig {
                id: row.get(0)?,
                provider_type: ProviderType::from_db_str(&provider_type_str)
                    .unwrap_or(ProviderType::Openai),
                name: row.get(2)?,
                model: row.get(3)?,
                base_url: row.get(4)?,
                credential_key: row.get(5)?,
                is_default: is_default_int != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|_| format!("Provider not found: {}", id))
    }

    fn get_api_key_for_config(&self, config: &AiProviderConfig) -> Result<String, AiError> {
        let cred_key = config
            .credential_key
            .as_ref()
            .ok_or_else(|| AiError::Credential("No credential key configured".to_string()))?;

        credentials::get_api_key(cred_key)
            .map_err(|e| AiError::Credential(e))?
            .ok_or_else(|| AiError::Credential("API key not found in keychain".to_string()))
    }
}
