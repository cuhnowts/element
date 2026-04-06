export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestEntry {
  runner: "vitest" | "cargo";
  file: string;
  name: string;
  suite?: string;
  lineNumber?: number;
}

export interface TestResult {
  runner: "vitest" | "cargo";
  file: string;
  name: string;
  suite?: string;
  status: "passed" | "failed" | "ignored" | "pending" | "todo";
  duration?: number;
  error?: string;
}

export interface CoverageGap {
  file: string;
  totalFunctions: number;
  coveredFunctions: number;
  uncoveredFunctions: string[];
  totalStatements: number;
  coveredStatements: number;
}
