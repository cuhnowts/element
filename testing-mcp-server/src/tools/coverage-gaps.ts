import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCoverageReport } from "../parsers/coverage-parser.js";

export async function handleCheckCoverageGaps(
  projectRoot: string,
  args: { runner?: "vitest"; coveragePath?: string },
) {
  const coveragePath =
    args.coveragePath ?? join(projectRoot, "coverage", "coverage-final.json");

  try {
    const content = await readFile(coveragePath, "utf-8");
    const gaps = parseCoverageReport(content);

    const summary = {
      totalFiles: gaps.length,
      totalUncoveredFunctions: gaps.reduce(
        (sum, g) => sum + g.uncoveredFunctions.length,
        0,
      ),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ summary, gaps }, null, 2),
        },
      ],
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
        ? `Coverage report not found at ${coveragePath}. Run tests with --coverage first (e.g., npx vitest run --coverage).`
        : `Failed to read coverage report: ${err instanceof Error ? err.message : String(err)}`;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
