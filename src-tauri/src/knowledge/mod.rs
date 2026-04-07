pub mod frontmatter;
pub mod index;
pub mod ingest;
pub mod lint;
pub mod query;
#[cfg(test)]
pub(crate) mod test_helpers;
pub mod types;

use std::path::{Path, PathBuf};

use crate::ai::provider::AiProvider;
use types::{IngestResult, KnowledgeError, LintReport, QueryResult, SourceInput};

pub struct KnowledgeEngine {
    knowledge_dir: PathBuf,
    write_lock: tokio::sync::Mutex<()>,
}

impl KnowledgeEngine {
    pub fn new(knowledge_dir: PathBuf) -> Self {
        // Create directory structure: raw/, wiki/
        std::fs::create_dir_all(knowledge_dir.join("raw")).ok();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).ok();
        Self {
            knowledge_dir,
            write_lock: tokio::sync::Mutex::new(()),
        }
    }

    pub fn knowledge_dir(&self) -> &Path {
        &self.knowledge_dir
    }

    pub fn raw_dir(&self) -> PathBuf {
        self.knowledge_dir.join("raw")
    }

    pub fn wiki_dir(&self) -> PathBuf {
        self.knowledge_dir.join("wiki")
    }

    pub fn index_path(&self) -> PathBuf {
        self.knowledge_dir.join("index.md")
    }

    pub async fn ingest(
        &self,
        source: SourceInput,
        provider: &dyn AiProvider,
    ) -> Result<IngestResult, KnowledgeError> {
        let _guard = self.write_lock.lock().await; // WIKI-05: serialize writes
        ingest::ingest_source(&self.knowledge_dir, &source, provider).await
    }

    pub async fn query(
        &self,
        question: &str,
        provider: &dyn AiProvider,
    ) -> Result<QueryResult, KnowledgeError> {
        // No lock needed -- read-only operation (per D-12)
        query::query_wiki(&self.knowledge_dir, question, provider).await
    }

    pub async fn lint(
        &self,
        provider: &dyn AiProvider,
    ) -> Result<LintReport, KnowledgeError> {
        // Lint is read-only analysis -- no write lock needed
        lint::lint_wiki(&self.knowledge_dir, provider).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::knowledge::test_helpers::MockProvider;
    use types::SourceType;

    #[tokio::test]
    async fn test_concurrent_ingest_serializes() {
        let dir = tempfile::tempdir().unwrap();
        let engine = KnowledgeEngine::new(dir.path().to_path_buf());

        let mock_response_1 = serde_json::json!({
            "title": "Article One",
            "slug": "article-one",
            "tags": ["test"],
            "summary": "First article",
            "related": [],
            "content": "Content of article one with enough text to pass lint thresholds and be a real article."
        })
        .to_string();
        let mock_response_2 = serde_json::json!({
            "title": "Article Two",
            "slug": "article-two",
            "tags": ["test"],
            "summary": "Second article",
            "related": [],
            "content": "Content of article two with enough text to pass lint thresholds and be a real article."
        })
        .to_string();

        let provider1 = MockProvider {
            response: mock_response_1,
        };
        let provider2 = MockProvider {
            response: mock_response_2,
        };

        let source1 = SourceInput {
            name: "source1.txt".to_string(),
            content: "Raw content for source one".to_string(),
            source_type: SourceType::File,
        };
        let source2 = SourceInput {
            name: "source2.txt".to_string(),
            content: "Raw content for source two".to_string(),
            source_type: SourceType::File,
        };

        // Spawn two concurrent ingest operations
        let (result1, result2) = tokio::join!(
            engine.ingest(source1, &provider1),
            engine.ingest(source2, &provider2),
        );

        // Both should succeed (not corrupt each other)
        assert!(
            result1.is_ok(),
            "First concurrent ingest failed: {:?}",
            result1.err()
        );
        assert!(
            result2.is_ok(),
            "Second concurrent ingest failed: {:?}",
            result2.err()
        );

        // Index.md should contain exactly 2 entries (not corrupted by concurrent writes)
        let entries = index::read_index(&engine.index_path()).unwrap();
        assert_eq!(
            entries.len(),
            2,
            "Index should have exactly 2 entries after concurrent ingest, got {}",
            entries.len()
        );

        // Both articles should exist on disk
        assert!(engine.wiki_dir().join("article-one.md").exists());
        assert!(engine.wiki_dir().join("article-two.md").exists());
    }
}
