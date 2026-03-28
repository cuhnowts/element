import { describe, it, expect, vi } from "vitest";
import type { Task } from "@/lib/types";
import { computeProgress, tasksForPhase } from "../ProjectDetail";

// Mock Tauri and dialog to avoid runtime dependency
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-1",
    projectId: "proj-1",
    themeId: null,
    title: "Test task",
    description: "",
    context: "",
    status: "pending",
    priority: "medium",
    externalPath: null,
    dueDate: null,
    scheduledDate: null,
    scheduledTime: null,
    durationMinutes: null,
    recurrenceRule: null,
    phaseId: null,
    source: "user",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeProgress", () => {
  it("returns { complete: 0, total: 0 } for empty array", () => {
    expect(computeProgress([])).toEqual({ complete: 0, total: 0 });
  });

  it("counts only complete tasks", () => {
    const tasks = [
      makeTask({ id: "1", status: "pending" }),
      makeTask({ id: "2", status: "complete" }),
      makeTask({ id: "3", status: "in-progress" }),
    ];
    expect(computeProgress(tasks)).toEqual({ complete: 1, total: 3 });
  });

  it("counts all tasks as complete when all are complete", () => {
    const tasks = [
      makeTask({ id: "1", status: "complete" }),
      makeTask({ id: "2", status: "complete" }),
      makeTask({ id: "3", status: "complete" }),
    ];
    expect(computeProgress(tasks)).toEqual({ complete: 3, total: 3 });
  });

  it("handles mixed statuses correctly (only complete counts)", () => {
    const tasks = [
      makeTask({ id: "1", status: "pending" }),
      makeTask({ id: "2", status: "in-progress" }),
      makeTask({ id: "3", status: "complete" }),
      makeTask({ id: "4", status: "blocked" }),
    ];
    expect(computeProgress(tasks)).toEqual({ complete: 1, total: 4 });
  });
});

describe("tasksForPhase", () => {
  const tasks = [
    makeTask({ id: "1", phaseId: "phase-a" }),
    makeTask({ id: "2", phaseId: "phase-a" }),
    makeTask({ id: "3", phaseId: "phase-b" }),
    makeTask({ id: "4", phaseId: null }),
    makeTask({ id: "5", phaseId: null }),
  ];

  it("filters tasks matching a specific phaseId", () => {
    const result = tasksForPhase(tasks, "phase-a");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("filters tasks with null phaseId (unassigned bucket)", () => {
    const result = tasksForPhase(tasks, null);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["4", "5"]);
  });

  it("returns empty array when no tasks match", () => {
    const result = tasksForPhase(tasks, "nonexistent");
    expect(result).toEqual([]);
  });
});

describe("Phase 14: Tier badge and change plan", () => {
  // PLAN-01: Tier badge
  it.todo("shows tier badge when project has planningTier set");
  it.todo("shows 'GSD' text for full tier");
  it.todo("shows 'Quick' text for quick tier");
  it.todo("shows 'Medium' text for medium tier");

  // D-04: Change plan
  it.todo("shows 'Change plan' button when tier is set");
  it.todo("opens tier dialog with isChangingTier when Change plan clicked");
});
