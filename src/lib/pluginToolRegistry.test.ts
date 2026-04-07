import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { getPluginToolDefinitions, dispatchPluginSkill } from "./pluginToolRegistry";

const mockInvoke = vi.mocked(invoke);

describe("pluginToolRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPluginToolDefinitions", () => {
    it("returns plugin tool definitions from backend", async () => {
      const mockTools = [
        {
          name: "knowledge:ingest",
          description: "Ingest",
          input_schema: { type: "object" },
          destructive: true,
          plugin_name: "knowledge",
        },
      ];
      mockInvoke.mockResolvedValue(mockTools);

      const result = await getPluginToolDefinitions();
      expect(result).toEqual(mockTools);
    });

    it("returns empty array on backend error", async () => {
      mockInvoke.mockRejectedValue(new Error("Backend unavailable"));

      const result = await getPluginToolDefinitions();
      expect(result).toEqual([]);
    });

    it("calls list_plugin_skills command", async () => {
      mockInvoke.mockResolvedValue([]);

      await getPluginToolDefinitions();
      expect(mockInvoke).toHaveBeenCalledWith("list_plugin_skills");
    });
  });

  describe("dispatchPluginSkill", () => {
    it("returns success with data on successful dispatch", async () => {
      mockInvoke.mockResolvedValue({ result: "ok" });

      const result = await dispatchPluginSkill("knowledge:ingest", { path: "/file" });
      expect(result).toEqual({ success: true, data: { result: "ok" } });
    });

    it("returns error on failed dispatch", async () => {
      mockInvoke.mockRejectedValue(new Error("Plugin disabled"));

      const result = await dispatchPluginSkill("knowledge:ingest", { path: "/file" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Plugin disabled");
    });

    it("passes skillName and stringified input to invoke", async () => {
      mockInvoke.mockResolvedValue({});

      await dispatchPluginSkill("knowledge:ingest", { path: "/file" });
      expect(mockInvoke).toHaveBeenCalledWith("dispatch_plugin_skill", {
        skillName: "knowledge:ingest",
        input: '{"path":"/file"}',
      });
    });
  });
});
