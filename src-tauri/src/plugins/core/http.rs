use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

use crate::plugins::manifest::PluginError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpStepInput {
    pub method: String,
    pub url: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub auth: Option<HttpAuth>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum HttpAuth {
    Bearer { token: String },
    Basic { username: String, password: String },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpStepOutput {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub elapsed_ms: u64,
}

pub struct HttpPlugin;

impl HttpPlugin {
    pub async fn execute(input: HttpStepInput) -> Result<HttpStepOutput, PluginError> {
        let timeout_secs = input.timeout_seconds.unwrap_or(30);

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(timeout_secs))
            .build()
            .map_err(|e| PluginError::LoadError(format!("Failed to create HTTP client: {}", e)))?;

        let method = input
            .method
            .to_uppercase()
            .parse::<reqwest::Method>()
            .map_err(|e| PluginError::LoadError(format!("Invalid HTTP method: {}", e)))?;

        let mut request = client.request(method.clone(), &input.url);

        // Add headers
        if let Some(ref headers) = input.headers {
            for (key, value) in headers {
                request = request.header(key.as_str(), value.as_str());
            }
        }

        // Add body for methods that support it
        if let Some(ref body) = input.body {
            match method {
                reqwest::Method::POST | reqwest::Method::PUT | reqwest::Method::PATCH => {
                    request = request.body(body.clone());
                }
                _ => {}
            }
        }

        // Apply auth
        if let Some(ref auth) = input.auth {
            match auth {
                HttpAuth::Bearer { token } => {
                    request = request.bearer_auth(token);
                }
                HttpAuth::Basic { username, password } => {
                    request = request.basic_auth(username, Some(password));
                }
            }
        }

        let start = std::time::Instant::now();

        let response = request
            .send()
            .await
            .map_err(|e| PluginError::LoadError(format!("HTTP request failed: {}", e)))?;

        let elapsed_ms = start.elapsed().as_millis() as u64;
        let status = response.status().as_u16();

        let response_headers: HashMap<String, String> = response
            .headers()
            .iter()
            .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        let body = response
            .text()
            .await
            .map_err(|e| PluginError::LoadError(format!("Failed to read response body: {}", e)))?;

        Ok(HttpStepOutput {
            status,
            headers: response_headers,
            body,
            elapsed_ms,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: HTTP tests require network access; these test struct serialization
    // and input validation. Integration tests against live endpoints are deferred.

    #[test]
    fn test_http_step_input_deserialize() {
        let json = r#"{
            "method": "GET",
            "url": "https://example.com",
            "headers": {"Accept": "application/json"},
            "timeout_seconds": 10
        }"#;
        let input: HttpStepInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.method, "GET");
        assert_eq!(input.url, "https://example.com");
        assert!(input.headers.is_some());
        assert_eq!(input.timeout_seconds, Some(10));
    }

    #[test]
    fn test_http_auth_bearer_deserialize() {
        let json = r#"{"type": "bearer", "token": "abc123"}"#;
        let auth: HttpAuth = serde_json::from_str(json).unwrap();
        match auth {
            HttpAuth::Bearer { token } => assert_eq!(token, "abc123"),
            _ => panic!("Expected Bearer auth"),
        }
    }

    #[test]
    fn test_http_auth_basic_deserialize() {
        let json = r#"{"type": "basic", "username": "user", "password": "pass"}"#;
        let auth: HttpAuth = serde_json::from_str(json).unwrap();
        match auth {
            HttpAuth::Basic { username, password } => {
                assert_eq!(username, "user");
                assert_eq!(password, "pass");
            }
            _ => panic!("Expected Basic auth"),
        }
    }

    #[test]
    fn test_http_step_output_serialize() {
        let output = HttpStepOutput {
            status: 200,
            headers: HashMap::from([("content-type".to_string(), "text/html".to_string())]),
            body: "<html></html>".to_string(),
            elapsed_ms: 42,
        };
        let json = serde_json::to_string(&output).unwrap();
        assert!(json.contains("\"status\":200"));
        assert!(json.contains("\"elapsed_ms\":42"));
    }

    #[test]
    fn test_http_post_input_with_body() {
        let json = r#"{
            "method": "POST",
            "url": "https://api.example.com/data",
            "body": "{\"key\": \"value\"}",
            "headers": {"Content-Type": "application/json"}
        }"#;
        let input: HttpStepInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.method, "POST");
        assert!(input.body.is_some());
        assert_eq!(input.body.unwrap(), "{\"key\": \"value\"}");
    }
}
