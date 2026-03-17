import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchedulingBadges } from "../../shared/SchedulingBadges";

const nullProps = {
  dueDate: null,
  scheduledDate: null,
  scheduledTime: null,
  durationMinutes: null,
  recurrenceRule: null,
};

// Mock current date for overdue tests
beforeEach(() => {
  vi.useRealTimers();
});

describe("SchedulingBadges", () => {
  it("renders nothing when all fields null", () => {
    const { container } = render(<SchedulingBadges {...nullProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders due date badge", () => {
    render(<SchedulingBadges {...nullProps} dueDate="2026-03-20" />);
    expect(screen.getByText(/Mar 20/)).toBeInTheDocument();
  });

  it("renders overdue badge with destructive variant", () => {
    render(<SchedulingBadges {...nullProps} dueDate="2020-01-01" />);
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it("renders duration badge", () => {
    render(<SchedulingBadges {...nullProps} durationMinutes={60} />);
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("renders recurrence indicator", () => {
    render(<SchedulingBadges {...nullProps} recurrenceRule="weekly" />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });

  it("renders scheduled date and time badge", () => {
    render(
      <SchedulingBadges
        {...nullProps}
        scheduledDate="2026-03-18"
        scheduledTime="14:30"
      />,
    );
    expect(screen.getByText(/2:30 PM/)).toBeInTheDocument();
  });
});
