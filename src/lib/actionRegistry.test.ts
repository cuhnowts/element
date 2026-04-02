import { describe, it, expect } from "vitest";
import {
  ACTION_REGISTRY,
  ActionDefinition,
  getToolDefinitions,
  getAction,
  isDestructive,
} from "./actionRegistry";

describe("actionRegistry", () => {
  describe("ACTION_REGISTRY", () => {
    it("exports an array of ActionDefinition objects", () => {
      expect(Array.isArray(ACTION_REGISTRY)).toBe(true);
      expect(ACTION_REGISTRY.length).toBeGreaterThan(0);
    });

    it("every entry has name, description, inputSchema, destructive, tauriCommand fields", () => {
      for (const entry of ACTION_REGISTRY) {
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("description");
        expect(entry).toHaveProperty("inputSchema");
        expect(entry).toHaveProperty("destructive");
        expect(entry).toHaveProperty("tauriCommand");
        expect(typeof entry.name).toBe("string");
        expect(typeof entry.description).toBe("string");
        expect(typeof entry.inputSchema).toBe("object");
        expect(typeof entry.destructive).toBe("boolean");
        expect(typeof entry.tauriCommand).toBe("string");
      }
    });

    it("contains all D-11 actions", () => {
      const names = ACTION_REGISTRY.map((a) => a.name);
      expect(names).toContain("create_task");
      expect(names).toContain("update_task");
      expect(names).toContain("update_task_status");
      expect(names).toContain("delete_task");
      expect(names).toContain("update_phase_status");
      expect(names).toContain("create_project");
      expect(names).toContain("create_theme");
      expect(names).toContain("create_file");
      expect(names).toContain("execute_shell");
      expect(names).toHaveLength(9);
    });

    it("all delete_* actions have destructive: true (per D-12)", () => {
      const deleteActions = ACTION_REGISTRY.filter((a) =>
        a.name.startsWith("delete_")
      );
      expect(deleteActions.length).toBeGreaterThan(0);
      for (const action of deleteActions) {
        expect(action.destructive).toBe(true);
      }
    });
  });

  describe("getToolDefinitions", () => {
    it("returns array of {name, description, input_schema} objects (LLM format per D-03)", () => {
      const tools = getToolDefinitions();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(ACTION_REGISTRY.length);
      for (const tool of tools) {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("input_schema");
        expect(Object.keys(tool)).toHaveLength(3);
      }
    });
  });

  describe("getAction", () => {
    it('getAction("create_task") returns the create_task definition', () => {
      const action = getAction("create_task");
      expect(action).toBeDefined();
      expect(action!.name).toBe("create_task");
      expect(action!.tauriCommand).toBe("create_task");
    });

    it('getAction("nonexistent") returns undefined', () => {
      const action = getAction("nonexistent");
      expect(action).toBeUndefined();
    });
  });

  describe("isDestructive", () => {
    it('isDestructive("delete_task") returns true', () => {
      expect(isDestructive("delete_task")).toBe(true);
    });

    it('isDestructive("create_task") returns false', () => {
      expect(isDestructive("create_task")).toBe(false);
    });

    it('isDestructive("execute_shell") returns true (per D-06)', () => {
      expect(isDestructive("execute_shell")).toBe(true);
    });
  });
});
