use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::ai::provider::AiProvider;
use crate::ai::types::CompletionRequest;

use super::frontmatter;
use super::types::{
    KnowledgeError, LintCategory, LintIssue, LintReport, LintSeverity, LintSummary,
};

/// Run all five lint categories against the wiki.
pub async fn lint_wiki(
    knowledge_dir: &Path,
    provider: &dyn AiProvider,
) -> Result<LintReport, KnowledgeError> {
    let wiki_dir = knowledge_dir.join("wiki");
    let raw_dir = knowledge_dir.join("raw");

    // Collect all articles
    let mut articles: Vec<(String, frontmatter::WikiFrontmatter, String)> = Vec::new(); // (slug, fm, body)

    if wiki_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&wiki_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("md") {
                    continue;
                }
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok((fm, body)) = frontmatter::parse_article(&content) {
                        let slug = fm.slug.clone();
                        articles.push((slug, fm, body));
                    }
                }
            }
        }
    }

    let article_count = articles.len();
    let all_slugs: HashSet<String> = articles.iter().map(|(s, _, _)| s.clone()).collect();

    let mut issues: Vec<LintIssue> = Vec::new();

    // Category 1: Stale Sources
    lint_stale_sources(&articles, &raw_dir, &mut issues);

    // Category 2: Broken Wikilinks
    lint_broken_wikilinks(&articles, &all_slugs, &mut issues);

    // Category 3: Thin Articles
    lint_thin_articles(&articles, &mut issues);

    // Category 4: Orphan Pages
    lint_orphan_pages(&articles, &all_slugs, &mut issues);

    // Category 5: Contradictions (LLM-powered)
    lint_contradictions(&articles, provider, &mut issues).await;

    // Build summary
    let mut by_category: HashMap<String, usize> = HashMap::new();
    for issue in &issues {
        *by_category.entry(issue.category.to_string()).or_insert(0) += 1;
    }

    let report = LintReport {
        timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        article_count,
        issues: issues.clone(),
        summary: LintSummary {
            total_issues: issues.len(),
            by_category,
        },
    };

    Ok(report)
}

fn lint_stale_sources(
    articles: &[(String, frontmatter::WikiFrontmatter, String)],
    raw_dir: &Path,
    issues: &mut Vec<LintIssue>,
) {
    for (slug, fm, _) in articles {
        for source_ref in &fm.sources {
            // Find matching raw file (raw files are named {hash_prefix}-{source_name})
            let mut found = false;
            if let Ok(raw_entries) = std::fs::read_dir(raw_dir) {
                for raw_entry in raw_entries.flatten() {
                    let raw_name = raw_entry.file_name().to_string_lossy().to_string();
                    // Check if this raw file corresponds to this source
                    // Raw files are named {8-char-hash}-{source_name}
                    if raw_name.len() > 9 && raw_name[9..] == *source_ref.file {
                        found = true;
                        // Read and hash the raw content
                        if let Ok(raw_content) = std::fs::read_to_string(raw_entry.path()) {
                            let current_hash = frontmatter::compute_content_hash(&raw_content);
                            if current_hash != source_ref.hash {
                                issues.push(LintIssue {
                                    category: LintCategory::StaleSources,
                                    severity: LintSeverity::Error,
                                    article: slug.clone(),
                                    message: format!(
                                        "Source '{}' has changed since last compile (stored: {}..., current: {}...)",
                                        source_ref.file,
                                        &source_ref.hash[..8.min(source_ref.hash.len())],
                                        &current_hash[..8.min(current_hash.len())]
                                    ),
                                    details: None,
                                });
                            }
                        }
                        break;
                    }
                }
            }
            if !found {
                issues.push(LintIssue {
                    category: LintCategory::StaleSources,
                    severity: LintSeverity::Error,
                    article: slug.clone(),
                    message: format!("Source '{}' not found in raw/ directory", source_ref.file),
                    details: None,
                });
            }
        }
    }
}

fn lint_broken_wikilinks(
    articles: &[(String, frontmatter::WikiFrontmatter, String)],
    all_slugs: &HashSet<String>,
    issues: &mut Vec<LintIssue>,
) {
    let wikilink_re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap();

    for (slug, fm, body) in articles {
        // Check wikilinks in body
        for cap in wikilink_re.captures_iter(body) {
            let target = cap[1].trim();
            if !all_slugs.contains(target) {
                issues.push(LintIssue {
                    category: LintCategory::BrokenWikilinks,
                    severity: LintSeverity::Error,
                    article: slug.clone(),
                    message: format!(
                        "Wikilink [[{}]] points to non-existent article",
                        target
                    ),
                    details: None,
                });
            }
        }

        // Check related field entries
        for related_slug in &fm.related {
            if !all_slugs.contains(related_slug.as_str()) {
                issues.push(LintIssue {
                    category: LintCategory::BrokenWikilinks,
                    severity: LintSeverity::Error,
                    article: slug.clone(),
                    message: format!(
                        "Related link '{}' points to non-existent article",
                        related_slug
                    ),
                    details: None,
                });
            }
        }
    }
}

fn lint_thin_articles(
    articles: &[(String, frontmatter::WikiFrontmatter, String)],
    issues: &mut Vec<LintIssue>,
) {
    for (slug, _, body) in articles {
        let content_len: usize = body.chars().filter(|c| !c.is_whitespace()).count();
        if content_len < 200 {
            issues.push(LintIssue {
                category: LintCategory::ThinArticles,
                severity: LintSeverity::Warning,
                article: slug.clone(),
                message: format!(
                    "Article body is only {} characters (minimum recommended: 200)",
                    content_len
                ),
                details: None,
            });
        }
    }
}

fn lint_orphan_pages(
    articles: &[(String, frontmatter::WikiFrontmatter, String)],
    all_slugs: &HashSet<String>,
    issues: &mut Vec<LintIssue>,
) {
    // Skip orphan detection if 1 or fewer articles
    if articles.len() <= 1 {
        return;
    }

    let wikilink_re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap();

    // Build referenced set
    let mut referenced: HashSet<String> = HashSet::new();
    for (_, fm, body) in articles {
        for related_slug in &fm.related {
            if all_slugs.contains(related_slug.as_str()) {
                referenced.insert(related_slug.clone());
            }
        }
        for cap in wikilink_re.captures_iter(body) {
            let target = cap[1].trim().to_string();
            if all_slugs.contains(&target) {
                referenced.insert(target);
            }
        }
    }

    for (slug, _, _) in articles {
        if !referenced.contains(slug) {
            issues.push(LintIssue {
                category: LintCategory::OrphanPages,
                severity: LintSeverity::Warning,
                article: slug.clone(),
                message: "Article is not referenced by any other article".to_string(),
                details: None,
            });
        }
    }
}

async fn lint_contradictions(
    articles: &[(String, frontmatter::WikiFrontmatter, String)],
    provider: &dyn AiProvider,
    issues: &mut Vec<LintIssue>,
) {
    if articles.len() < 2 {
        return;
    }

    let summaries = articles
        .iter()
        .map(|(slug, fm, _)| format!("- {}: {} -- {}", slug, fm.title, fm.summary))
        .collect::<Vec<_>>()
        .join("\n");

    let system_prompt = r#"You are a knowledge consistency checker. Given summaries of wiki articles, identify any contradictions or conflicting claims between articles.

Respond with ONLY a JSON array (no markdown fences). Each entry:
{"articles": ["slug-a", "slug-b"], "contradiction": "Description of the contradiction"}

If no contradictions found, respond with: []"#;

    let request = CompletionRequest {
        system_prompt: system_prompt.to_string(),
        user_message: summaries,
        max_tokens: 2048,
        temperature: 0.2,
        tools: None,
        tool_results: None,
    };

    if let Ok(response) = provider.complete(request).await {
        if let Ok(contradictions) =
            serde_json::from_str::<Vec<serde_json::Value>>(&response.content)
        {
            for c in contradictions {
                let articles_arr: Vec<String> = c["articles"]
                    .as_array()
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                let contradiction = c["contradiction"]
                    .as_str()
                    .unwrap_or("Unknown contradiction")
                    .to_string();

                let article = articles_arr.first().cloned().unwrap_or_default();
                let details = if articles_arr.len() > 1 {
                    Some(format!("Involves: {}", articles_arr.join(", ")))
                } else {
                    None
                };

                issues.push(LintIssue {
                    category: LintCategory::Contradictions,
                    severity: LintSeverity::Info,
                    article,
                    message: contradiction,
                    details,
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge::frontmatter::{SourceRef, WikiFrontmatter};
    use crate::knowledge::test_helpers::MockProvider;

    fn write_article(wiki_dir: &Path, fm: &WikiFrontmatter, body: &str) {
        let content = format!("{}\n\n{}\n", fm.to_yaml(), body);
        std::fs::write(wiki_dir.join(format!("{}.md", fm.slug)), content).unwrap();
    }

    fn make_fm(slug: &str, title: &str, source_file: &str, source_hash: &str) -> WikiFrontmatter {
        WikiFrontmatter {
            title: title.to_string(),
            slug: slug.to_string(),
            sources: vec![SourceRef {
                file: source_file.to_string(),
                hash: source_hash.to_string(),
            }],
            created: "2026-04-06T12:00:00Z".to_string(),
            updated: "2026-04-06T12:00:00Z".to_string(),
            tags: vec!["test".to_string()],
            summary: format!("Summary of {}", title),
            related: vec![],
        }
    }

    #[tokio::test]
    async fn test_lint_detects_stale_sources() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        // Create article with hash "aaa..."
        let fm = make_fm("stale-test", "Stale Test", "source.txt", "aaaaaaaaaa");
        write_article(
            &wiki_dir,
            &fm,
            "This is a long enough article body to pass the thin article check with at least two hundred characters of content so the lint won't flag it as thin. Adding more text here to be safe and sure.",
        );

        // Create raw source with content that hashes to something different
        let raw_content = "Changed content that produces a different hash";
        let raw_hash = frontmatter::compute_content_hash(raw_content);
        std::fs::write(
            raw_dir.join(format!("{}-source.txt", &raw_hash[..8])),
            raw_content,
        )
        .unwrap();

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        let stale_issues: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.category == LintCategory::StaleSources)
            .collect();
        assert!(
            !stale_issues.is_empty(),
            "Should detect stale source: {:?}",
            report.issues
        );
    }

    #[tokio::test]
    async fn test_lint_detects_broken_wikilinks() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        let hash = frontmatter::compute_content_hash("source content");
        let fm = make_fm("link-test", "Link Test", "source.txt", &hash);
        std::fs::write(
            raw_dir.join(format!("{}-source.txt", &hash[..8])),
            "source content",
        )
        .unwrap();

        write_article(
            &wiki_dir,
            &fm,
            "This article references [[nonexistent-slug]] which does not exist. This is a long enough article body to pass the thin article check with at least two hundred characters of content to avoid thin flagging.",
        );

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        let broken_issues: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.category == LintCategory::BrokenWikilinks)
            .collect();
        assert_eq!(broken_issues.len(), 1);
        assert!(broken_issues[0].message.contains("nonexistent-slug"));
    }

    #[tokio::test]
    async fn test_lint_detects_thin_articles() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        let hash = frontmatter::compute_content_hash("content");
        let fm = make_fm("thin-test", "Thin Test", "thin.txt", &hash);
        std::fs::write(
            raw_dir.join(format!("{}-thin.txt", &hash[..8])),
            "content",
        )
        .unwrap();

        write_article(&wiki_dir, &fm, "Short body.");

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        let thin_issues: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.category == LintCategory::ThinArticles)
            .collect();
        assert_eq!(thin_issues.len(), 1);
    }

    #[tokio::test]
    async fn test_lint_detects_orphan_pages() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        let long_body = "This is a long enough article body to pass the thin article check with at least two hundred characters of content so the lint won't flag it as thin. Adding more text here to be safe and absolutely sure.";

        // Article A references B via related
        let hash_a = frontmatter::compute_content_hash("content-a");
        let mut fm_a = make_fm("article-a", "Article A", "a.txt", &hash_a);
        fm_a.related = vec!["article-b".to_string()];
        std::fs::write(
            raw_dir.join(format!("{}-a.txt", &hash_a[..8])),
            "content-a",
        )
        .unwrap();
        write_article(&wiki_dir, &fm_a, long_body);

        // Article B (referenced by A)
        let hash_b = frontmatter::compute_content_hash("content-b");
        let mut fm_b = make_fm("article-b", "Article B", "b.txt", &hash_b);
        fm_b.related = vec!["article-a".to_string()];
        std::fs::write(
            raw_dir.join(format!("{}-b.txt", &hash_b[..8])),
            "content-b",
        )
        .unwrap();
        write_article(&wiki_dir, &fm_b, long_body);

        // Article C (orphan — no references from anyone)
        let hash_c = frontmatter::compute_content_hash("content-c");
        let fm_c = make_fm("article-c", "Article C", "c.txt", &hash_c);
        std::fs::write(
            raw_dir.join(format!("{}-c.txt", &hash_c[..8])),
            "content-c",
        )
        .unwrap();
        write_article(&wiki_dir, &fm_c, long_body);

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        let orphan_issues: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.category == LintCategory::OrphanPages)
            .collect();
        assert_eq!(orphan_issues.len(), 1);
        assert_eq!(orphan_issues[0].article, "article-c");
    }

    #[tokio::test]
    async fn test_lint_contradictions_uses_llm() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        let long_body = "This is a long enough article body to pass the thin article check with at least two hundred characters of content so the lint won't flag it as thin. Adding more text here to be safe and absolutely sure.";

        let hash_a = frontmatter::compute_content_hash("a");
        let mut fm_a = make_fm("article-x", "Article X", "x.txt", &hash_a);
        fm_a.related = vec!["article-y".to_string()];
        std::fs::write(raw_dir.join(format!("{}-x.txt", &hash_a[..8])), "a").unwrap();
        write_article(&wiki_dir, &fm_a, long_body);

        let hash_b = frontmatter::compute_content_hash("b");
        let mut fm_b = make_fm("article-y", "Article Y", "y.txt", &hash_b);
        fm_b.related = vec!["article-x".to_string()];
        std::fs::write(raw_dir.join(format!("{}-y.txt", &hash_b[..8])), "b").unwrap();
        write_article(&wiki_dir, &fm_b, long_body);

        let provider = MockProvider {
            response: r#"[{"articles": ["article-x", "article-y"], "contradiction": "Article X says A but Article Y says not A"}]"#.to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        let contradiction_issues: Vec<_> = report
            .issues
            .iter()
            .filter(|i| i.category == LintCategory::Contradictions)
            .collect();
        assert_eq!(contradiction_issues.len(), 1);
        assert!(contradiction_issues[0]
            .message
            .contains("Article X says A"));
    }

    #[tokio::test]
    async fn test_lint_clean_wiki_no_issues() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        let long_body = "This is a long enough article body to pass the thin article check with at least two hundred characters of non whitespace content so the lint will not flag it as thin because we need enough actual characters in here to clear the two hundred character threshold easily and safely without any doubt at all about it whatsoever period.";

        // Create two well-formed articles that reference each other
        let content_a = "Clean source content for article alpha";
        let hash_a = frontmatter::compute_content_hash(content_a);
        let mut fm_a = make_fm("clean-a", "Clean A", "clean-a.txt", &hash_a);
        fm_a.related = vec!["clean-b".to_string()];
        std::fs::write(
            raw_dir.join(format!("{}-clean-a.txt", &hash_a[..8])),
            content_a,
        )
        .unwrap();
        write_article(&wiki_dir, &fm_a, long_body);

        let content_b = "Clean source content for article beta";
        let hash_b = frontmatter::compute_content_hash(content_b);
        let mut fm_b = make_fm("clean-b", "Clean B", "clean-b.txt", &hash_b);
        fm_b.related = vec!["clean-a".to_string()];
        std::fs::write(
            raw_dir.join(format!("{}-clean-b.txt", &hash_b[..8])),
            content_b,
        )
        .unwrap();
        write_article(&wiki_dir, &fm_b, long_body);

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();
        assert_eq!(
            report.issues.len(),
            0,
            "Clean wiki should have no issues but got: {:?}",
            report.issues
        );
    }

    #[tokio::test]
    async fn test_lint_summary_counts_by_category() {
        let dir = tempfile::tempdir().unwrap();
        let knowledge_dir = dir.path().to_path_buf();
        let wiki_dir = knowledge_dir.join("wiki");
        let raw_dir = knowledge_dir.join("raw");
        std::fs::create_dir_all(&wiki_dir).unwrap();
        std::fs::create_dir_all(&raw_dir).unwrap();

        // Create a thin article with broken wikilink (2 categories)
        let hash = frontmatter::compute_content_hash("c");
        let fm = make_fm("multi-issue", "Multi Issue", "multi.txt", &hash);
        std::fs::write(raw_dir.join(format!("{}-multi.txt", &hash[..8])), "c").unwrap();
        write_article(&wiki_dir, &fm, "Thin. [[broken-link]]");

        let provider = MockProvider {
            response: "[]".to_string(),
        };

        let report = lint_wiki(&knowledge_dir, &provider).await.unwrap();

        assert!(report.summary.total_issues >= 2);
        assert_eq!(report.summary.total_issues, report.issues.len());

        // Should have entries in by_category
        assert!(report.summary.by_category.contains_key("thin_articles"));
        assert!(report.summary.by_category.contains_key("broken_wikilinks"));
    }
}
