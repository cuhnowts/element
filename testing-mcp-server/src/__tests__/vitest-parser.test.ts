import { describe, it, expect } from "vitest";
import { parseVitestOutput, parseVitestList } from "../parsers/vitest-parser.js";

const VITEST_JSON_FIXTURE = JSON.stringify({
  numTotalTestSuites: 1,
  numPassedTestSuites: 1,
  numFailedTestSuites: 0,
  numTotalTests: 3,
  numPassedTests: 2,
  numFailedTests: 1,
  testResults: [
    {
      name: "/project/src/__tests__/math.test.ts",
      assertionResults: [
        {
          fullName: "math > adds numbers",
          ancestorTitles: ["math"],
          status: "passed",
          duration: 2,
          failureMessages: [],
        },
        {
          fullName: "math > subtracts numbers",
          ancestorTitles: ["math"],
          status: "passed",
          duration: 1,
          failureMessages: [],
        },
        {
          fullName: "math > divides by zero",
          ancestorTitles: ["math", "edge cases"],
          status: "failed",
          duration: 3,
          failureMessages: [
            "Error: expected 0 to be Infinity",
            "at Object.<anonymous> (math.test.ts:15:5)",
          ],
        },
      ],
    },
  ],
});

const VITEST_LIST_FIXTURE = JSON.stringify([
  {
    file: "/project/src/__tests__/math.test.ts",
    name: "adds numbers",
    suite: "math",
  },
  {
    file: "/project/src/__tests__/math.test.ts",
    name: "subtracts numbers",
    suite: "math",
  },
]);

describe("parseVitestOutput", () => {
  it("parses passed and failed tests from JSON reporter output", () => {
    const results = parseVitestOutput(VITEST_JSON_FIXTURE);
    expect(results).toHaveLength(3);

    const passed = results.filter((r) => r.status === "passed");
    expect(passed).toHaveLength(2);
    expect(passed[0].runner).toBe("vitest");
    expect(passed[0].name).toBe("math > adds numbers");
    expect(passed[0].duration).toBe(2);

    const failed = results.filter((r) => r.status === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0].name).toBe("math > divides by zero");
    expect(failed[0].error).toContain("expected 0 to be Infinity");
  });

  it("sets suite from ancestorTitles joined with ' > '", () => {
    const results = parseVitestOutput(VITEST_JSON_FIXTURE);
    const edgeCase = results.find((r) => r.name === "math > divides by zero");
    expect(edgeCase?.suite).toBe("math > edge cases");
  });

  it("extracts file path from testResults name", () => {
    const results = parseVitestOutput(VITEST_JSON_FIXTURE);
    expect(results[0].file).toBe("/project/src/__tests__/math.test.ts");
  });

  it("returns empty array for empty testResults", () => {
    const results = parseVitestOutput(
      JSON.stringify({ testResults: [] }),
    );
    expect(results).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseVitestOutput("not json")).toThrow();
  });
});

describe("parseVitestList", () => {
  it("parses test entries from vitest list JSON output", () => {
    const entries = parseVitestList(VITEST_LIST_FIXTURE);
    expect(entries).toHaveLength(2);
    expect(entries[0].runner).toBe("vitest");
    expect(entries[0].file).toBe("/project/src/__tests__/math.test.ts");
    expect(entries[0].name).toBe("adds numbers");
    expect(entries[0].suite).toBe("math");
  });

  it("returns empty array for empty list", () => {
    const entries = parseVitestList("[]");
    expect(entries).toEqual([]);
  });
});
