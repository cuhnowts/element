import { existsSync } from "node:fs";
import { join } from "node:path";
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
      const listArgs = ["vitest", "list"];
      if (args.file) listArgs.push(args.file);
      const result = await runCommand("npx", listArgs, projectRoot);
      if (result.exitCode === 0 && result.stdout.trim()) {
        // Try JSON parse first (older vitest versions)
        try {
          results.push(...parseVitestList(result.stdout));
        } catch {
          // vitest v4+ outputs plain text: "file > suite > test name" per line
          for (const line of result.stdout.split("\n").filter(Boolean)) {
            const parts = line.split(" > ");
            results.push({
              runner: "vitest",
              file: parts[0]?.trim() ?? line.trim(),
              name: parts[parts.length - 1]?.trim() ?? line.trim(),
              suite: parts.length > 2 ? parts[1]?.trim() : undefined,
            });
          }
        }
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
      const cargoCwd = existsSync(join(projectRoot, "Cargo.toml"))
        ? projectRoot
        : existsSync(join(projectRoot, "src-tauri", "Cargo.toml"))
          ? join(projectRoot, "src-tauri")
          : projectRoot;
      const cargoArgs = ["test", "--", "--list"];
      const result = await runCommand("cargo", cargoArgs, cargoCwd);
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
