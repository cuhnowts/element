#!/bin/bash
# Unified lint + format check for TypeScript and Rust
# Runs checks in parallel per D-03, reports all failures per D-04

set -o pipefail

ts_result=0
rust_result=0

echo "=== TypeScript (Biome) ==="
npx biome check src/ &
ts_pid=$!

echo "=== Rust (clippy + rustfmt) ==="
(cd src-tauri && cargo clippy -- -D warnings && cargo fmt --check) &
rust_pid=$!

wait $ts_pid || ts_result=$?
wait $rust_pid || rust_result=$?

echo ""
echo "=== Results ==="
if [ $ts_result -eq 0 ]; then
  echo "TypeScript: PASS"
else
  echo "TypeScript: FAIL (exit $ts_result)"
fi

if [ $rust_result -eq 0 ]; then
  echo "Rust: PASS"
else
  echo "Rust: FAIL (exit $rust_result)"
fi

if [ $ts_result -ne 0 ] || [ $rust_result -ne 0 ]; then
  echo ""
  echo "Some checks failed."
  exit 1
fi

echo ""
echo "All checks passed."
exit 0
