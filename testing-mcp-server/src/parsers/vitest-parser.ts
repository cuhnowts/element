import type { TestEntry, TestResult } from "../types.js";

interface VitestAssertionResult {
  fullName: string;
  ancestorTitles: string[];
  status: string;
  duration: number;
  failureMessages: string[];
}

interface VitestTestResult {
  name: string;
  assertionResults: VitestAssertionResult[];
}

interface VitestJsonOutput {
  testResults: VitestTestResult[];
}

export function parseVitestOutput(jsonString: string): TestResult[] {
  let data: VitestJsonOutput;
  try {
    data = JSON.parse(jsonString) as VitestJsonOutput;
  } catch (err) {
    throw new Error(
      `Failed to parse Vitest JSON output: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const results: TestResult[] = [];

  for (const testFile of data.testResults ?? []) {
    for (const assertion of testFile.assertionResults ?? []) {
      const status = mapVitestStatus(assertion.status);
      results.push({
        runner: "vitest",
        file: testFile.name,
        name: assertion.fullName,
        suite:
          assertion.ancestorTitles.length > 0
            ? assertion.ancestorTitles.join(" > ")
            : undefined,
        status,
        duration: assertion.duration,
        error:
          assertion.failureMessages.length > 0
            ? assertion.failureMessages.join("\n")
            : undefined,
      });
    }
  }

  return results;
}

function mapVitestStatus(
  status: string,
): TestResult["status"] {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "pending":
    case "skipped":
      return "pending";
    case "todo":
      return "todo";
    default:
      return "failed";
  }
}

interface VitestListEntry {
  file: string;
  name: string;
  suite?: string;
}

export function parseVitestList(jsonString: string): TestEntry[] {
  let data: VitestListEntry[];
  try {
    data = JSON.parse(jsonString) as VitestListEntry[];
  } catch (err) {
    throw new Error(
      `Failed to parse Vitest list output: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return data.map((entry) => ({
    runner: "vitest" as const,
    file: entry.file,
    name: entry.name,
    suite: entry.suite,
  }));
}
