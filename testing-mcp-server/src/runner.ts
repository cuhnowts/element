import { spawn } from "node:child_process";
import type { SpawnResult } from "./types.js";

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number = 120_000,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (d: Buffer) => chunks.push(d));
    proc.stderr.on("data", (d: Buffer) => errChunks.push(d));

    proc.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(chunks).toString("utf-8"),
        stderr: Buffer.concat(errChunks).toString("utf-8"),
        exitCode: code ?? 1,
      });
    });

    proc.on("error", reject);
  });
}
