use super::executor::{Document, DocumentMeta, EngineError};

const DEFAULT_TIMEOUT_MS: u64 = 30_000;

pub async fn execute_http(
    method: &str,
    url: &str,
    headers: &Option<Vec<(String, String)>>,
    body: &Option<serde_json::Value>,
    timeout_ms: Option<u64>,
) -> Result<Document, EngineError> {
    let timeout = timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);
    let client = reqwest::Client::new();

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        "PATCH" => client.patch(url),
        "HEAD" => client.head(url),
        other => return Err(EngineError::InvalidMethod(other.to_string())),
    };

    // Apply headers
    if let Some(hdrs) = headers {
        for (key, value) in hdrs {
            request = request.header(key, value);
        }
    }

    // Apply JSON body
    if let Some(json_body) = body {
        request = request.json(json_body);
    }

    let response = tokio::time::timeout(std::time::Duration::from_millis(timeout), request.send())
        .await
        .map_err(|_| EngineError::Timeout(timeout))?
        .map_err(|e| EngineError::HttpError(e.to_string()))?;

    let status = response.status().as_u16();
    let body_text = response
        .text()
        .await
        .map_err(|e| EngineError::HttpError(e.to_string()))?;

    // Detect content type by trying to parse as JSON
    let content_type = if serde_json::from_str::<serde_json::Value>(&body_text).is_ok() {
        "application/json".to_string()
    } else {
        "text/plain".to_string()
    };

    Ok(Document {
        content: body_text,
        content_type,
        metadata: DocumentMeta {
            step_name: String::new(),
            timestamp: String::new(),
            exit_code: None,
            status_code: Some(status),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_invalid_method() {
        let result = execute_http("INVALID", "http://example.com", &None, &None, None).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            EngineError::InvalidMethod(method) => assert_eq!(method, "INVALID"),
            other => panic!("Expected InvalidMethod, got: {:?}", other),
        }
    }
}
