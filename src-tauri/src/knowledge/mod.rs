pub mod frontmatter;
pub mod index;
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
        _source: SourceInput,
        _provider: &dyn AiProvider,
    ) -> Result<IngestResult, KnowledgeError> {
        todo!()
    }

    pub async fn query(
        &self,
        _question: &str,
        _provider: &dyn AiProvider,
    ) -> Result<QueryResult, KnowledgeError> {
        todo!()
    }

    pub async fn lint(
        &self,
        _provider: &dyn AiProvider,
    ) -> Result<LintReport, KnowledgeError> {
        todo!()
    }
}
