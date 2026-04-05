import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/types";
import { getTimeGroup } from "../TodayView";

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

const TODAY = "2026-03-16";

describe("getTimeGroup", () => {
  it("returns 'overdue' for task with due date before today", () => {
    const task = makeTask({ dueDate: "2020-01-01", status: "pending" });
    expect(getTimeGroup(task, TODAY)).toBe("overdue");
  });

  it("returns 'unscheduled' for complete task with past due date (not overdue)", () => {
    const task = makeTask({ dueDate: "2020-01-01", status: "complete" });
    expect(getTimeGroup(task, TODAY)).toBe("unscheduled");
  });

  it("returns 'morning' for task scheduled at 9:00", () => {
    const task = makeTask({ scheduledTime: "09:00" });
    expect(getTimeGroup(task, TODAY)).toBe("morning");
  });

  it("returns 'afternoon' for task scheduled at 14:00", () => {
    const task = makeTask({ scheduledTime: "14:00" });
    expect(getTimeGroup(task, TODAY)).toBe("afternoon");
  });

  it("returns 'evening' for task scheduled at 19:00", () => {
    const task = makeTask({ scheduledTime: "19:00" });
    expect(getTimeGroup(task, TODAY)).toBe("evening");
  });

  it("returns 'unscheduled' for task with no scheduling fields", () => {
    const task = makeTask({});
    expect(getTimeGroup(task, TODAY)).toBe("unscheduled");
  });
});
