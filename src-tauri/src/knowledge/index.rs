use std::path::Path;

use super::types::KnowledgeError;

#[derive(Debug, Clone)]
pub struct IndexEntry {
    pub slug: String,
    pub title: String,
    pub tags: Vec<String>,
    pub summary: String,
}

/// Read index.md and parse the Markdown table rows into IndexEntry items.
/// Returns empty Vec if file doesn't exist.
pub fn read_index(index_path: &Path) -> Result<Vec<IndexEntry>, KnowledgeError> {
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(index_path)
        .map_err(|e| KnowledgeError::IoError(format!("Failed to read index: {}", e)))?;

    let mut entries = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        // Skip header rows and non-table lines
        if !trimmed.starts_with('|') || trimmed.starts_with("| Article") || trimmed.starts_with("|--") {
            continue;
        }

        let cols: Vec<&str> = trimmed.split('|').collect();
        // Expected: ["", " [Title](wiki/slug.md) ", " tags ", " summary ", ""]
        if cols.len() < 4 {
            continue;
        }

        let article_col = cols[1].trim();
        let tags_col = cols[2].trim();
        let summary_col = cols[3].trim();

        // Parse article column: [Title](wiki/slug.md)
        if let Some((title, slug)) = parse_article_link(article_col) {
            let tags: Vec<String> = if tags_col.is_empty() {
                Vec::new()
            } else {
                tags_col.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
            };

            entries.push(IndexEntry {
                slug,
                title,
                tags,
                summary: summary_col.to_string(),
            });
        }
    }

    Ok(entries)
}

/// Write full index.md from entries. Entries are sorted alphabetically by title.
/// Generates header, table, tag cloud, and footer.
pub fn write_index(index_path: &Path, entries: &[IndexEntry]) -> Result<(), KnowledgeError> {
    let mut sorted: Vec<&IndexEntry> = entries.iter().collect();
    sorted.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

    let mut out = String::from("# Knowledge Index\n\n## Articles\n\n");
    out.push_str("| Article | Tags | Summary |\n");
    out.push_str("|---------|------|---------|\n");

    for entry in &sorted {
        out.push_str(&format!(
            "| [{}](wiki/{}.md) | {} | {} |\n",
            entry.title,
            entry.slug,
            entry.tags.join(", "),
            entry.summary,
        ));
    }

    // Tag cloud
    out.push_str("\n## Tag Cloud\n\n");
    let tag_cloud = build_tag_cloud(entries);
    out.push_str(&tag_cloud);
    out.push('\n');

    // Footer
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    out.push_str(&format!("\n*Last updated: {}*\n", now));
    out.push_str(&format!("*Article count: {}*\n", entries.len()));

    std::fs::write(index_path, out)
        .map_err(|e| KnowledgeError::IoError(format!("Failed to write index: {}", e)))?;

    Ok(())
}

/// Add or replace an entry in the index (match by slug).
pub fn add_entry(index_path: &Path, entry: IndexEntry) -> Result<(), KnowledgeError> {
    let mut entries = read_index(index_path)?;

    // Replace if slug already exists
    if let Some(pos) = entries.iter().position(|e| e.slug == entry.slug) {
        entries[pos] = entry;
    } else {
        entries.push(entry);
    }

    write_index(index_path, &entries)
}

/// Remove an entry matching the given slug.
pub fn remove_entry(index_path: &Path, slug: &str) -> Result<(), KnowledgeError> {
    let mut entries = read_index(index_path)?;
    entries.retain(|e| e.slug != slug);
    write_index(index_path, &entries)
}

// ── Helpers ────────────────────────────────────────────────────

/// Parse `[Title](wiki/slug.md)` link format.
fn parse_article_link(s: &str) -> Option<(String, String)> {
    let title_start = s.find('[')?;
    let title_end = s.find(']')?;
    if title_start >= title_end {
        return None;
    }
    let title = s[title_start + 1..title_end].to_string();

    let link_start = s.find('(')?;
    let link_end = s.find(')')?;
    if link_start >= link_end {
        return None;
    }
    let link = &s[link_start + 1..link_end];

    // Extract slug from wiki/slug.md
    let slug = link
        .strip_prefix("wiki/")
        .unwrap_or(link)
        .strip_suffix(".md")
        .unwrap_or(link)
        .to_string();

    Some((title, slug))
}

/// Build tag cloud string: `tag_name(count)` sorted by count desc, then alphabetically.
fn build_tag_cloud(entries: &[IndexEntry]) -> String {
    let mut tag_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for entry in entries {
        for tag in &entry.tags {
            *tag_counts.entry(tag.clone()).or_insert(0) += 1;
        }
    }

    let mut tags: Vec<(String, usize)> = tag_counts.into_iter().collect();
    tags.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    tags.iter()
        .map(|(tag, count)| format!("{}({})", tag, count))
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_and_read_index_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entries = vec![
            IndexEntry {
                slug: "rust-error-handling".to_string(),
                title: "Rust Error Handling".to_string(),
                tags: vec!["rust".to_string(), "error-handling".to_string()],
                summary: "Result and Option patterns".to_string(),
            },
            IndexEntry {
                slug: "tokio-async".to_string(),
                title: "Tokio Async".to_string(),
                tags: vec!["rust".to_string(), "async".to_string()],
                summary: "Async runtime basics".to_string(),
            },
            IndexEntry {
                slug: "cargo-basics".to_string(),
                title: "Cargo Basics".to_string(),
                tags: vec!["rust".to_string(), "tooling".to_string()],
                summary: "Package manager guide".to_string(),
            },
        ];

        write_index(&index_path, &entries).unwrap();
        let read_back = read_index(&index_path).unwrap();

        assert_eq!(read_back.len(), 3);

        // Should be sorted alphabetically by title
        assert_eq!(read_back[0].title, "Cargo Basics");
        assert_eq!(read_back[1].title, "Rust Error Handling");
        assert_eq!(read_back[2].title, "Tokio Async");

        // Verify fields
        assert_eq!(read_back[0].slug, "cargo-basics");
        assert_eq!(read_back[0].tags, vec!["rust", "tooling"]);
        assert_eq!(read_back[0].summary, "Package manager guide");
    }

    #[test]
    fn test_add_entry_to_empty_index() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entry = IndexEntry {
            slug: "new-article".to_string(),
            title: "New Article".to_string(),
            tags: vec!["test".to_string()],
            summary: "A new article".to_string(),
        };

        add_entry(&index_path, entry).unwrap();

        assert!(index_path.exists());
        let entries = read_index(&index_path).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].slug, "new-article");
    }

    #[test]
    fn test_add_entry_replaces_existing() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entry1 = IndexEntry {
            slug: "my-article".to_string(),
            title: "My Article v1".to_string(),
            tags: vec!["v1".to_string()],
            summary: "First version".to_string(),
        };
        add_entry(&index_path, entry1).unwrap();

        let entry2 = IndexEntry {
            slug: "my-article".to_string(),
            title: "My Article v2".to_string(),
            tags: vec!["v2".to_string()],
            summary: "Second version".to_string(),
        };
        add_entry(&index_path, entry2).unwrap();

        let entries = read_index(&index_path).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].title, "My Article v2");
        assert_eq!(entries[0].summary, "Second version");
    }

    #[test]
    fn test_remove_entry() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entries = vec![
            IndexEntry {
                slug: "keep-me".to_string(),
                title: "Keep Me".to_string(),
                tags: vec![],
                summary: "Staying".to_string(),
            },
            IndexEntry {
                slug: "remove-me".to_string(),
                title: "Remove Me".to_string(),
                tags: vec![],
                summary: "Going away".to_string(),
            },
        ];
        write_index(&index_path, &entries).unwrap();

        remove_entry(&index_path, "remove-me").unwrap();

        let remaining = read_index(&index_path).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].slug, "keep-me");
    }

    #[test]
    fn test_tag_cloud_generation() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entries = vec![
            IndexEntry {
                slug: "a".to_string(),
                title: "Article A".to_string(),
                tags: vec!["rust".to_string(), "async".to_string()],
                summary: "A".to_string(),
            },
            IndexEntry {
                slug: "b".to_string(),
                title: "Article B".to_string(),
                tags: vec!["rust".to_string(), "sync".to_string()],
                summary: "B".to_string(),
            },
            IndexEntry {
                slug: "c".to_string(),
                title: "Article C".to_string(),
                tags: vec!["rust".to_string()],
                summary: "C".to_string(),
            },
        ];
        write_index(&index_path, &entries).unwrap();

        let content = std::fs::read_to_string(&index_path).unwrap();
        // rust should appear 3 times, async and sync once each
        assert!(content.contains("rust(3)"));
        assert!(content.contains("async(1)"));
        assert!(content.contains("sync(1)"));
    }

    #[test]
    fn test_entries_sorted_alphabetically() {
        let dir = tempfile::tempdir().unwrap();
        let index_path = dir.path().join("index.md");

        let entries = vec![
            IndexEntry {
                slug: "z-last".to_string(),
                title: "Zebra".to_string(),
                tags: vec![],
                summary: "Z".to_string(),
            },
            IndexEntry {
                slug: "a-first".to_string(),
                title: "Aardvark".to_string(),
                tags: vec![],
                summary: "A".to_string(),
            },
            IndexEntry {
                slug: "m-middle".to_string(),
                title: "Mongoose".to_string(),
                tags: vec![],
                summary: "M".to_string(),
            },
        ];
        write_index(&index_path, &entries).unwrap();

        let read_back = read_index(&index_path).unwrap();
        assert_eq!(read_back[0].title, "Aardvark");
        assert_eq!(read_back[1].title, "Mongoose");
        assert_eq!(read_back[2].title, "Zebra");
    }
}
