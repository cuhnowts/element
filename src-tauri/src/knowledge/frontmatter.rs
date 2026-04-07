use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WikiFrontmatter {
    pub title: String,
    pub slug: String,
    pub sources: Vec<SourceRef>,
    pub created: String,
    pub updated: String,
    pub tags: Vec<String>,
    pub summary: String,
    pub related: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceRef {
    pub file: String,
    pub hash: String,
}

impl WikiFrontmatter {
    /// Serialize frontmatter to YAML between `---` delimiters with consistent field ordering.
    pub fn to_yaml(&self) -> String {
        let mut out = String::from("---\n");

        // title
        out.push_str(&format!("title: \"{}\"\n", escape_yaml_string(&self.title)));

        // slug
        out.push_str(&format!("slug: \"{}\"\n", escape_yaml_string(&self.slug)));

        // sources
        out.push_str("sources:\n");
        for s in &self.sources {
            out.push_str(&format!(
                "  - file: \"{}\"\n    hash: \"{}\"\n",
                escape_yaml_string(&s.file),
                escape_yaml_string(&s.hash)
            ));
        }

        // created / updated
        out.push_str(&format!("created: \"{}\"\n", &self.created));
        out.push_str(&format!("updated: \"{}\"\n", &self.updated));

        // tags
        out.push_str(&format!(
            "tags: [{}]\n",
            self.tags
                .iter()
                .map(|t| format!("\"{}\"", escape_yaml_string(t)))
                .collect::<Vec<_>>()
                .join(", ")
        ));

        // summary
        out.push_str(&format!(
            "summary: \"{}\"\n",
            escape_yaml_string(&self.summary)
        ));

        // related
        out.push_str(&format!(
            "related: [{}]\n",
            self.related
                .iter()
                .map(|r| format!("\"{}\"", escape_yaml_string(r)))
                .collect::<Vec<_>>()
                .join(", ")
        ));

        out.push_str("---");
        out
    }

    /// Parse a YAML frontmatter block (content between `---` delimiters).
    pub fn from_yaml(yaml_str: &str) -> Result<Self, String> {
        let lines: Vec<&str> = yaml_str.lines().collect();

        let mut title = String::new();
        let mut slug = String::new();
        let mut sources: Vec<SourceRef> = Vec::new();
        let mut created = String::new();
        let mut updated = String::new();
        let mut tags: Vec<String> = Vec::new();
        let mut summary = String::new();
        let mut related: Vec<String> = Vec::new();

        let mut i = 0;
        while i < lines.len() {
            let line = lines[i].trim();

            if line.starts_with("title:") {
                title = extract_quoted_value(line, "title:");
            } else if line.starts_with("slug:") {
                slug = extract_quoted_value(line, "slug:");
            } else if line.starts_with("created:") {
                created = extract_quoted_value(line, "created:");
            } else if line.starts_with("updated:") {
                updated = extract_quoted_value(line, "updated:");
            } else if line.starts_with("summary:") {
                summary = extract_quoted_value(line, "summary:");
            } else if line.starts_with("tags:") {
                tags = extract_bracket_list(line, "tags:");
            } else if line.starts_with("related:") {
                related = extract_bracket_list(line, "related:");
            } else if line.starts_with("sources:") {
                // Parse multi-line sources block
                i += 1;
                while i < lines.len() {
                    let sline = lines[i].trim();
                    if sline.starts_with("- file:") {
                        let file = extract_quoted_value(sline, "- file:");
                        i += 1;
                        let hash = if i < lines.len() {
                            let hline = lines[i].trim();
                            if hline.starts_with("hash:") {
                                extract_quoted_value(hline, "hash:")
                            } else {
                                String::new()
                            }
                        } else {
                            String::new()
                        };
                        sources.push(SourceRef { file, hash });
                    } else if !sline.is_empty()
                        && !sline.starts_with("hash:")
                        && !sline.starts_with('#')
                    {
                        // End of sources block — back up and let outer loop handle
                        i -= 1;
                        break;
                    }
                    i += 1;
                }
            }
            i += 1;
        }

        if title.is_empty() {
            return Err("Missing required field: title".to_string());
        }
        if slug.is_empty() {
            return Err("Missing required field: slug".to_string());
        }

        Ok(WikiFrontmatter {
            title,
            slug,
            sources,
            created,
            updated,
            tags,
            summary,
            related,
        })
    }
}

/// Compute SHA-256 hash of content and return lowercase hex string.
pub fn compute_content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Parse a full article into (frontmatter, body). The article must start with `---`
/// and have a closing `---` delimiter.
pub fn parse_article(content: &str) -> Result<(WikiFrontmatter, String), String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Err("Article does not start with frontmatter delimiter '---'".to_string());
    }

    // Find closing ---
    let after_first = &trimmed[3..];
    let rest = after_first.trim_start_matches(['\r', '\n']);
    let closing_pos = rest.find("\n---");
    match closing_pos {
        Some(pos) => {
            let yaml_block = &rest[..pos];
            let body_start = pos + 4; // skip \n---
            let body = if body_start < rest.len() {
                rest[body_start..].trim_start_matches(['\r', '\n']).to_string()
            } else {
                String::new()
            };
            let fm = WikiFrontmatter::from_yaml(yaml_block)?;
            Ok((fm, body))
        }
        None => Err("Could not find closing frontmatter delimiter '---'".to_string()),
    }
}

// ── Helpers ────────────────────────────────────────────────────

fn escape_yaml_string(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn unescape_yaml_string(s: &str) -> String {
    s.replace("\\\"", "\"").replace("\\\\", "\\")
}

fn extract_quoted_value(line: &str, prefix: &str) -> String {
    let after = line[prefix.len()..].trim();
    if after.starts_with('"') && after.ends_with('"') && after.len() >= 2 {
        unescape_yaml_string(&after[1..after.len() - 1])
    } else {
        after.to_string()
    }
}

fn extract_bracket_list(line: &str, prefix: &str) -> Vec<String> {
    let after = line[prefix.len()..].trim();
    if after.starts_with('[') && after.ends_with(']') && after.len() >= 2 {
        let inner = &after[1..after.len() - 1];
        if inner.trim().is_empty() {
            return Vec::new();
        }
        inner
            .split(',')
            .map(|item| {
                let trimmed = item.trim();
                if trimmed.starts_with('"') && trimmed.ends_with('"') && trimmed.len() >= 2 {
                    unescape_yaml_string(&trimmed[1..trimmed.len() - 1])
                } else {
                    trimmed.to_string()
                }
            })
            .filter(|s| !s.is_empty())
            .collect()
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_hash_deterministic() {
        let hash1 = compute_content_hash("hello world");
        let hash2 = compute_content_hash("hello world");
        assert_eq!(hash1, hash2);
        assert!(!hash1.is_empty());
    }

    #[test]
    fn test_content_hash_different_inputs() {
        let hash1 = compute_content_hash("hello");
        let hash2 = compute_content_hash("world");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_frontmatter_round_trip() {
        let fm = WikiFrontmatter {
            title: "Rust Error Handling".to_string(),
            slug: "rust-error-handling".to_string(),
            sources: vec![SourceRef {
                file: "source.txt".to_string(),
                hash: "abc123def456".to_string(),
            }],
            created: "2026-04-06T12:00:00Z".to_string(),
            updated: "2026-04-06T12:00:00Z".to_string(),
            tags: vec!["rust".to_string(), "error-handling".to_string()],
            summary: "Result, Option, and ? operator patterns".to_string(),
            related: vec!["rust-basics".to_string()],
        };

        let yaml = fm.to_yaml();
        // Extract content between --- delimiters
        let inner = yaml
            .strip_prefix("---\n")
            .unwrap()
            .strip_suffix("---")
            .unwrap();
        let parsed = WikiFrontmatter::from_yaml(inner).unwrap();

        assert_eq!(parsed.title, fm.title);
        assert_eq!(parsed.slug, fm.slug);
        assert_eq!(parsed.sources.len(), 1);
        assert_eq!(parsed.sources[0].file, "source.txt");
        assert_eq!(parsed.sources[0].hash, "abc123def456");
        assert_eq!(parsed.created, fm.created);
        assert_eq!(parsed.updated, fm.updated);
        assert_eq!(parsed.tags, fm.tags);
        assert_eq!(parsed.summary, fm.summary);
        assert_eq!(parsed.related, fm.related);
    }

    #[test]
    fn test_frontmatter_with_special_chars() {
        let fm = WikiFrontmatter {
            title: "He said \"hello\" to the world".to_string(),
            slug: "special-chars".to_string(),
            sources: vec![],
            created: "2026-04-06T12:00:00Z".to_string(),
            updated: "2026-04-06T12:00:00Z".to_string(),
            tags: vec![],
            summary: "A \"quoted\" summary".to_string(),
            related: vec![],
        };

        let yaml = fm.to_yaml();
        let inner = yaml
            .strip_prefix("---\n")
            .unwrap()
            .strip_suffix("---")
            .unwrap();
        let parsed = WikiFrontmatter::from_yaml(inner).unwrap();

        assert_eq!(parsed.title, fm.title);
        assert_eq!(parsed.summary, fm.summary);
    }

    #[test]
    fn test_parse_article_splits_correctly() {
        let article = r#"---
title: "Test Article"
slug: "test-article"
sources:
  - file: "source.txt"
    hash: "abc123"
created: "2026-04-06T12:00:00Z"
updated: "2026-04-06T12:00:00Z"
tags: ["test"]
summary: "A test article"
related: []
---

# Test Article

This is the body content.
"#;

        let (fm, body) = parse_article(article).unwrap();
        assert_eq!(fm.title, "Test Article");
        assert_eq!(fm.slug, "test-article");
        assert!(body.contains("This is the body content."));
        assert!(body.starts_with("# Test Article"));
    }
}
