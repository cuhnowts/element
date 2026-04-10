# Phase 42: Knowledge Engine Core - Research

**Researched:** 2026-04-06
**Domain:** Rust/Tauri file-based wiki engine with LLM compilation, query synthesis, and lint
**Confidence:** HIGH

## Summary

Phase 42 builds the core knowledge engine as a Rust module within the existing Tauri app. It produces three operations -- ingest (raw source to compiled wiki article), query (synthesized answer from wiki), and lint (quality checks) -- all operating on a `.knowledge/` directory tree. The engine uses the existing `AiProvider` trait and `AiGateway` for all LLM calls, `sha2` (already in Cargo.toml) for content hashing, `tokio::Mutex<()>` for write serialization, and YAML frontmatter in Markdown files for metadata.

This is a file-system-first design with no new dependencies. The wiki is a collection of Markdown files with YAML frontmatter, an index.md maintained by the LLM, and raw sources stored verbatim. All operations route through Tauri commands, consistent with the existing architecture. Phase 41 will provide the plugin registration mechanism, but the actual wiki logic is self-contained Rust code.

**Primary recommendation:** Build the knowledge engine as a standalone Rust module (`src-tauri/src/knowledge/`) with separate submodules for ingest, query, lint, and the operation queue. Register it as a core plugin in Phase 41's infrastructure, but keep the wiki logic decoupled from plugin abstractions so it can be tested independently.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Each raw source produces exactly one wiki article. One-to-one source-to-article mapping.
- **D-02:** Accepted source formats: any text-readable file plus URLs. PDF/binary deferred.
- **D-03:** Wiki articles named with LLM-generated slugs (e.g., `rust-error-handling.md`).
- **D-04:** Rich YAML frontmatter: title, sources (with content hashes), created/updated dates, tags, one-line summary, related article links.
- **D-05:** Query retrieval uses LLM reading full index.md to select relevant articles. No keyword pre-filter.
- **D-06:** Synthesized answers use footnote-style references [1][2] with source list at bottom.
- **D-07:** LLM selects 1-5 articles per query (LLM decides count, capped at 5).
- **D-08:** Query answers returned only, not persisted.
- **D-09:** Five lint categories: stale sources, broken wikilinks, thin articles, orphan pages, contradictions.
- **D-10:** Lint output format is Claude's discretion.
- **D-11:** Wiki mutations serialized via single in-process `tokio::Mutex<()>`.
- **D-12:** Single global mutex for all write types. Read operations bypass the lock.

### Claude's Discretion
- Index.md structure -- how to optimize for LLM query retrieval
- Re-ingest behavior -- no-op detection, update strategy, renamed source handling
- Knowledge directory layout beyond raw/, wiki/, index.md
- LLM prompt strategy -- system prompts for compilation, query, lint

### Deferred Ideas (OUT OF SCOPE)
- WIKI-08: Query results filed back as wiki articles
- WIKI-09: Batch ingest of multiple raw sources
- Vector search for large wikis (WIKI-07)
- PDF/binary ingest
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WIKI-01 | Ingest raw source into wiki, producing compiled articles with cross-references and updated index | Ingest pipeline architecture, LLM prompt design for compilation, frontmatter schema, index.md update strategy |
| WIKI-02 | Query wiki and receive synthesized answer from relevant articles | Query pipeline with LLM index scan, article retrieval, synthesis with citations |
| WIKI-03 | LLM-maintained index.md updated on every ingest | Index.md structure optimized for LLM retrieval, atomic update pattern |
| WIKI-04 | Lint identifies contradictions, stale claims, orphan pages | Five lint category implementations, LLM-powered contradiction detection |
| WIKI-05 | Operations serialized through operation queue preventing concurrent file corruption | `tokio::Mutex<()>` guard pattern for all write operations |
| WIKI-06 | Source hashes track staleness relative to raw sources | SHA-256 hashing with `sha2` crate, frontmatter hash comparison |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sha2 | 0.10 | Content hashing for WIKI-06 staleness detection | Already in Cargo.toml, standard Rust hashing |
| tokio | 1 (full features) | Async runtime + `tokio::Mutex` for operation queue | Already in Cargo.toml, project standard |
| serde + serde_json | 1 | Serialization for frontmatter, lint output, API types | Already in Cargo.toml |
| reqwest | 0.12 | URL fetching for URL-type sources (D-02) | Already in Cargo.toml |
| chrono | 0.4 | Timestamps in frontmatter (created/updated) | Already in Cargo.toml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| regex | 1 | Wikilink parsing for lint, slug validation | Already in Cargo.toml |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual YAML frontmatter parsing | `serde_yaml` crate | Not needed -- frontmatter is simple enough to parse with string splitting on `---` delimiters, avoiding a new dependency |
| `tokio::Mutex` | `tokio::mpsc` channel | STATE.md mentions mpsc, but CONTEXT.md D-11 explicitly chose `tokio::Mutex<()>` -- simpler for this use case |

**Installation:**
No new dependencies required. All libraries already in `Cargo.toml`.

**Zero new dependencies** -- consistent with v1.8 roadmap decision (STATE.md).

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/src/knowledge/
    mod.rs           # KnowledgeEngine struct, public API, tokio::Mutex
    ingest.rs        # Ingest pipeline: read source -> hash -> LLM compile -> write article -> update index
    query.rs         # Query pipeline: read index -> LLM select articles -> read articles -> LLM synthesize
    lint.rs          # Five lint categories: stale, broken links, thin, orphan, contradictions
    frontmatter.rs   # YAML frontmatter parse/serialize, WikiArticle struct
    index.rs         # Index.md read/write/update operations
    types.rs         # Shared types: IngestResult, QueryResult, LintReport, LintIssue
```

### .knowledge/ Directory Layout
```
.knowledge/
    index.md          # LLM-maintained article index (title, summary, tags per article)
    raw/
        {hash}-{original-name}   # Raw sources stored with content hash prefix for dedup
    wiki/
        rust-error-handling.md   # Compiled articles with YAML frontmatter
        tokio-async-patterns.md
```

### Pattern 1: KnowledgeEngine as Managed State
**What:** Single `KnowledgeEngine` struct managed by Tauri, holding `tokio::Mutex<()>` and knowledge directory path.
**When to use:** All wiki operations route through this struct.
**Example:**
```rust
pub struct KnowledgeEngine {
    knowledge_dir: PathBuf,
    write_lock: tokio::sync::Mutex<()>,
}

impl KnowledgeEngine {
    pub fn new(knowledge_dir: PathBuf) -> Self {
        std::fs::create_dir_all(knowledge_dir.join("raw")).ok();
        std::fs::create_dir_all(knowledge_dir.join("wiki")).ok();
        Self {
            knowledge_dir,
            write_lock: tokio::sync::Mutex::new(()),
        }
    }

    pub async fn ingest(&self, source: SourceInput, provider: &dyn AiProvider) -> Result<IngestResult, KnowledgeError> {
        let _guard = self.write_lock.lock().await;
        // ... ingest pipeline
    }

    pub async fn query(&self, question: &str, provider: &dyn AiProvider) -> Result<QueryResult, KnowledgeError> {
        // No lock needed -- read-only
        // ... query pipeline
    }

    pub async fn lint(&self, provider: &dyn AiProvider) -> Result<LintReport, KnowledgeError> {
        // Contradiction check is read-only (LLM analysis)
        // But if lint auto-fixes are added later, they'd need the lock
        // ... lint pipeline
    }
}
```

### Pattern 2: YAML Frontmatter in Markdown
**What:** Each wiki article starts with YAML frontmatter between `---` delimiters.
**When to use:** Every wiki article in `.knowledge/wiki/`.
**Example:**
```markdown
---
title: Rust Error Handling Patterns
slug: rust-error-handling
sources:
  - file: "rust-book-ch9.md"
    hash: "a1b2c3d4e5f6..."
created: 2026-04-06T12:00:00Z
updated: 2026-04-06T12:00:00Z
tags: [rust, error-handling, result-type]
summary: "Comprehensive guide to Result, Option, and the ? operator in Rust"
related: [tokio-async-patterns, rust-ownership-model]
---

# Rust Error Handling Patterns

[Compiled wiki content here...]
```

### Pattern 3: Index.md Structure (Claude's Discretion)
**What:** Machine-readable index optimized for LLM retrieval within ~2K token budget.
**When to use:** Updated on every ingest, read on every query.
**Example:**
```markdown
# Knowledge Index

## Articles

| Article | Tags | Summary |
|---------|------|---------|
| [Rust Error Handling](wiki/rust-error-handling.md) | rust, error-handling | Result, Option, ? operator patterns |
| [Tokio Async Patterns](wiki/tokio-async-patterns.md) | rust, async, tokio | Spawning, channels, select! macro |

## Tag Cloud
rust(2), error-handling(1), async(1), tokio(1)

*Last updated: 2026-04-06T12:00:00Z*
*Article count: 2*
```

**Rationale:** Markdown table format is token-efficient, scannable by LLM, and human-readable. Tag cloud helps LLM find thematic clusters. Article count helps detect drift.

### Pattern 4: Content Hash for Staleness (WIKI-06)
**What:** SHA-256 hash of raw source content stored in article frontmatter.
**When to use:** On ingest (compute and store), on re-ingest (compare for no-op detection).
**Example:**
```rust
use sha2::{Sha256, Digest};

fn compute_content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

// On re-ingest: compare hash
fn is_source_unchanged(knowledge_dir: &Path, source_name: &str, new_content: &str) -> bool {
    let new_hash = compute_content_hash(new_content);
    // Find existing article referencing this source, check frontmatter hash
    // Return true if hashes match (no-op)
}
```

### Anti-Patterns to Avoid
- **Embedding LLM prompts in Tauri commands:** Keep prompts in the knowledge module, not spread across command handlers. The commands should be thin wrappers.
- **Parsing frontmatter with regex:** Use simple `---` delimiter splitting and structured serde deserialization for the YAML block. Regex for YAML is fragile.
- **Holding the write lock during LLM calls:** The LLM call is the slow part (seconds). Acquire lock, do the file I/O only, release. If the LLM call must be inside the lock (to prevent stale reads), accept the serialization cost -- it's correct behavior per D-11.
- **Storing compiled content in SQLite:** The wiki is file-based by design. Files are the source of truth. No DB tables for wiki content.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash function | `sha2` crate (already in deps) | Cryptographic correctness, performance |
| URL content fetching | Manual HTTP + HTML stripping | `reqwest` (fetch) + simple tag stripping | reqwest already available; HTML stripping can be basic since LLM handles noisy input |
| Async mutex | `std::sync::Mutex` in async context | `tokio::sync::Mutex` | std Mutex blocks the executor thread; tokio Mutex is async-aware |
| YAML serialization | String concatenation for frontmatter | Simple struct-to-string with consistent field ordering | Avoid format inconsistencies that break re-parsing |

**Key insight:** This phase has zero new dependencies because the existing stack covers all needs. The complexity is in the LLM prompt design and pipeline orchestration, not in library selection.

## Common Pitfalls

### Pitfall 1: LLM-Generated Slug Collisions
**What goes wrong:** Two different sources produce the same slug (e.g., two articles about "rust error handling").
**Why it happens:** LLM generates human-readable names that can collide.
**How to avoid:** Check for existing slug before writing. If collision, append a numeric suffix (`rust-error-handling-2.md`). Include collision handling in ingest pipeline.
**Warning signs:** Overwritten wiki articles, broken index references.

### Pitfall 2: Index.md Grows Beyond LLM Context Window
**What goes wrong:** At 200 articles with rich summaries, index.md exceeds useful context size.
**Why it happens:** Each article entry adds ~50-100 tokens. 200 articles = 10K-20K tokens of index.
**How to avoid:** Keep index entries minimal (title + tags + one-line summary). Budget ~2K tokens for the index at 50 articles, ~8K tokens at 200 articles. The LLM can handle this within modern context windows. Monitor token usage.
**Warning signs:** Query latency increases, LLM starts ignoring articles at the bottom of the index.

### Pitfall 3: Frontmatter Parse/Serialize Round-Trip Drift
**What goes wrong:** Reading frontmatter and writing it back changes field ordering, quoting, or escaping.
**Why it happens:** YAML has multiple valid representations for the same data.
**How to avoid:** Define a canonical serialization format and always write frontmatter from the struct, never by modifying the raw string. Use consistent field ordering.
**Warning signs:** Git diffs show frontmatter changes on articles that weren't modified.

### Pitfall 4: Lock Held During LLM Compilation
**What goes wrong:** A 5-10 second LLM call blocks all other wiki writes.
**Why it happens:** The ingest pipeline acquires the lock before calling the LLM.
**How to avoid:** This is actually correct behavior per D-11/D-12. Accept the serialization cost. LLM calls are infrequent (user-triggered). If needed in the future, the pipeline could do LLM work outside the lock and only acquire for file I/O, but this adds complexity around stale reads. For Phase 42, keep it simple.
**Warning signs:** N/A -- this is expected behavior.

### Pitfall 5: URL Fetch Failures Silently Produce Bad Articles
**What goes wrong:** URL returns a 403, login page, or JavaScript-rendered content. LLM compiles garbage.
**Why it happens:** Many pages require JS rendering or authentication.
**How to avoid:** Check HTTP status code, verify content has reasonable length and appears text-like. Return clear error on fetch failure rather than passing garbage to LLM. Accept that some URLs won't work -- this is a known limitation.
**Warning signs:** Wiki articles with nonsensical content, articles about "please enable JavaScript."

### Pitfall 6: Re-Ingest of Changed Source Loses Manual Edits
**What goes wrong:** User manually edits a wiki article, then re-ingests the source. LLM overwrites manual edits.
**Why it happens:** Re-ingest replaces the compiled article entirely.
**How to avoid:** On re-ingest with changed source, the LLM recompiles from scratch. Document this behavior clearly. Future: could diff and merge, but that's complex. For Phase 42, full recompile on source change is acceptable.
**Warning signs:** User complaints about lost edits.

## Code Examples

### Tauri Command Pattern (thin wrapper)
```rust
// In src-tauri/src/commands/knowledge_commands.rs

#[tauri::command]
pub async fn knowledge_ingest(
    source_path: String,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
    engine: State<'_, KnowledgeEngine>,
) -> Result<IngestResult, String> {
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.get_default_provider(&db).map_err(|e| e.to_string())?
    };

    let content = tokio::fs::read_to_string(&source_path)
        .await
        .map_err(|e| format!("Failed to read source: {}", e))?;

    let source = SourceInput {
        name: PathBuf::from(&source_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        content,
        source_type: SourceType::File,
    };

    engine.ingest(source, provider.as_ref())
        .await
        .map_err(|e| e.to_string())
}
```

### Frontmatter Struct
```rust
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
    pub fn to_yaml(&self) -> String {
        // Consistent field ordering, no serde_yaml dependency
        let sources: Vec<String> = self.sources.iter()
            .map(|s| format!("  - file: \"{}\"\n    hash: \"{}\"", s.file, s.hash))
            .collect();
        let tags_str = self.tags.iter()
            .map(|t| format!("\"{}\"", t))
            .collect::<Vec<_>>()
            .join(", ");
        let related_str = self.related.iter()
            .map(|r| format!("\"{}\"", r))
            .collect::<Vec<_>>()
            .join(", ");

        format!(
            "---\ntitle: \"{}\"\nslug: \"{}\"\nsources:\n{}\ncreated: {}\nupdated: {}\ntags: [{}]\nsummary: \"{}\"\nrelated: [{}]\n---",
            self.title, self.slug,
            sources.join("\n"),
            self.created, self.updated,
            tags_str,
            self.summary.replace('"', "\\\""),
            related_str,
        )
    }

    pub fn from_yaml(yaml_str: &str) -> Result<Self, String> {
        // Parse YAML block between --- delimiters
        // Simple line-by-line parsing, no serde_yaml needed
        // ...
    }
}
```

### Lint Report Structure (Claude's Discretion)
```rust
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
    pub article: String,         // slug of affected article
    pub message: String,
    pub details: Option<String>, // extra context for contradictions
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum LintSeverity {
    Error,   // Stale sources, broken links
    Warning, // Thin articles, orphans
    Info,    // Contradictions (need human review)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LintSummary {
    pub total_issues: usize,
    pub by_category: std::collections::HashMap<String, usize>,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vector DB for knowledge retrieval | LLM reads full index (for small wikis) | Design decision for Phase 42 | Simpler, no embedding infra, works to ~200 articles |
| Separate YAML parser crate | Manual YAML frontmatter handling | Design decision for Phase 42 | Zero new dependencies, simpler for this narrow use case |
| Database-backed wiki storage | File-based .knowledge/ directory | Design decision for Phase 42 | Git-friendly, human-editable, portable |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in `#[test]` + `#[tokio::test]` |
| Config file | `src-tauri/Cargo.toml` ([dev-dependencies]: tempfile) |
| Quick run command | `cd src-tauri && cargo test knowledge --lib` |
| Full suite command | `cd src-tauri && cargo test --lib` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIKI-01 | Ingest produces wiki article + updates index | unit | `cd src-tauri && cargo test knowledge::ingest::tests -x` | Wave 0 |
| WIKI-02 | Query returns synthesized answer with citations | unit | `cd src-tauri && cargo test knowledge::query::tests -x` | Wave 0 |
| WIKI-03 | Index.md updated on every ingest | unit | `cd src-tauri && cargo test knowledge::index::tests -x` | Wave 0 |
| WIKI-04 | Lint detects stale/broken/thin/orphan/contradiction issues | unit | `cd src-tauri && cargo test knowledge::lint::tests -x` | Wave 0 |
| WIKI-05 | Concurrent writes serialize correctly | unit | `cd src-tauri && cargo test knowledge::tests::test_concurrent -x` | Wave 0 |
| WIKI-06 | Re-ingest unchanged source is no-op | unit | `cd src-tauri && cargo test knowledge::ingest::tests::test_noop_reingest -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test knowledge --lib`
- **Per wave merge:** `cd src-tauri && cargo test --lib`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/knowledge/mod.rs` -- KnowledgeEngine struct with tests
- [ ] `src-tauri/src/knowledge/ingest.rs` -- ingest pipeline with tests
- [ ] `src-tauri/src/knowledge/query.rs` -- query pipeline with tests
- [ ] `src-tauri/src/knowledge/lint.rs` -- lint categories with tests
- [ ] `src-tauri/src/knowledge/frontmatter.rs` -- parse/serialize with tests
- [ ] `src-tauri/src/knowledge/index.rs` -- index operations with tests
- [ ] `src-tauri/src/knowledge/types.rs` -- shared types

### Testing Strategy for LLM-Dependent Operations
LLM calls (ingest compilation, query synthesis, contradiction lint) cannot be deterministically tested. Strategy:
1. **Mock the AiProvider trait** -- create a `MockProvider` that returns canned responses for unit tests
2. **Test file I/O independently** -- frontmatter parsing, index updating, hash computation are all testable without LLM
3. **Test pipeline orchestration** -- verify that ingest calls the provider, writes files, updates index in correct order
4. **Concurrency test** -- spawn multiple ingest tasks, verify no file corruption

## Open Questions

1. **Index.md token budget validation**
   - What we know: User flagged ~2K tokens as target for index. Markdown table format is efficient.
   - What's unclear: Exact per-article token cost depends on summary length and tag count.
   - Recommendation: Build with table format, measure at 10/50/100 articles, adjust summary length constraint in LLM prompt if needed.

2. **HTML stripping for URL sources**
   - What we know: reqwest fetches raw HTML. LLM needs text content.
   - What's unclear: How much HTML stripping is needed vs. letting LLM handle noisy input.
   - Recommendation: Basic tag stripping (remove `<script>`, `<style>`, extract text content). Don't pull in a full HTML parser -- keep it simple, LLM is tolerant of some noise.

3. **Wikilink syntax**
   - What we know: Articles reference each other via `related` frontmatter field. Lint checks for broken links.
   - What's unclear: Whether to also support inline `[[wikilink]]` syntax in article body.
   - Recommendation: Support `[[slug]]` syntax in article body for cross-references. LLM prompt instructs it to use wikilinks. Lint checks both frontmatter `related` and inline `[[...]]` references.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src-tauri/Cargo.toml` -- verified sha2 0.10, tokio 1, reqwest 0.12 already present
- Codebase inspection: `src-tauri/src/ai/provider.rs` -- AiProvider trait with `complete` method for non-streaming LLM calls
- Codebase inspection: `src-tauri/src/ai/types.rs` -- CompletionRequest/CompletionResponse for LLM interaction
- Codebase inspection: `src-tauri/src/plugins/core/` -- core plugin registration pattern
- Codebase inspection: `src-tauri/src/lib.rs` -- app.manage() state pattern for Tauri

### Secondary (MEDIUM confidence)
- Phase 42 CONTEXT.md -- all locked decisions (D-01 through D-12)
- Phase 41 CONTEXT.md -- plugin infrastructure decisions (skill namespacing, owned directories)
- STATE.md -- v1.8 roadmap decisions (zero new dependencies, tokio-based concurrency)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in Cargo.toml, verified by inspection
- Architecture: HIGH - follows established Tauri patterns visible in codebase (managed state, command handlers, core plugin modules)
- Pitfalls: HIGH - derived from codebase patterns and common Rust async/file-system patterns

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependency changes expected)
