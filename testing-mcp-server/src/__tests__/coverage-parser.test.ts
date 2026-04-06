import { describe, it, expect } from "vitest";
import { parseCoverageReport } from "../parsers/coverage-parser.js";

const COVERAGE_FIXTURE = JSON.stringify({
  "/project/src/math.ts": {
    fnMap: {
      "0": { name: "add", decl: { start: { line: 1 } } },
      "1": { name: "subtract", decl: { start: { line: 5 } } },
      "2": { name: "multiply", decl: { start: { line: 9 } } },
    },
    f: { "0": 5, "1": 3, "2": 0 },
    s: { "0": 5, "1": 5, "2": 3, "3": 3, "4": 0, "5": 0 },
    statementMap: {
      "0": {},
      "1": {},
      "2": {},
      "3": {},
      "4": {},
      "5": {},
    },
  },
  "/project/src/utils.ts": {
    fnMap: {
      "0": { name: "format", decl: { start: { line: 1 } } },
      "1": { name: "parse", decl: { start: { line: 10 } } },
    },
    f: { "0": 10, "1": 7 },
    s: { "0": 10, "1": 7 },
    statementMap: { "0": {}, "1": {} },
  },
});

describe("parseCoverageReport", () => {
  it("identifies files with uncovered functions", () => {
    const gaps = parseCoverageReport(COVERAGE_FIXTURE);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].file).toBe("/project/src/math.ts");
    expect(gaps[0].totalFunctions).toBe(3);
    expect(gaps[0].coveredFunctions).toBe(2);
    expect(gaps[0].uncoveredFunctions).toEqual(["multiply"]);
  });

  it("reports statement coverage counts", () => {
    const gaps = parseCoverageReport(COVERAGE_FIXTURE);
    expect(gaps[0].totalStatements).toBe(6);
    expect(gaps[0].coveredStatements).toBe(4);
  });

  it("omits fully covered files", () => {
    const gaps = parseCoverageReport(COVERAGE_FIXTURE);
    const utilsGap = gaps.find((g) => g.file.includes("utils.ts"));
    expect(utilsGap).toBeUndefined();
  });

  it("returns empty array when all functions are covered", () => {
    const allCovered = JSON.stringify({
      "/project/src/utils.ts": {
        fnMap: { "0": { name: "format" } },
        f: { "0": 5 },
        s: { "0": 5 },
        statementMap: { "0": {} },
      },
    });
    const gaps = parseCoverageReport(allCovered);
    expect(gaps).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCoverageReport("not json")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseCoverageReport("")).toThrow();
  });
});
