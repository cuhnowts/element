import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

import { dispatchPluginSkill, getPluginToolDefinitions } from "../pluginToolRegistry";

describe("pluginToolRegistry", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe("getPluginToolDefinitions", () => {
    it("calls list_plugin_skills and returns result", async () => {
      const mockTools = [
        {
          prefixedName: "knowledge:query",
          description: "Query wiki",
          inputSchema: {},
          destructive: false,
          pluginName: "knowledge",
          outputSchema: {},
        },
      ];
      mockInvoke.mockResolvedValue(mockTools);
      const result = await getPluginToolDefinitions();
      expect(mockInvoke).toHaveBeenCalledWith("list_plugin_skills");
      expect(result).toEqual(mockTools);
    });

    it("returns empty array on invoke failure", async () => {
      mockInvoke.mockRejectedValue(new Error("no backend"));
      const result = await getPluginToolDefinitions();
      expect(result).toEqual([]);
    });
  });

  describe("dispatchPluginSkill", () => {
    it("sends input as object, not stringified", async () => {
      mockInvoke.mockResolvedValue({ result: "ok" });
      const input = { content: "hello", title: "test" };
      await dispatchPluginSkill("knowledge:ingest", input);
      expect(mockInvoke).toHaveBeenCalledWith("dispatch_plugin_skill", {
        skillName: "knowledge:ingest",
        input: { content: "hello", title: "test" },
      });
      // Verify NOT stringified
      const callArgs = mockInvoke.mock.calls[0][1];
      expect(typeof callArgs.input).toBe("object");
    });

    it("returns success result on resolve", async () => {
      mockInvoke.mockResolvedValue({ articles: ["wiki/test.md"] });
      const result = await dispatchPluginSkill("knowledge:ingest", {});
      expect(result).toEqual({ success: true, data: { articles: ["wiki/test.md"] } });
    });

    it("returns error result on reject", async () => {
      mockInvoke.mockRejectedValue(new Error("plugin disabled"));
      const result = await dispatchPluginSkill("knowledge:ingest", {});
      expect(result).toEqual({ success: false, error: "Error: plugin disabled" });
    });
  });
});
