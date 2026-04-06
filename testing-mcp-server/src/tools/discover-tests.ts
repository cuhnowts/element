import { runCommand } from "../runner.js";
import { parseVitestList } from "../parsers/vitest-parser.js";
import { parseCargoTestList } from "../parsers/cargo-parser.js";
import type { TestEntry } from "../types.js";

export async function handleDiscoverTests(
  projectRoot: string,
  args: { runner?: "vitest" | "cargo" | "all"; file?: string },
) {
  const runner = args.runner ?? "all";
  const results: TestEntry[] = [];

  if (runner === "vitest" || runner === "all") {
    try {
      const listArgs = ["vitest", "list", "--reporter=json"];
      if (args.file) listArgs.push(args.file);
      const result = await runCommand("npx", listArgs, projectRoot);
      if (result.exitCode === 0) {
        results.push(...parseVitestList(result.stdout));
      } else {
        // Fallback: file-system scan for *.test.ts, *.spec.ts
        const globResult = await runCommand(
          "find",
          [
            ".",
            "-name",
            "*.test.ts",
            "-o",
            "-name",
            "*.spec.ts",
            "-not",
            "-path",
            "*/node_modules/*",
          ],
          projectRoot,
        );
        for (const line of globResult.stdout.split("\n").filter(Boolean)) {
          results.push({
            runner: "vitest",
            file: line.replace(/^\.\//, ""),
            name: line.replace(/^\.\//, ""),
            suite: undefined,
          });
        }
      }
    } catch {
      // vitest not available, skip
    }
  }

  if (runner === "cargo" || runner === "all") {
    try {
      const cargoArgs = ["test", "--", "--list"];
      const result = await runCommand("cargo", cargoArgs, projectRoot);
      if (result.exitCode === 0) {
        results.push(...parseCargoTestList(result.stdout));
      }
    } catch {
      // cargo not available, skip
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ tests: results, count: results.length }, null, 2),
      },
    ],
  };
}
