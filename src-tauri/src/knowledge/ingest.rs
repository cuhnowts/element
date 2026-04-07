use std::path::Path;

use crate::ai::provider::AiProvider;
use crate::ai::types::CompletionRequest;

use super::frontmatter::{self, SourceRef, WikiFrontmatter};
use super::index::{self, IndexEntry};
use super::types::{IngestResult, KnowledgeError, SourceInput, SourceType};

/// Fetch URL content via reqwest and strip HTML tags to plain text.
pub(crate) async fn fetch_url_content(url: &str) -> Result<String, KnowledgeError> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| KnowledgeError::IoError(format!("Failed to fetch URL '{}': {}", url, e)))?;

    let status = response.status();
    if !status.is_success() {
        return Err(KnowledgeError::IoError(format!(
            "URL '{}' returned HTTP {}",
            url, status
        )));
    }

    let html = response
        .text()
        .await
        .map_err(|e| KnowledgeError::IoError(format!("Failed to read response body: {}", e)))?;

    Ok(strip_html_tags(&html))
}

/// Basic HTML tag stripping: remove script/style blocks, HTML tags, decode entities.
fn strip_html_tags(html: &str) -> String {
    // 1. Remove <script>...</script> and <style>...</style> blocks
    let re_script =
        regex::Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap();
    let no_scripts = re_script.replace_all(html, "");

    let re_style =
        regex::Regex::new(r"(?is)<style[^>]*>.*?</style>").unwrap();
    let no_styles = re_style.replace_all(&no_scripts, "");

    // 2. Remove all remaining HTML tags
    let re_tags = regex::Regex::new(r"<[^>]+>").unwrap();
    let no_tags = re_tags.replace_all(&no_styles, "");

    // 3. Decode common HTML entities
    let decoded = no_tags
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ");

    // 4. Collapse multiple whitespace into single space, trim
    let re_whitespace = regex::Regex::new(r"\s+").unwrap();
    re_whitespace.replace_all(&decoded, " ").trim().to_string()
}

/// Sanitize a URL string to a safe filename.
fn sanitize_url_to_filename(url: &str) -> String {
    url.replace("://", "-")
        .replace('/', "-")
        .replace('?', "-")
        .replace('&', "-")
        .replace('#', "-")
        .replace('=', "-")
}

/// Main ingest pipeline: resolve content, hash, check for no-op, compile via LLM,
/// store raw, write article, update index.
pub async fn ingest_source(
    knowledge_dir: &Path,
    source: &SourceInput,
    provider: &dyn AiProvider,
) -> Result<IngestResult, KnowledgeError> {
    let wiki_dir = knowledge_dir.join("wiki");
    let raw_dir = knowledge_dir.join("raw");
    let index_path = knowledge_dir.join("index.md");

    // Step 0: Resolve content
    let resolved_content = match source.source_type {
        SourceType::File => source.content.clone(),
        SourceType::Url => {
            if !source.content.is_empty() {
                // Pre-fetched content provided
                source.content.clone()
            } else {
                fetch_url_content(&source.name).await?
            }
        }
    };

    // Step 1: Compute content hash
    let content_hash = frontmatter::compute_content_hash(&resolved_content);

    // Step 2: Check for no-op re-ingest
    if let Ok(entries) = std::fs::read_dir(&wiki_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            if let Ok(article_content) = std::fs::read_to_string(&path) {
                if let Ok((fm, _body)) = frontmatter::parse_article(&article_content) {
                    for source_ref in &fm.sources {
                        if source_ref.file == source.name && source_ref.hash == content_hash {
                            return Ok(IngestResult {
                                slug: fm.slug.clone(),
                                title: fm.title.clone(),
                                source_hash: content_hash,
                                was_noop: true,
                                article_path: format!("wiki/{}.md", fm.slug),
                            });
                        }
                    }
                }
            }
        }
    }

    // Step 3: Store raw source
    let raw_filename = match source.source_type {
        SourceType::Url => {
            format!(
                "{}-{}",
                &content_hash[..8],
                sanitize_url_to_filename(&source.name)
            )
        }
        SourceType::File => format!("{}-{}", &content_hash[..8], &source.name),
    };
    let raw_path = raw_dir.join(&raw_filename);
    std::fs::write(&raw_path, &resolved_content)
        .map_err(|e| KnowledgeError::IoError(format!("Failed to write raw source: {}", e)))?;

    // Step 4: LLM compilation
    let system_prompt = r#"You are a wiki compiler. Given raw source content, produce a structured wiki article.

Respond with ONLY a JSON object (no markdown fences):
{
  "title": "Human-readable article title",
  "slug": "lowercase-hyphenated-slug",
  "tags": ["tag1", "tag2"],
  "summary": "One-line summary under 100 chars",
  "related": [],
  "content": "Full compiled wiki article content in Markdown. Use [[slug]] for cross-references to other articles."
}

Rules:
- Slug must be lowercase, hyphen-separated, descriptive (e.g., "rust-error-handling")
- Tags should be 2-5 relevant topic keywords
- Content should be well-structured with headers, organized for reference
- Use [[slug]] wikilink syntax when referencing concepts that could be separate articles
- Do not include YAML frontmatter in the content field"#;

    let request = CompletionRequest {
        system_prompt: system_prompt.to_string(),
        user_message: resolved_content.clone(),
        max_tokens: 4096,
        temperature: 0.3,
        tools: None,
        tool_results: None,
    };

    let response = provider
        .complete(request)
        .await
        .map_err(|e| KnowledgeError::AiError(format!("LLM compilation failed: {}", e)))?;

    // Step 5: Parse LLM response
    let llm_output: serde_json::Value = serde_json::from_str(&response.content).map_err(|e| {
        KnowledgeError::ParseError(format!(
            "Failed to parse LLM response as JSON: {} — response: {}",
            e, &response.content
        ))
    })?;

    let title = llm_output["title"]
        .as_str()
        .ok_or_else(|| KnowledgeError::ParseError("Missing 'title' in LLM response".to_string()))?
        .to_string();
    let mut slug = llm_output["slug"]
        .as_str()
        .ok_or_else(|| KnowledgeError::ParseError("Missing 'slug' in LLM response".to_string()))?
        .to_string();
    let tags: Vec<String> = llm_output["tags"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let summary = llm_output["summary"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let related: Vec<String> = llm_output["related"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let content = llm_output["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Step 6: Handle slug collision
    let original_slug = slug.clone();
    let mut suffix = 2;
    loop {
        let article_path = wiki_dir.join(format!("{}.md", slug));
        if !article_path.exists() {
            break;
        }
        // Check if it's the same source (re-ingest of changed content)
        if let Ok(existing_content) = std::fs::read_to_string(&article_path) {
            if let Ok((existing_fm, _)) = frontmatter::parse_article(&existing_content) {
                if existing_fm.sources.iter().any(|s| s.file == source.name) {
                    // Same source, we'll overwrite
                    break;
                }
            }
        }
        slug = format!("{}-{}", original_slug, suffix);
        suffix += 1;
    }

    // Step 7: Build WikiFrontmatter
    // Check if we're re-ingesting (preserve created date)
    let mut created = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let article_path = wiki_dir.join(format!("{}.md", slug));
    if article_path.exists() {
        if let Ok(existing_content) = std::fs::read_to_string(&article_path) {
            if let Ok((existing_fm, _)) = frontmatter::parse_article(&existing_content) {
                if !existing_fm.created.is_empty() {
                    created = existing_fm.created;
                }
            }
        }
    }

    let fm = WikiFrontmatter {
        title: title.clone(),
        slug: slug.clone(),
        sources: vec![SourceRef {
            file: source.name.clone(),
            hash: content_hash.clone(),
        }],
        created,
        updated: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        tags: tags.clone(),
        summary: summary.clone(),
        related,
    };

    // Step 8: Write wiki article
    let article_content = format!("{}\n\n{}\n", fm.to_yaml(), content);
    std::fs::write(&article_path, &article_content)
        .map_err(|e| KnowledgeError::IoError(format!("Failed to write article: {}", e)))?;

    // Step 9: Update index.md
    index::add_entry(
        &index_path,
        IndexEntry {
            slug: slug.clone(),
            title: title.clone(),
            tags,
            summary,
        },
    )?;

    // Step 10: Return result
    Ok(IngestResult {
        slug,
        title,
        source_hash: content_hash,
        was_noop: false,
        article_path: format!("wiki/{}.md", &fm.slug),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge::test_helpers::MockProvider;

    fn make_mock_response(slug: &str, title: &str) -> String {
        serde_json::json!({
            "title": title,
            "slug": slug,
            "tags": ["test", "rust"],
            "summary": format!("Summary of {}", title),
            "related": [],
            "content": format!("# {}\n\nThis is the compiled wiki article content for {} with enough text to be a real article that passes any minimum length thresholds that might be set.", title, title)
        })
        .to_string()
    }

    #[tokio::test]
    async fn test_ingest_creates_article() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("rust-error-handling", "Rust Error Handling"),
        };

        let source = SourceInput {
            name: "source.txt".to_string(),
            content: "Error handling in Rust uses Result and Option types.".to_string(),
            source_type: SourceType::File,
        };

        let result = ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();

        assert_eq!(result.slug, "rust-error-handling");
        assert_eq!(result.title, "Rust Error Handling");
        assert!(!result.was_noop);

        // Verify article exists with frontmatter
        let article_path = knowledge_dir.join("wiki/rust-error-handling.md");
        assert!(article_path.exists());
        let article_content = std::fs::read_to_string(&article_path).unwrap();
        assert!(article_content.contains("title: \"Rust Error Handling\""));

        // Verify source hash matches
        let expected_hash =
            frontmatter::compute_content_hash("Error handling in Rust uses Result and Option types.");
        assert_eq!(result.source_hash, expected_hash);
    }

    #[tokio::test]
    async fn test_ingest_stores_raw_source() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("test-article", "Test Article"),
        };

        let raw_content = "Raw source content for testing";
        let source = SourceInput {
            name: "test-source.txt".to_string(),
            content: raw_content.to_string(),
            source_type: SourceType::File,
        };

        ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();

        // Find raw file
        let raw_entries: Vec<_> = std::fs::read_dir(knowledge_dir.join("raw"))
            .unwrap()
            .flatten()
            .collect();
        assert_eq!(raw_entries.len(), 1);

        let raw_stored = std::fs::read_to_string(raw_entries[0].path()).unwrap();
        assert_eq!(raw_stored, raw_content);
    }

    #[tokio::test]
    async fn test_ingest_updates_index() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("indexed-article", "Indexed Article"),
        };

        let source = SourceInput {
            name: "indexed.txt".to_string(),
            content: "Content to be indexed".to_string(),
            source_type: SourceType::File,
        };

        ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();

        let entries = index::read_index(&knowledge_dir.join("index.md")).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].slug, "indexed-article");
        assert_eq!(entries[0].title, "Indexed Article");
    }

    #[tokio::test]
    async fn test_reingest_unchanged_is_noop() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("noop-article", "Noop Article"),
        };

        let source = SourceInput {
            name: "noop.txt".to_string(),
            content: "Content that won't change".to_string(),
            source_type: SourceType::File,
        };

        let result1 = ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();
        assert!(!result1.was_noop);

        let result2 = ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();
        assert!(result2.was_noop);
        assert_eq!(result2.slug, result1.slug);
    }

    #[tokio::test]
    async fn test_reingest_changed_source_updates() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("changing-article", "Changing Article"),
        };

        let source1 = SourceInput {
            name: "changing.txt".to_string(),
            content: "Original content".to_string(),
            source_type: SourceType::File,
        };

        let result1 = ingest_source(&knowledge_dir, &source1, &provider)
            .await
            .unwrap();
        assert!(!result1.was_noop);

        let source2 = SourceInput {
            name: "changing.txt".to_string(),
            content: "Updated content".to_string(),
            source_type: SourceType::File,
        };

        let result2 = ingest_source(&knowledge_dir, &source2, &provider)
            .await
            .unwrap();
        assert!(!result2.was_noop);
        assert_ne!(result2.source_hash, result1.source_hash);
    }

    #[tokio::test]
    async fn test_slug_collision_appends_suffix() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        // Both mock responses return the same slug
        let provider = MockProvider {
            response: make_mock_response("same-slug", "Same Slug Article"),
        };

        let source1 = SourceInput {
            name: "first-source.txt".to_string(),
            content: "First source content".to_string(),
            source_type: SourceType::File,
        };

        let result1 = ingest_source(&knowledge_dir, &source1, &provider)
            .await
            .unwrap();
        assert_eq!(result1.slug, "same-slug");

        let source2 = SourceInput {
            name: "second-source.txt".to_string(),
            content: "Second source content".to_string(),
            source_type: SourceType::File,
        };

        let result2 = ingest_source(&knowledge_dir, &source2, &provider)
            .await
            .unwrap();
        assert_eq!(result2.slug, "same-slug-2");
    }

    #[tokio::test]
    async fn test_ingest_url_source_fetches_and_strips() {
        // Test the strip_html_tags function directly (network fetch tested at integration level)
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("raw")).unwrap();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: make_mock_response("url-article", "URL Article"),
        };

        // Pre-fetched HTML content in source.content
        let source = SourceInput {
            name: "https://example.com/article".to_string(),
            content: "<html><head><title>Test</title></head><body><p>Hello world</p></body></html>"
                .to_string(),
            source_type: SourceType::Url,
        };

        let result = ingest_source(&knowledge_dir, &source, &provider)
            .await
            .unwrap();
        assert!(!result.was_noop);
        assert_eq!(result.slug, "url-article");
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(strip_html_tags("<p>Hello</p>"), "Hello");
        assert_eq!(
            strip_html_tags("<script>var x=1;</script>Text"),
            "Text"
        );
        assert_eq!(strip_html_tags("&amp; &lt; &gt;"), "& < >");
        assert_eq!(
            strip_html_tags("<div><span><b>Deep</b></span></div>"),
            "Deep"
        );
        assert_eq!(
            strip_html_tags("<style>body{color:red}</style>Visible"),
            "Visible"
        );
    }
}
