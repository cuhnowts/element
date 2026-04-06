import type { CoverageGap } from "../types.js";

interface IstanbulFnMap {
  [key: string]: { name: string; decl?: { start?: { line?: number } } };
}

interface IstanbulFileCoverage {
  fnMap: IstanbulFnMap;
  f: Record<string, number>;
  s: Record<string, number>;
  statementMap: Record<string, unknown>;
}

type IstanbulCoverageReport = Record<string, IstanbulFileCoverage>;

export function parseCoverageReport(jsonString: string): CoverageGap[] {
  let data: IstanbulCoverageReport;
  try {
    data = JSON.parse(jsonString) as IstanbulCoverageReport;
  } catch (err) {
    throw new Error(
      `Failed to parse coverage report: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const gaps: CoverageGap[] = [];

  for (const [filePath, coverage] of Object.entries(data)) {
    const fnKeys = Object.keys(coverage.fnMap);
    const totalFunctions = fnKeys.length;
    const uncoveredFunctions: string[] = [];

    for (const key of fnKeys) {
      if (coverage.f[key] === 0) {
        uncoveredFunctions.push(coverage.fnMap[key].name);
      }
    }

    // Skip fully covered files
    if (uncoveredFunctions.length === 0) continue;

    const sKeys = Object.keys(coverage.s);
    const totalStatements = sKeys.length;
    const coveredStatements = sKeys.filter((k) => coverage.s[k] > 0).length;

    gaps.push({
      file: filePath,
      totalFunctions,
      coveredFunctions: totalFunctions - uncoveredFunctions.length,
      uncoveredFunctions,
      totalStatements,
      coveredStatements,
    });
  }

  // Sort by number of uncovered functions descending
  gaps.sort((a, b) => b.uncoveredFunctions.length - a.uncoveredFunctions.length);

  return gaps;
}
