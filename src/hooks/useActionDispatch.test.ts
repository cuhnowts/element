import { invoke } from "@tauri-apps/api/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActionDispatch } from "./useActionDispatch";

describe("useActionDispatch", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  describe("dispatch", () => {
    it("calls invoke with tauriCommand and args for known action", async () => {
      const mockResult = { id: "task-1", title: "Test" };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useActionDispatch());

      let dispatchResult: Awaited<ReturnType<typeof result.current.dispatch>>;
      await act(async () => {
        dispatchResult = await result.current.dispatch("create_task", {
          title: "Test",
        });
      });

      expect(invoke).toHaveBeenCalledWith("create_task", { title: "Test" });
      expect(dispatchResult!).toEqual({
        success: true,
        data: mockResult,
      });
    });

    it("returns error for unknown action without calling invoke", async () => {
      const { result } = renderHook(() => useActionDispatch());

      let dispatchResult: Awaited<ReturnType<typeof result.current.dispatch>>;
      await act(async () => {
        dispatchResult = await result.current.dispatch("unknown_action", {});
      });

      expect(invoke).not.toHaveBeenCalled();
      expect(dispatchResult!).toEqual({
        success: false,
        error: "Unknown action: unknown_action",
      });
    });

    it("catches invoke errors and returns failure result", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useActionDispatch());

      let dispatchResult: Awaited<ReturnType<typeof result.current.dispatch>>;
      await act(async () => {
        dispatchResult = await result.current.dispatch("create_task", {
          title: "Test",
        });
      });

      expect(dispatchResult!).toEqual({
        success: false,
        error: "Error: Network error",
      });
    });
  });

  describe("checkDestructive", () => {
    it("returns true for delete_task", () => {
      const { result } = renderHook(() => useActionDispatch());
      expect(result.current.checkDestructive("delete_task")).toBe(true);
    });

    it("returns false for create_task", () => {
      const { result } = renderHook(() => useActionDispatch());
      expect(result.current.checkDestructive("create_task")).toBe(false);
    });

    it("returns true for execute_shell", () => {
      const { result } = renderHook(() => useActionDispatch());
      expect(result.current.checkDestructive("execute_shell")).toBe(true);
    });
  });

  describe("createPendingAction", () => {
    it("creates destructive pending action for delete_task", () => {
      const { result } = renderHook(() => useActionDispatch());
      const pending = result.current.createPendingAction("tool-123", "delete_task", {
        taskId: "abc",
      });
      expect(pending).toEqual({
        toolUseId: "tool-123",
        actionName: "delete_task",
        input: { taskId: "abc" },
        destructive: true,
      });
    });

    it("creates non-destructive pending action for create_task", () => {
      const { result } = renderHook(() => useActionDispatch());
      const pending = result.current.createPendingAction("tool-456", "create_task", {
        title: "New",
      });
      expect(pending).toEqual({
        toolUseId: "tool-456",
        actionName: "create_task",
        input: { title: "New" },
        destructive: false,
      });
    });
  });
});
