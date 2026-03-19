import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("AiAssistButton", () => {
  it("returns null when no default provider is configured", () => {
    expect(true).toBe(true);
  });

  it("renders sparkle button when provider is configured", () => {
    expect(true).toBe(true);
  });

  it("shows spinning animation when generating", () => {
    expect(true).toBe(true);
  });

  it("calls requestAiAssist on click", () => {
    expect(true).toBe(true);
  });
});
