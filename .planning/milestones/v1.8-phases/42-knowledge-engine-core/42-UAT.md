---
status: complete
phase: 42-knowledge-engine-core
source: [42-01-SUMMARY.md, 42-02-SUMMARY.md, 42-03-SUMMARY.md]
started: 2026-04-07T12:00:00Z
updated: 2026-04-07T12:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Ingest a File into Wiki
expected: Invoke knowledge_ingest via hub chat or UI, article created in .knowledge/
result: issue
reported: "Knowledge engine is hardcoded as Tauri commands. Should be a plugin surfaced through hub chat via prompt injection. This is not the implementation wanted."
severity: blocker

### 2. Ingest Text Directly
expected: Invoke knowledge_ingest_text, article created
result: skipped
reason: Blocked by architecture mismatch — hardcoded instead of plugin

### 3. Query the Wiki
expected: Query returns synthesized answer with citations
result: skipped
reason: Blocked by architecture mismatch — hardcoded instead of plugin

### 4. Re-ingest Same Content (No-op Detection)
expected: Duplicate detection works
result: skipped
reason: Blocked by architecture mismatch — hardcoded instead of plugin

### 5. Lint the Wiki
expected: Lint report returns category counts
result: skipped
reason: Blocked by architecture mismatch — hardcoded instead of plugin

## Summary

total: 5
passed: 0
issues: 1
pending: 0
skipped: 4
blocked: 0

## Gaps

- truth: "Knowledge engine should be a plugin surfaced through hub chat prompt injection, not hardcoded Tauri commands"
  status: failed
  reason: "User reported: Knowledge engine is hardcoded as core Tauri commands. Should be a plugin. User interacts through Element AI hub chat, it's just another prompt layered in as a skill. This is not the implementation wanted."
  severity: blocker
  test: 1
  artifacts:
    - path: "src-tauri/src/commands/knowledge_commands.rs"
      issue: "Hardcoded Tauri commands instead of plugin"
    - path: "src-tauri/src/knowledge/"
      issue: "Core module instead of plugin implementation"
  missing:
    - "Knowledge engine should be a plugin, not core"
    - "Surface through hub chat via prompt injection timing"
    - "No console invokes — user accesses through Element AI"
