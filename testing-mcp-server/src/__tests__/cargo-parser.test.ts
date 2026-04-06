import { describe, it, expect } from "vitest";
import {
  parseCargoTestOutput,
  parseCargoTestList,
} from "../parsers/cargo-parser.js";

const CARGO_OUTPUT_FIXTURE = `
running 3 tests
test commands::shell::tests::test_allowed ... ok
test commands::shell::tests::test_blocked ... FAILED
test commands::shell::tests::test_ignored ... ignored

test result: FAILED. 1 passed; 1 failed; 1 ignored; 0 measured; 0 filtered out

failures:

---- commands::shell::tests::test_blocked stdout ----
thread 'commands::shell::tests::test_blocked' panicked at 'assertion failed'
note: run with \`RUST_BACKTRACE=1\` environment variable to display a backtrace
`;

const CARGO_LIST_FIXTURE = `commands::shell::tests::test_allowed: test
commands::shell::tests::test_blocked: test
db::queries::tests::test_insert: test
`;

describe("parseCargoTestOutput", () => {
  it("parses ok, FAILED, and ignored test results", () => {
    const results = parseCargoTestOutput(CARGO_OUTPUT_FIXTURE, "", 1);
    expect(results).toHaveLength(3);

    const passed = results.find((r) => r.status === "passed");
    expect(passed).toBeDefined();
    expect(passed!.name).toBe("test_allowed");
    expect(passed!.suite).toBe("commands::shell::tests");
    expect(passed!.runner).toBe("cargo");

    const failed = results.find((r) => r.status === "failed");
    expect(failed).toBeDefined();
    expect(failed!.name).toBe("test_blocked");
    expect(failed!.error).toContain("assertion failed");

    const ignored = results.find((r) => r.status === "ignored");
    expect(ignored).toBeDefined();
    expect(ignored!.name).toBe("test_ignored");
  });

  it("extracts file as empty string (cargo doesn't report files)", () => {
    const results = parseCargoTestOutput(CARGO_OUTPUT_FIXTURE, "", 1);
    // Cargo tests don't have file paths, suite serves as location
    expect(results[0].file).toBe("");
  });

  it("handles compilation failure", () => {
    const stderr = `error[E0308]: mismatched types
  --> src/main.rs:10:5
   |
10 |     "hello"
   |     ^^^^^^^ expected i32, found &str`;
    const results = parseCargoTestOutput("", stderr, 101);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("error[E0308]");
    expect(results[0].name).toBe("compilation");
  });

  it("returns empty array for successful run with no tests", () => {
    const results = parseCargoTestOutput(
      "running 0 tests\n\ntest result: ok. 0 passed; 0 failed;",
      "",
      0,
    );
    expect(results).toEqual([]);
  });
});

describe("parseCargoTestList", () => {
  it("parses test entries from cargo test --list output", () => {
    const entries = parseCargoTestList(CARGO_LIST_FIXTURE);
    expect(entries).toHaveLength(3);

    expect(entries[0].runner).toBe("cargo");
    expect(entries[0].name).toBe("test_allowed");
    expect(entries[0].suite).toBe("commands::shell::tests");

    expect(entries[2].name).toBe("test_insert");
    expect(entries[2].suite).toBe("db::queries::tests");
  });

  it("returns empty array for empty output", () => {
    const entries = parseCargoTestList("");
    expect(entries).toEqual([]);
  });
});
