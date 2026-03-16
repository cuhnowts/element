import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock @tauri-apps/api/core (invoke)
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// Mock @tauri-apps/api/event (listen)
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()), // returns unlisten function
}));
