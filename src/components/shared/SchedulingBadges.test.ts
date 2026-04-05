import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulingBadges } from "./SchedulingBadges";

describe("SchedulingBadges three-tier variant logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "today" to 2026-04-03
    vi.setSystemTime(new Date("2026-04-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProps = {
    scheduledDate: null,
    scheduledTime: null,
    durationMinutes: null,
    recurrenceRule: null,
  };

  it("renders destructive variant for overdue date when not backlog", () => {
    render(
      SchedulingBadges({
        ...baseProps,
        dueDate: "2026-04-01",
        isBacklog: false,
        // biome-ignore lint/suspicious/noExplicitAny: test mock, exact type not critical
      }) as any,
    );
    const badge = screen.getByText(/overdue/i).closest("div");
    expect(badge?.className).toContain("bg-destructive");
  });

  it("renders warning variant for due-soon date when not backlog", () => {
    render(
      SchedulingBadges({
        ...baseProps,
        dueDate: "2026-04-04",
        isBacklog: false,
        // biome-ignore lint/suspicious/noExplicitAny: test mock, exact type not critical
      }) as any,
    );
    const badge = screen.getByText(/due tomorrow/i).closest("div");
    expect(badge?.className).toContain("bg-[oklch(0.75_0.15_85");
  });

  it("renders outline variant for future date beyond threshold", () => {
    render(
      SchedulingBadges({
        ...baseProps,
        dueDate: "2026-04-10",
        isBacklog: false,
        // biome-ignore lint/suspicious/noExplicitAny: test mock, exact type not critical
      }) as any,
    );
    const badge = screen.getByText(/apr 10/i).closest("div");
    expect(badge?.className).not.toContain("bg-destructive");
    expect(badge?.className).not.toContain("bg-[oklch");
  });

  it("renders outline variant for overdue date when backlog (exemption)", () => {
    render(
      SchedulingBadges({
        ...baseProps,
        dueDate: "2026-04-01",
        isBacklog: true,
        // biome-ignore lint/suspicious/noExplicitAny: test mock, exact type not critical
      }) as any,
    );
    const badge = screen.getByText(/apr 1/i).closest("div");
    expect(badge?.className).not.toContain("bg-destructive");
  });
});
