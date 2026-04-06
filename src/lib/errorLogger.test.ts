import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  initErrorLogger,
  setProjectDirectory,
  _testing,
} from "./errorLogger";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

const mockedInvoke = vi.mocked(invoke);

describe("errorLogger", () => {
  let originalConsoleError: (...args: unknown[]) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    originalConsoleError = console.error;
    initErrorLogger();
    _testing.resetForTest();
    mockedInvoke.mockClear();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.useRealTimers();
  });

  it("captures console.error arguments and formats entry", () => {
    console.error("test message");
    const buffer = _testing.getBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].message).toBe("test message");
    expect(buffer[0].level).toBe("error");
    expect(buffer[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("extracts stack from Error objects", () => {
    console.error(new Error("fail"));
    const buffer = _testing.getBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].stack).toContain("Error: fail");
  });

  it("stringifies non-string arguments", () => {
    console.error({ key: "val" }, 42, null);
    const buffer = _testing.getBuffer();
    expect(buffer).toHaveLength(1);
    expect(buffer[0].message).toContain("[object Object]");
    expect(buffer[0].message).toContain("42");
    expect(buffer[0].message).toContain("null");
  });

  it("re-entrancy guard prevents recursion", () => {
    mockedInvoke.mockImplementation(() => {
      console.error("recursive call from invoke");
      return Promise.resolve();
    });

    setProjectDirectory("/test/project");
    console.error("trigger");

    // Advance past flush timer
    vi.advanceTimersByTime(500);

    // Buffer should have the original entry but not grow unboundedly
    // The recursive call happens during flush (invoke mock), so buffer
    // should contain at most 2 entries (original + one from flush), not infinite
    const buffer = _testing.getBuffer();
    expect(buffer.length).toBeLessThanOrEqual(2);
  });

  it("buffers entries and flushes on timer", () => {
    setProjectDirectory("/test/project");

    console.error("one");
    console.error("two");
    console.error("three");

    // Not flushed yet
    expect(mockedInvoke).not.toHaveBeenCalled();

    // Advance timer by 500ms to trigger flush
    vi.advanceTimersByTime(500);

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke).toHaveBeenCalledWith("log_errors", {
      projectDir: "/test/project",
      entries: expect.arrayContaining([
        expect.objectContaining({ message: "one" }),
        expect.objectContaining({ message: "two" }),
        expect.objectContaining({ message: "three" }),
      ]),
    });
  });

  it("immediate flush when buffer exceeds 20 entries", () => {
    setProjectDirectory("/test/project");

    for (let i = 0; i < 21; i++) {
      console.error(`error ${i}`);
    }

    // Should have flushed immediately without waiting for timer
    expect(mockedInvoke).toHaveBeenCalled();
  });

  it("does not invoke when no project directory set", () => {
    console.error("msg");
    vi.advanceTimersByTime(500);
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("passes project directory to invoke", () => {
    setProjectDirectory("/path/to/project");
    console.error("msg");
    vi.advanceTimersByTime(500);

    expect(mockedInvoke).toHaveBeenCalledWith("log_errors", {
      projectDir: "/path/to/project",
      entries: expect.arrayContaining([
        expect.objectContaining({ message: "msg" }),
      ]),
    });
  });
});
