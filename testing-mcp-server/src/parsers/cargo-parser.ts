import type { TestEntry, TestResult } from "../types.js";

const TEST_LINE_RE = /^test (.+) \.\.\. (ok|FAILED|ignored)$/gm;
const FAILURE_SECTION_RE =
  /---- (.+?) stdout ----\n([\s\S]*?)(?=\n---- |\nfailures:|$)/g;

export function parseCargoTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): TestResult[] {
  const results: TestResult[] = [];
  const failureDetails = new Map<string, string>();

  // Extract failure details from the "failures:" section
  for (const match of stdout.matchAll(FAILURE_SECTION_RE)) {
    failureDetails.set(match[1], match[2].trim());
  }

  // Parse test result lines
  for (const match of stdout.matchAll(TEST_LINE_RE)) {
    const fullPath = match[1];
    const outcome = match[2];
    const { module, name } = splitModulePath(fullPath);

    const status: TestResult["status"] =
      outcome === "ok" ? "passed" : outcome === "FAILED" ? "failed" : "ignored";

    results.push({
      runner: "cargo",
      file: "",
      name,
      suite: module || undefined,
      status,
      error: failureDetails.get(fullPath),
    });
  }

  // Handle compilation failure: non-zero exit, no test lines found
  if (results.length === 0 && exitCode !== 0 && stderr.length > 0) {
    results.push({
      runner: "cargo",
      file: "",
      name: "compilation",
      status: "failed",
      error: stderr,
    });
  }

  return results;
}

export function parseCargoTestList(stdout: string): TestEntry[] {
  const entries: TestEntry[] = [];
  const listRe = /^(.+): test$/gm;

  for (const match of stdout.matchAll(listRe)) {
    const fullPath = match[1];
    const { module, name } = splitModulePath(fullPath);

    entries.push({
      runner: "cargo",
      file: "",
      name,
      suite: module || undefined,
    });
  }

  return entries;
}

function splitModulePath(fullPath: string): {
  module: string;
  name: string;
} {
  const parts = fullPath.split("::");
  if (parts.length <= 1) {
    return { module: "", name: fullPath };
  }
  const name = parts[parts.length - 1];
  const module = parts.slice(0, -1).join("::");
  return { module, name };
}
