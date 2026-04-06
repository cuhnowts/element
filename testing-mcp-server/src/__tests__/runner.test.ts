import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCommand } from "../runner.js";

describe("runCommand", () => {
  it("exports a function", () => {
    expect(typeof runCommand).toBe("function");
  });

  it("runs echo and captures stdout", async () => {
    const result = await runCommand("echo", ["hello"], process.cwd());
    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("captures non-zero exit code", async () => {
    const result = await runCommand(
      "node",
      ["-e", "process.exit(42)"],
      process.cwd(),
    );
    expect(result.exitCode).toBe(42);
  });

  it("respects timeout", async () => {
    const start = Date.now();
    const result = await runCommand("sleep", ["10"], process.cwd(), 100);
    const elapsed = Date.now() - start;
    // Should be killed well before 10 seconds
    expect(elapsed).toBeLessThan(2000);
    // Killed processes get non-zero exit or null (mapped to 1)
    expect(result.exitCode).not.toBe(0);
  });

  it("runner.ts never uses exec or shell:true (TMCP-04)", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../runner.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/\bexec\s*\(/);
    expect(source).not.toMatch(/\bexecSync\s*\(/);
    expect(source).not.toMatch(/shell:\s*true/);
    expect(source).toMatch(/shell:\s*false/);
  });
});
