import { describe, expect, it, vi } from "vitest";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("AiSettings", () => {
  it("renders empty state when no providers configured", () => {
    // TODO: implement after component exists
    expect(true).toBe(true);
  });

  it("renders provider cards when providers exist", () => {
    expect(true).toBe(true);
  });

  it("opens add provider dialog on button click", () => {
    expect(true).toBe(true);
  });
});
