#!/usr/bin/env bash
set -uo pipefail

# Emergency bypass (D-06)
if [ "${SKIP_HOOKS:-0}" = "1" ]; then
  exit 0
fi

# Consume stdin to prevent pipe buffering hangs (Research pitfall 4)
INPUT=$(cat)

# Set project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

ERRORS=""

# Detect staged files by stack
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' || true)
STAGED_RS=$(git diff --cached --name-only --diff-filter=ACM -- '*.rs' || true)

# Format staged TS files (D-02, D-04, D-05)
if [ -n "$STAGED_TS" ]; then
  echo "$STAGED_TS" | xargs npx biome format --write 2>/dev/null
  echo "$STAGED_TS" | xargs git add
fi

# Format staged Rust files (D-05)
if [ -n "$STAGED_RS" ]; then
  echo "$STAGED_RS" | xargs rustfmt 2>/dev/null
  echo "$STAGED_RS" | xargs git add
fi

# Lint TS (D-01)
if [ -n "$STAGED_TS" ]; then
  if ! npx biome check src/ 2>&1; then
    ERRORS="${ERRORS}TypeScript lint failed (biome check)\n"
  fi
fi

# Lint Rust (D-01)
if [ -n "$STAGED_RS" ]; then
  if ! cargo clippy --manifest-path "$PROJECT_DIR/src-tauri/Cargo.toml" -- -D warnings 2>&1; then
    ERRORS="${ERRORS}Rust lint failed (cargo clippy)\n"
  fi
fi

# Test TS (D-01)
if [ -n "$STAGED_TS" ]; then
  if ! npx vitest run 2>&1; then
    ERRORS="${ERRORS}TypeScript tests failed (vitest run)\n"
  fi
fi

# Test Rust (D-01)
if [ -n "$STAGED_RS" ]; then
  if ! cargo test --manifest-path "$PROJECT_DIR/src-tauri/Cargo.toml" 2>&1; then
    ERRORS="${ERRORS}Rust tests failed (cargo test)\n"
  fi
fi

# Gate: block commit on any failure
if [ -n "$ERRORS" ]; then
  echo -e "Pre-commit blocked. Fix these issues:\n$ERRORS" >&2
  exit 2
fi

exit 0
