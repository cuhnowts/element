#!/usr/bin/env bash
set -uo pipefail

# Emergency bypass (D-06)
if [ "${SKIP_HOOKS:-0}" = "1" ]; then
  exit 0
fi

# Read stdin JSON to prevent pipe buffering hang (Research pitfall 4)
INPUT=$(cat)

# Extract file_path from stdin JSON using bash builtins (no jq dependency)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# If no file_path found, exit silently
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Route by file extension: run related test suite
case "$FILE_PATH" in
  *.ts|*.tsx)
    npx vitest run --reporter=dot 2>&1 >&2 || true
    ;;
  *.rs)
    cargo test --manifest-path "${CLAUDE_PROJECT_DIR:-.}/src-tauri/Cargo.toml" 2>&1 >&2 || true
    ;;
  *)
    # Non-code files (CSS, JSON, MD, etc.) -- skip silently
    ;;
esac

# Always exit 0: PostToolUse must never block edits (Research pitfall 5)
# Test results are communicated via stderr output which Claude Code displays
exit 0
