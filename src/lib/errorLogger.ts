import { invoke } from "@tauri-apps/api/core";

export interface ErrorLogEntry {
  timestamp: string;
  level: "error";
  message: string;
  stack?: string;
}

let originalConsoleError: (...args: unknown[]) => void = console.error;
let isLogging = false;
let buffer: ErrorLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentProjectDir: string | null = null;

export function setProjectDirectory(dir: string | null): void {
  currentProjectDir = dir;
}

function formatEntry(args: unknown[]): ErrorLogEntry {
  let stack: string | undefined;
  const parts: string[] = [];

  for (const arg of args) {
    if (arg instanceof Error) {
      parts.push(arg.message);
      stack = arg.stack || arg.message;
    } else if (typeof arg === "string") {
      parts.push(arg);
    } else {
      parts.push(String(arg));
    }
  }

  return {
    timestamp: new Date().toISOString(),
    level: "error",
    message: parts.join(" "),
    ...(stack ? { stack } : {}),
  };
}

function flush(): void {
  if (buffer.length === 0 || !currentProjectDir) return;
  const entries = buffer.splice(0);
  invoke("log_errors", { projectDir: currentProjectDir, entries }).catch(
    () => {
      // Silently drop -- logging errors about logging causes infinite loops
    }
  );
}

function scheduleFlush(): void {
  if (buffer.length > 20) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flush();
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 500);
}

export function initErrorLogger(): void {
  originalConsoleError = console.error;

  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args);

    if (isLogging) return;
    isLogging = true;

    try {
      buffer.push(formatEntry(args));
      scheduleFlush();
    } finally {
      isLogging = false;
    }
  };
}

// Test-only exports
export const _testing = {
  resetForTest(): void {
    buffer = [];
    isLogging = false;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    currentProjectDir = null;
  },
  getBuffer(): ErrorLogEntry[] {
    return buffer;
  },
};
