# Phase 44: MCP Server Wiki Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 44-mcp-server-wiki-tools
**Areas discussed:** Query tool design, Ingest tool design, Dynamic registration, Error & access model

---

## Query Tool Design

### How should wiki_query find relevant articles?

| Option | Description | Selected |
|--------|-------------|----------|
| Natural language query | Agent sends a question/topic string. MCP server reads index.md, identifies relevant articles, returns content. | ✓ |
| Direct article path | Agent requests a specific wiki article by path. Simpler but requires knowing article names. | |
| Both modes | Support both natural-language lookup and direct path retrieval. | |

**User's choice:** Natural language query
**Notes:** None

### What should wiki_query return?

| Option | Description | Selected |
|--------|-------------|----------|
| Raw markdown of matched articles | Return full markdown content of relevant articles. | |
| Structured JSON with metadata | Articles wrapped in JSON with title, path, source_hash, last_updated. | |
| Index + content | Return index.md first, then content of matched articles. | |

**User's choice:** Other — clarified that there should be a layer of compaction and summarization from raw before entering the wiki (Karpathy-style). Query returns compiled wiki articles, not raw source docs.
**Notes:** "No there should be a layer of compaction and summarization from raw before entering into the wiki. This is how karpathy did it"

### Should wiki_query return just matching article content, or also include index.md?

| Option | Description | Selected |
|--------|-------------|----------|
| Matching articles only | Return compiled wiki articles relevant to the query. Token-efficient. | ✓ |
| Index + matching articles | Include index.md alongside matched content. | |
| You decide | Claude's discretion. | |

**User's choice:** Matching articles only

### Should there be a separate tool to browse the wiki index?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, wiki_index tool | Separate tool returns index.md contents. Agent can browse first, then query. | ✓ |
| No, just wiki_query | Keep to one query tool. Broad queries serve as index browsing. | |
| You decide | Claude's discretion. | |

**User's choice:** Yes, wiki_index tool

---

## Ingest Tool Design

### What should wiki_ingest accept as input?

| Option | Description | Selected |
|--------|-------------|----------|
| Raw text content | Agent passes document content directly as string. Wiki engine compiles it. | ✓ |
| File path on disk | Agent provides path to a file. MCP server reads it. | |
| Both text and path | Accept either raw text or file path. | |

**User's choice:** Raw text content

### How should the ingest acknowledgment work?

| Option | Description | Selected |
|--------|-------------|----------|
| Async job accepted | Returns immediately with 'operation accepted'. Ingest runs through agent queue. | ✓ |
| Sync with result | Wait for ingest to complete, return compiled article paths. | |
| Async with poll tool | Return job ID, add wiki_job_status tool for checking. | |

**User's choice:** Async job accepted

### Should wiki_ingest require a source title/label?

| Option | Description | Selected |
|--------|-------------|----------|
| Required title parameter | Agent must provide human-readable title for the source. | ✓ |
| Optional title | Title optional, auto-generated if omitted. | |
| You decide | Claude's discretion. | |

**User's choice:** Required title parameter

---

## Dynamic Registration

### How should the MCP server discover plugin-declared tools?

| Option | Description | Selected |
|--------|-------------|----------|
| Read plugin manifests at startup | Scan plugin directories for mcp_tools declarations. Existing hardcoded tools stay. | ✓ |
| Tauri backend feeds tool list | MCP server asks Tauri backend via DB/IPC for registered plugin tools. | |
| You decide | Claude's discretion. | |

**User's choice:** Read plugin manifests at startup

### Should existing hardcoded MCP tools be migrated?

| Option | Description | Selected |
|--------|-------------|----------|
| No, just wiki tools dynamic | Existing tools stay hardcoded. Only wiki tools use dynamic registration. | ✓ |
| Yes, migrate all tools | Convert all existing tools to manifest-based system. | |
| You decide | Claude's discretion. | |

**User's choice:** No, just wiki tools dynamic

### How should dynamic tools call wiki operations?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct filesystem access | MCP server reads .knowledge/ directly. For ingest, writes to agent queue table. | ✓ |
| IPC to Tauri backend | MCP server sends commands to Tauri app via IPC/socket. | |
| You decide | Claude's discretion. | |

**User's choice:** Direct filesystem access

---

## Error & Access Model

### What should wiki_query return when wiki is empty or no matches?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear message, no error | Return success with descriptive message. Agent decides what to do. | ✓ |
| Error response | Return MCP error. Forces agent to handle as exception. | |
| You decide | Claude's discretion. | |

**User's choice:** Clear message, no error

### Should wiki MCP tools have access restrictions?

| Option | Description | Selected |
|--------|-------------|----------|
| No restrictions | Same access model as existing MCP tools. Simple. | ✓ |
| Read-only by default | wiki_query always available, wiki_ingest requires explicit capability. | |
| You decide | Claude's discretion. | |

**User's choice:** No restrictions

---

## Claude's Discretion

- Manifest-to-tool-schema parsing implementation details
- Internal structure of dynamic tool router alongside hardcoded tools
- Agent queue table schema for async ingest

## Deferred Ideas

None — discussion stayed within phase scope
