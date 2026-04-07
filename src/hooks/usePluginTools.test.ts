import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/pluginToolRegistry", () => ({
  getPluginToolDefinitions: vi.fn(),
  dispatchPluginSkill: vi.fn(),
}));

import {
  getPluginToolDefinitions,
  dispatchPluginSkill,
} from "@/lib/pluginToolRegistry";
import { usePluginTools } from "./usePluginTools";

const mockGetDefs = vi.mocked(getPluginToolDefinitions);
const mockDispatch = vi.mocked(dispatchPluginSkill);

const sampleTools = [
  {
    name: "knowledge:ingest",
    description: "Ingest data",
    input_schema: { type: "object" } as Record<string, unknown>,
    destructive: true,
    plugin_name: "knowledge",
  },
  {
    name: "knowledge:query",
    description: "Query data",
    input_schema: { type: "object" } as Record<string, unknown>,
    destructive: false,
    plugin_name: "knowledge",
  },
];

describe("usePluginTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefs.mockResolvedValue(sampleTools);
  });

  it("fetches plugin tools on mount", async () => {
    const { result } = renderHook(() => usePluginTools());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.pluginTools).toEqual(sampleTools);
    expect(mockGetDefs).toHaveBeenCalledTimes(1);
  });

  it("isPluginTool returns true for loaded plugin tool names", async () => {
    const { result } = renderHook(() => usePluginTools());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isPluginTool("knowledge:query")).toBe(true);
    expect(result.current.isPluginTool("create_task")).toBe(false);
  });

  it("isPluginToolDestructive returns correct value", async () => {
    const { result } = renderHook(() => usePluginTools());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isPluginToolDestructive("knowledge:ingest")).toBe(true);
    expect(result.current.isPluginToolDestructive("knowledge:query")).toBe(false);
  });

  it("getToolDefs converts to LLM format", async () => {
    const { result } = renderHook(() => usePluginTools());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const defs = result.current.getToolDefs();
    expect(defs).toHaveLength(2);
    expect(defs[0]).toEqual({
      name: "knowledge:ingest",
      description: "Ingest data",
      input_schema: { type: "object" },
    });
    // Should NOT have destructive or plugin_name
    expect(defs[0]).not.toHaveProperty("destructive");
    expect(defs[0]).not.toHaveProperty("plugin_name");
  });

  it("dispatch delegates to dispatchPluginSkill", async () => {
    mockDispatch.mockResolvedValue({ success: true });
    const { result } = renderHook(() => usePluginTools());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await result.current.dispatch("knowledge:ingest", { path: "/" });
    expect(mockDispatch).toHaveBeenCalledWith("knowledge:ingest", { path: "/" });
  });

  it("returns empty array and isLoaded false initially", () => {
    // Use a never-resolving promise to test initial state
    mockGetDefs.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePluginTools());

    expect(result.current.pluginTools).toEqual([]);
    expect(result.current.isLoaded).toBe(false);
  });
});
