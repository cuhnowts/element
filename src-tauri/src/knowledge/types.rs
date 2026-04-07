use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceInput {
    pub name: String,
    pub content: String,
    pub source_type: SourceType,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SourceType {
    File,
    Url,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngestResult {
    pub slug: String,
    pub title: String,
    pub source_hash: String,
    pub was_noop: bool,
    pub article_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryResult {
    pub answer: String,
    pub sources: Vec<QuerySource>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuerySource {
    pub slug: String,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LintReport {
    pub timestamp: String,
    pub article_count: usize,
    pub issues: Vec<LintIssue>,
    pub summary: LintSummary,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LintIssue {
    pub category: LintCategory,
    pub severity: LintSeverity,
    pub article: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LintCategory {
    StaleSources,
    BrokenWikilinks,
    ThinArticles,
    OrphanPages,
    Contradictions,
}

impl std::fmt::Display for LintCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LintCategory::StaleSources => write!(f, "stale_sources"),
            LintCategory::BrokenWikilinks => write!(f, "broken_wikilinks"),
            LintCategory::ThinArticles => write!(f, "thin_articles"),
            LintCategory::OrphanPages => write!(f, "orphan_pages"),
            LintCategory::Contradictions => write!(f, "contradictions"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum LintSeverity {
    Error,
    Warning,
    Info,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LintSummary {
    pub total_issues: usize,
    pub by_category: std::collections::HashMap<String, usize>,
}

#[derive(Debug)]
pub enum KnowledgeError {
    IoError(String),
    AiError(String),
    ParseError(String),
    NotFound(String),
}

impl std::fmt::Display for KnowledgeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KnowledgeError::IoError(msg) => write!(f, "IO error: {}", msg),
            KnowledgeError::AiError(msg) => write!(f, "AI error: {}", msg),
            KnowledgeError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            KnowledgeError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}
