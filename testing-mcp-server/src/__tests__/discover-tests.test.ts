import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDiscoverTests } from "../tools/discover-tests.js";

// Mock the runner module
vi.mock("../runner.js", () => ({
  runCommand: vi.fn(),
}));

import { runCommand } from "../runner.js";

const mockRunCommand = vi.mocked(runCommand);

const VITEST_LIST_RESPONSE = JSON.stringify([
  { file: "src/__tests__/math.test.ts", name: "adds numbers", suite: "math" },
  {
    file: "src/__tests__/math.test.ts",
    name: "subtracts numbers",
    suite: "math",
  },
]);

const CARGO_LIST_RESPONSE =
  "commands::shell::tests::test_allowed: test\ndb::queries::tests::test_insert: test\n";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleDiscoverTests", () => {
  it("discovers vitest tests when runner=vitest", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: VITEST_LIST_RESPONSE,
      stderr: "",
      exitCode: 0,
    });

    const result = await handleDiscoverTests("/project", { runner: "vitest" });
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(2);
    expect(data.tests[0].runner).toBe("vitest");
    expect(data.tests[0].name).toBe("adds numbers");

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      ["vitest", "list"],
      "/project",
    );
  });

  it("discovers cargo tests when runner=cargo", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: CARGO_LIST_RESPONSE,
      stderr: "",
      exitCode: 0,
    });

    const result = await handleDiscoverTests("/project", { runner: "cargo" });
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(2);
    expect(data.tests[0].runner).toBe("cargo");
    expect(data.tests[0].name).toBe("test_allowed");

    expect(mockRunCommand).toHaveBeenCalledWith(
      "cargo",
      ["test", "--", "--list"],
      "/project",
    );
  });

  it("discovers both runners when runner=all", async () => {
    mockRunCommand
      .mockResolvedValueOnce({
        stdout: VITEST_LIST_RESPONSE,
        stderr: "",
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        stdout: CARGO_LIST_RESPONSE,
        stderr: "",
        exitCode: 0,
      });

    const result = await handleDiscoverTests("/project", { runner: "all" });
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(4);
    expect(mockRunCommand).toHaveBeenCalledTimes(2);
  });

  it("falls back to file scanning when vitest list fails", async () => {
    mockRunCommand
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "vitest: command not found",
        exitCode: 1,
      })
      .mockResolvedValueOnce({
        stdout: "./src/__tests__/math.test.ts\n./src/__tests__/utils.test.ts\n",
        stderr: "",
        exitCode: 0,
      });

    const result = await handleDiscoverTests("/project", { runner: "vitest" });
    const data = JSON.parse(result.content[0].text);

    expect(data.count).toBe(2);
    expect(data.tests[0].file).toBe("src/__tests__/math.test.ts");
  });

  it("passes file filter to vitest list args", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    });

    await handleDiscoverTests("/project", {
      runner: "vitest",
      file: "math.test.ts",
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "npx",
      ["vitest", "list", "math.test.ts"],
      "/project",
    );
  });

  it("returns valid MCP content shape", async () => {
    mockRunCommand.mockResolvedValueOnce({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    });

    const result = await handleDiscoverTests("/project", { runner: "vitest" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });
});
