import { runCommand } from "../runner.js";
import { parseVitestOutput } from "../parsers/vitest-parser.js";
import { parseCargoTestOutput } from "../parsers/cargo-parser.js";
import type { TestResult } from "../types.js";

export async function handleRunTests(
  projectRoot: string,
  args: {
    runner: "vitest" | "cargo";
    file?: string;
    testName?: string;
    timeout?: number;
  },
) {
  const timeoutMs = args.timeout ?? 120_000;
  let results: TestResult[];

  if (args.runner === "vitest") {
    const vitestArgs = ["vitest", "run", "--reporter=json"];
    if (args.file) vitestArgs.push(args.file);
    if (args.testName) vitestArgs.push("-t", args.testName);
    const result = await runCommand("npx", vitestArgs, projectRoot, timeoutMs);

    // Vitest JSON may be mixed with console output; try to extract JSON object
    const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        results = parseVitestOutput(jsonMatch[0]);
      } catch {
        results = makeFallbackResult("vitest", args.file, result);
      }
    } else {
      try {
        results = parseVitestOutput(result.stdout);
      } catch {
        results = makeFallbackResult("vitest", args.file, result);
      }
    }
  } else {
    // cargo
    const cargoArgs = ["test"];
    if (args.testName) cargoArgs.push(args.testName);
    const result = await runCommand("cargo", cargoArgs, projectRoot, timeoutMs);
    results = parseCargoTestOutput(result.stdout, result.stderr, result.exitCode);
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    ignored: results.filter((r) => r.status === "ignored").length,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ summary, results }, null, 2),
      },
    ],
  };
}

function makeFallbackResult(
  runner: "vitest" | "cargo",
  file: string | undefined,
  result: { exitCode: number; stderr: string; stdout: string },
): TestResult[] {
  return [
    {
      runner,
      file: file ?? "",
      name: `${runner}-run`,
      status: result.exitCode === 0 ? "passed" : "failed",
      error:
        result.exitCode !== 0
          ? result.stderr || result.stdout
          : undefined,
    },
  ];
}
