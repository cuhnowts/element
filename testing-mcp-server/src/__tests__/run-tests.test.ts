import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleRunTests } from "../tools/run-tests.js";

vi.mock("../runner.js", () => ({
  runCommand: vi.fn(),
}));

import { runCommand } from "../runner.js";

const mockRunCommand = vi.mocked(runCommand);

const VITEST_JSON_OUTPUT = JSON.stringify({
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
          fullName: "math > fails",
          ancestorTitles: ["math"],
          status: "failed",
          duration: 5,
          failureMessages: ["expected 1 to be 2"],
        },
      ],
    },
  ],
});

const CARGO_TEST_OUTPUT = `
running 2 tests
test utils::tests::test_format ... ok
test utils::tests::test_parse ... FAILED

failures:

---- utils::tests::test_parse stdout ----
thread 'utils::tests::test_parse' panicked at 'assertion failed'
`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleRunTests", () => {
  it("runs vitest with --reporter=json", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: VITEST_JSON_OUTPUT,
      stderr: "",
      exitCode: 1,
    });

    const result = await handleRunTests("/project", { runner: "vitest" });
    const data = JSON.parse(result.content[0].text);

    expect(data.summary.total).toBe(2);
    expect(data.summary.passed).toBe(1);
    expect(data.summary.failed).toBe(1);

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      ["vitest", "run", "--reporter=json"],
      "/project",
      120_000,
    );
  });

  it("adds file param to vitest args", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: VITEST_JSON_OUTPUT,
      stderr: "",
      exitCode: 0,
    });

    await handleRunTests("/project", {
      runner: "vitest",
      file: "math.test.ts",
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      ["vitest", "run", "--reporter=json", "math.test.ts"],
      "/project",
      120_000,
    );
  });

  it("adds testName param to vitest args", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: VITEST_JSON_OUTPUT,
      stderr: "",
      exitCode: 0,
    });

    await handleRunTests("/project", {
      runner: "vitest",
      testName: "adds numbers",
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      ["vitest", "run", "--reporter=json", "-t", "adds numbers"],
      "/project",
      120_000,
    );
  });

  it("runs cargo test with name filter", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: CARGO_TEST_OUTPUT,
      stderr: "",
      exitCode: 1,
    });

    const result = await handleRunTests("/project", {
      runner: "cargo",
      testName: "test_format",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.summary.total).toBe(2);
    expect(mockRunCommand).toHaveBeenCalledWith(
      "cargo",
      ["test", "test_format"],
      "/project",
      120_000,
    );
  });

  it("respects custom timeout", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: VITEST_JSON_OUTPUT,
      stderr: "",
      exitCode: 0,
    });

    await handleRunTests("/project", {
      runner: "vitest",
      timeout: 5000,
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      expect.any(Array),
      "/project",
      5000,
    );
  });

  it("returns fallback result when vitest JSON parsing fails", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: "some non-json output",
      stderr: "error occurred",
      exitCode: 1,
    });

    const result = await handleRunTests("/project", { runner: "vitest" });
    const data = JSON.parse(result.content[0].text);

    expect(data.summary.total).toBe(1);
    expect(data.summary.failed).toBe(1);
    expect(data.results[0].error).toBe("error occurred");
  });
});
