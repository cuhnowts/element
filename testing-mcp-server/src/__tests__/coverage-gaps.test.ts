import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCheckCoverageGaps } from "../tools/coverage-gaps.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

const mockReadFile = vi.mocked(readFile);

const COVERAGE_JSON = JSON.stringify({
  "/project/src/math.ts": {
    fnMap: {
      "0": { name: "add" },
      "1": { name: "subtract" },
      "2": { name: "multiply" },
    },
    f: { "0": 5, "1": 3, "2": 0 },
    s: { "0": 5, "1": 3, "2": 0 },
    statementMap: { "0": {}, "1": {}, "2": {} },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleCheckCoverageGaps", () => {
  it("reads and parses coverage report from default path", async () => {
    mockReadFile.mockResolvedValueOnce(COVERAGE_JSON);

    const result = await handleCheckCoverageGaps("/project", {});
    const data = JSON.parse(result.content[0].text);

    expect(data.summary.totalFiles).toBe(1);
    expect(data.summary.totalUncoveredFunctions).toBe(1);
    expect(data.gaps[0].uncoveredFunctions).toEqual(["multiply"]);

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining("coverage/coverage-final.json"),
      "utf-8",
    );
  });

  it("returns helpful error when coverage file not found", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    mockReadFile.mockRejectedValueOnce(err);

    const result = await handleCheckCoverageGaps("/project", {});
    const data = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(data.error).toContain("Coverage report not found");
    expect(data.error).toContain("--coverage");
  });

  it("uses custom coveragePath when provided", async () => {
    mockReadFile.mockResolvedValueOnce(COVERAGE_JSON);

    await handleCheckCoverageGaps("/project", {
      coveragePath: "/custom/path/coverage.json",
    });

    expect(mockReadFile).toHaveBeenCalledWith(
      "/custom/path/coverage.json",
      "utf-8",
    );
  });

  it("returns error for invalid coverage JSON", async () => {
    mockReadFile.mockResolvedValueOnce("not json");

    const result = await handleCheckCoverageGaps("/project", {});
    const data = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(data.error).toContain("Failed to read coverage report");
  });
});
