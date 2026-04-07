# Phase 44: MCP Server Wiki Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 44-mcp-server-wiki-tools
**Areas discussed:** Dynamic tool registration, Query response shape, Ingest flow & acknowledgment, Error & edge cases

---

## Dynamic Tool Registration

### How should plugin-contributed MCP tools be loaded?

| Option | Description | Selected |
|--------|-------------|----------|
| Plugin manifest read at startup | MCP server reads manifests on startup, merges declared mcp_tools. Restart required for changes. | ✓ |
| DB-driven registry | Plugins register tools in SQLite. MCP server queries DB on each ListTools call. Hot-reloadable. | |
| Hybrid -- manifest + file watch | Read manifests at startup, watch for changes and hot-reload. | |

**User's choice:** Plugin manifest read at startup
**Notes:** None

### Should existing hardcoded tools be migrated to the manifest system?

| Option | Description | Selected |
|--------|-------------|----------|
| Plugin tools only | Keep existing hardcoded. Only plugin-contributed tools from manifests. | ✓ |
| Migrate all tools | Move all existing tools into manifest format. Bigger refactor. | |

**User's choice:** Plugin tools only
**Notes:** None

### Where should MCP tool handler code live for plugin-contributed tools?

| Option | Description | Selected |
|--------|-------------|----------|
| In the plugin directory | Each plugin provides handler module. MCP server dynamically imports based on manifest path. | ✓ |
| In mcp-server/src/tools/ | Wiki handlers alongside existing tools. Manifest only declares schema. | |
| You decide | Claude's discretion. | |

**User's choice:** In the plugin directory
**Notes:** None

---

## Query Response Shape

### What should wiki_query return?

| Option | Description | Selected |
|--------|-------------|----------|
| Matched articles in full | Search index.md, return full markdown of matches. | |
| Index excerpt + summaries | Return index entries with summaries. Agent requests full articles separately. | |
| Paginated results | First N articles with cursor. | |

**User's choice:** Other -- clarified that wiki articles ARE summaries (compiled from raw). Return full articles with file paths. Summaries + file paths.
**Notes:** "The articles are already summaries! Full articles of summaries of the raw."

### How should the query search work?

| Option | Description | Selected |
|--------|-------------|----------|
| Index.md scan | Search index.md for relevant entries, return full wiki articles for matches. | ✓ |
| Pass through to Phase 42 query engine | Thin wrapper forwarding to whatever query logic Phase 42 builds. | |
| You decide | Claude's discretion. | |

**User's choice:** Index.md scan
**Notes:** None

---

## Ingest Flow & Acknowledgment

### Should wiki_ingest be fire-and-forget or wait for completion?

| Option | Description | Selected |
|--------|-------------|----------|
| Fire-and-forget with ack | Queue operation, return immediately with operation ID + "accepted". | ✓ |
| Synchronous -- wait for completion | Block until ingest completes. Simpler but slow. | |
| You decide | Claude's discretion. | |

**User's choice:** Fire-and-forget with ack
**Notes:** None

### What should the agent provide to wiki_ingest?

| Option | Description | Selected |
|--------|-------------|----------|
| File path only | Agent provides path to raw source file. Keeps payloads small. | ✓ |
| Raw content inline | Agent sends document content directly. | |
| Either -- path or content | Accept both forms. | |

**User's choice:** File path only
**Notes:** None

---

## Error & Edge Cases

### What happens when wiki doesn't exist (no .knowledge/ directory)?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear error message | Return MCP error: "Wiki not initialized. Enable the knowledge plugin first." | ✓ |
| Auto-initialize empty wiki | Create .knowledge/ structure on first call. | |
| You decide | Claude's discretion. | |

**User's choice:** Clear error message
**Notes:** None

### When a query finds no matching articles?

| Option | Description | Selected |
|--------|-------------|----------|
| Empty results array | Return success with empty list. Standard pattern. | |
| Specific 'no results' message | Return text message like "No wiki articles matched your query." | ✓ |
| You decide | Claude's discretion. | |

**User's choice:** Specific 'no results' message
**Notes:** None

### When wiki_ingest gets a bad file path?

| Option | Description | Selected |
|--------|-------------|----------|
| Fail immediately | Validate path exists before queuing. Return synchronous error. | ✓ |
| Queue and fail later | Accept optimistically, worker discovers bad path. | |
| You decide | Claude's discretion. | |

**User's choice:** Fail immediately
**Notes:** None

---

## Claude's Discretion

- MCP tool input schema design (parameter names, types, descriptions)
- Exact format of the acknowledgment response for wiki_ingest
- How to discover plugin manifest locations at startup
- Internal structure of the dynamic tool router alongside hardcoded tools

## Deferred Ideas

None -- discussion stayed within phase scope
