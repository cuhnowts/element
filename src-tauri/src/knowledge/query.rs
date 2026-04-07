use std::path::Path;

use crate::ai::provider::AiProvider;
use crate::ai::types::CompletionRequest;

use super::frontmatter;
use super::index;
use super::types::{KnowledgeError, QueryResult, QuerySource};

/// Query the wiki: select relevant articles via LLM, read them, synthesize an answer.
pub async fn query_wiki(
    knowledge_dir: &Path,
    question: &str,
    provider: &dyn AiProvider,
) -> Result<QueryResult, KnowledgeError> {
    let index_path = knowledge_dir.join("index.md");
    let wiki_dir = knowledge_dir.join("wiki");

    // Step 1: Read index
    let entries = index::read_index(&index_path)?;

    if entries.is_empty() {
        return Ok(QueryResult {
            answer: "No knowledge articles exist yet. Ingest some sources first.".to_string(),
            sources: vec![],
        });
    }

    // Step 2: LLM article selection
    let formatted_index = entries
        .iter()
        .map(|e| {
            format!(
                "- {}: {} -- {} [tags: {}]",
                e.slug,
                e.title,
                e.summary,
                e.tags.join(", ")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let selection_prompt = r#"You are a knowledge retrieval system. Given a question and a list of available wiki articles, select the most relevant articles to answer the question.

Respond with ONLY a JSON array of slugs (no markdown fences):
["slug-one", "slug-two"]

Rules:
- Select 1-5 articles maximum
- Only select articles that are genuinely relevant to the question
- If no articles are relevant, return an empty array []"#;

    let selection_request = CompletionRequest {
        system_prompt: selection_prompt.to_string(),
        user_message: format!(
            "Question: {}\n\nAvailable articles:\n{}",
            question, formatted_index
        ),
        max_tokens: 1024,
        temperature: 0.2,
        tools: None,
        tool_results: None,
    };

    let selection_response = provider
        .complete(selection_request)
        .await
        .map_err(|e| KnowledgeError::AiError(format!("Article selection failed: {}", e)))?;

    // Step 3: Parse selected slugs
    let selected_slugs: Vec<String> = serde_json::from_str(&selection_response.content)
        .unwrap_or_default();

    // Filter to only valid slugs and cap at 5
    let valid_slug_set: std::collections::HashSet<String> =
        entries.iter().map(|e| e.slug.clone()).collect();
    let selected: Vec<String> = selected_slugs
        .into_iter()
        .filter(|s| valid_slug_set.contains(s))
        .take(5)
        .collect();

    if selected.is_empty() {
        return Ok(QueryResult {
            answer: "No relevant articles found for your question.".to_string(),
            sources: vec![],
        });
    }

    // Step 4: Read selected articles
    let mut articles_content = String::new();
    let mut sources: Vec<QuerySource> = Vec::new();

    for (i, slug) in selected.iter().enumerate() {
        let article_path = wiki_dir.join(format!("{}.md", slug));
        if let Ok(content) = std::fs::read_to_string(&article_path) {
            if let Ok((fm, body)) = frontmatter::parse_article(&content) {
                articles_content.push_str(&format!(
                    "### [{}] {} ({})\n{}\n\n",
                    i + 1,
                    fm.title,
                    slug,
                    body
                ));
                sources.push(QuerySource {
                    slug: slug.clone(),
                    title: fm.title,
                });
            }
        }
    }

    // Step 5: LLM synthesis
    let synthesis_prompt = r#"You are a knowledge synthesis system. Given a question and relevant wiki articles, produce a comprehensive answer.

Rules:
- Use footnote-style citations: [1], [2], etc. inline where you reference an article
- At the end, list all referenced sources in order:
  [1] Article Title (slug)
  [2] Article Title (slug)
- Draw from the provided articles only — do not hallucinate information
- If the articles don't fully answer the question, say so"#;

    let synthesis_request = CompletionRequest {
        system_prompt: synthesis_prompt.to_string(),
        user_message: format!(
            "Question: {}\n\nArticles:\n{}",
            question, articles_content
        ),
        max_tokens: 4096,
        temperature: 0.3,
        tools: None,
        tool_results: None,
    };

    let synthesis_response = provider
        .complete(synthesis_request)
        .await
        .map_err(|e| KnowledgeError::AiError(format!("Synthesis failed: {}", e)))?;

    // Step 6: Return result
    Ok(QueryResult {
        answer: synthesis_response.content,
        sources,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge::frontmatter::{SourceRef, WikiFrontmatter};
    use crate::knowledge::index::IndexEntry;
    use crate::knowledge::test_helpers::{MockProvider, SequentialMockProvider};

    /// Helper to set up a wiki directory with articles and index.
    fn setup_wiki(
        knowledge_dir: &Path,
        articles: Vec<(&str, &str, &str, Vec<&str>)>,
    ) {
        let wiki_dir = knowledge_dir.join("wiki");
        let index_path = knowledge_dir.join("index.md");
        std::fs::create_dir_all(&wiki_dir).unwrap();

        let mut index_entries = Vec::new();

        for (slug, title, body, tags) in &articles {
            let fm = WikiFrontmatter {
                title: title.to_string(),
                slug: slug.to_string(),
                sources: vec![SourceRef {
                    file: format!("{}.txt", slug),
                    hash: "abc123".to_string(),
                }],
                created: "2026-04-06T12:00:00Z".to_string(),
                updated: "2026-04-06T12:00:00Z".to_string(),
                tags: tags.iter().map(|t| t.to_string()).collect(),
                summary: format!("Summary of {}", title),
                related: vec![],
            };

            let content = format!("{}\n\n{}\n", fm.to_yaml(), body);
            std::fs::write(wiki_dir.join(format!("{}.md", slug)), content).unwrap();

            index_entries.push(IndexEntry {
                slug: slug.to_string(),
                title: title.to_string(),
                tags: tags.iter().map(|t| t.to_string()).collect(),
                summary: format!("Summary of {}", title),
            });
        }

        index::write_index(&index_path, &index_entries).unwrap();
    }

    #[tokio::test]
    async fn test_query_returns_synthesized_answer() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();

        setup_wiki(
            &knowledge_dir,
            vec![(
                "rust-errors",
                "Rust Error Handling",
                "Rust uses Result and Option for error handling. The ? operator propagates errors.",
                vec!["rust", "errors"],
            )],
        );

        let provider = SequentialMockProvider::new(vec![
            // Selection response
            r#"["rust-errors"]"#.to_string(),
            // Synthesis response
            "Rust handles errors using the Result and Option types [1].\n\n[1] Rust Error Handling (rust-errors)".to_string(),
        ]);

        let result = query_wiki(&knowledge_dir, "How does Rust handle errors?", &provider)
            .await
            .unwrap();

        assert!(result.answer.contains("Result"));
        assert_eq!(result.sources.len(), 1);
        assert_eq!(result.sources[0].slug, "rust-errors");
        assert_eq!(result.sources[0].title, "Rust Error Handling");
    }

    #[tokio::test]
    async fn test_query_empty_wiki_returns_helpful_message() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).unwrap();

        let provider = MockProvider {
            response: String::new(),
        };

        let result = query_wiki(&knowledge_dir, "Any question?", &provider)
            .await
            .unwrap();

        assert!(result.answer.contains("No knowledge articles exist yet"));
        assert!(result.sources.is_empty());
    }

    #[tokio::test]
    async fn test_query_cites_articles_with_footnotes() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();

        setup_wiki(
            &knowledge_dir,
            vec![
                (
                    "article-a",
                    "Article A",
                    "Content about topic A with detailed explanation.",
                    vec!["topic-a"],
                ),
                (
                    "article-b",
                    "Article B",
                    "Content about topic B with detailed explanation.",
                    vec!["topic-b"],
                ),
            ],
        );

        let provider = SequentialMockProvider::new(vec![
            r#"["article-a", "article-b"]"#.to_string(),
            "Based on the articles, topic A is about X [1] and topic B is about Y [2].\n\n[1] Article A (article-a)\n[2] Article B (article-b)".to_string(),
        ]);

        let result = query_wiki(&knowledge_dir, "Compare topics A and B", &provider)
            .await
            .unwrap();

        assert!(result.answer.contains("[1]"));
        assert!(result.answer.contains("[2]"));
        assert_eq!(result.sources.len(), 2);
    }

    #[tokio::test]
    async fn test_query_caps_at_five_articles() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();

        let mut articles = Vec::new();
        for i in 0..10 {
            articles.push((
                Box::leak(format!("article-{}", i).into_boxed_str()) as &str,
                Box::leak(format!("Article {}", i).into_boxed_str()) as &str,
                "Content with enough detail to be useful.",
                vec!["test"],
            ));
        }
        setup_wiki(&knowledge_dir, articles);

        // LLM selects 7 articles but we cap at 5
        let provider = SequentialMockProvider::new(vec![
            r#"["article-0", "article-1", "article-2", "article-3", "article-4", "article-5", "article-6"]"#.to_string(),
            "Synthesized answer from 5 articles [1][2][3][4][5].".to_string(),
        ]);

        let result = query_wiki(&knowledge_dir, "Tell me about all topics", &provider)
            .await
            .unwrap();

        // Should have at most 5 sources
        assert!(result.sources.len() <= 5);
    }
}
