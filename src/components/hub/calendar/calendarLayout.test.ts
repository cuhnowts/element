import { describe, expect, it } from "vitest";
import {
  assignOverlapColumns,
  eventHeight,
  normalizeToMinutes,
  timeToPixelOffset,
} from "./calendarLayout";
import type { MergedEvent } from "./calendarTypes";
import { EVENT_MIN_HEIGHT, MAX_OVERLAP_COLUMNS, SLOT_HEIGHT } from "./calendarTypes";

function makeEvent(
  overrides: Partial<MergedEvent> & { startMinutes: number; endMinutes: number },
): MergedEvent {
  return {
    id: overrides.id ?? "evt-1",
    type: overrides.type ?? "meeting",
    title: overrides.title ?? "Test Event",
    startMinutes: overrides.startMinutes,
    endMinutes: overrides.endMinutes,
    allDay: overrides.allDay ?? false,
    ...overrides,
  };
}

describe("normalizeToMinutes", () => {
  it("parses HH:mm format correctly", () => {
    expect(normalizeToMinutes("09:30")).toBe(570);
    expect(normalizeToMinutes("00:00")).toBe(0);
    expect(normalizeToMinutes("23:59")).toBe(1439);
    expect(normalizeToMinutes("14:00")).toBe(840);
  });

  it("parses ISO datetime correctly", () => {
    expect(normalizeToMinutes("2026-04-03T09:30:00")).toBe(570);
    expect(normalizeToMinutes("2026-04-03T14:00:00")).toBe(840);
    expect(normalizeToMinutes("2026-04-03T00:00:00")).toBe(0);
  });
});

describe("timeToPixelOffset", () => {
  it("returns 0 for grid start time", () => {
    expect(timeToPixelOffset(540, 540)).toBe(0); // 9:00 with grid at 9:00
  });

  it("returns 48 for 1 hour after grid start", () => {
    // 1 hour = 60 min, (60/30) * 24 = 48
    expect(timeToPixelOffset(600, 540)).toBe(48);
  });

  it("returns 24 for 30 minutes after grid start", () => {
    expect(timeToPixelOffset(570, 540)).toBe(24);
  });

  it("returns negative offset for times before grid start", () => {
    expect(timeToPixelOffset(510, 540)).toBe(-24);
  });
});

describe("eventHeight", () => {
  it("returns 48 for 1-hour event", () => {
    // 60 min / 30 min * 24px = 48px
    expect(eventHeight(540, 600)).toBe(48);
  });

  it("clamps to EVENT_MIN_HEIGHT for short events", () => {
    // 15 min / 30 min * 24px = 12px, clamped to 20
    expect(eventHeight(540, 555)).toBe(EVENT_MIN_HEIGHT);
  });

  it("returns correct height for 30-minute event", () => {
    expect(eventHeight(540, 570)).toBe(SLOT_HEIGHT);
  });

  it("returns correct height for 2-hour event", () => {
    expect(eventHeight(540, 660)).toBe(96);
  });
});

describe("assignOverlapColumns", () => {
  it("returns single column for non-overlapping events", () => {
    const events = [
      makeEvent({ id: "a", startMinutes: 540, endMinutes: 600 }), // 9-10
      makeEvent({ id: "b", startMinutes: 600, endMinutes: 660 }), // 10-11
      makeEvent({ id: "c", startMinutes: 720, endMinutes: 780 }), // 12-1
    ];
    const result = assignOverlapColumns(events);
    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.column).toBe(0);
      expect(r.totalColumns).toBe(1);
    }
  });

  it("assigns 2 columns for 2 overlapping events", () => {
    const events = [
      makeEvent({ id: "a", startMinutes: 540, endMinutes: 630 }), // 9:00-10:30
      makeEvent({ id: "b", startMinutes: 570, endMinutes: 660 }), // 9:30-11:00
    ];
    const result = assignOverlapColumns(events);
    expect(result).toHaveLength(2);
    const columns = result.map((r) => r.column).sort();
    expect(columns).toEqual([0, 1]);
    for (const r of result) {
      expect(r.totalColumns).toBe(2);
    }
  });

  it("handles cascading overlaps (A overlaps B, B overlaps C, not A/C)", () => {
    const events = [
      makeEvent({ id: "a", startMinutes: 540, endMinutes: 600 }), // 9:00-10:00
      makeEvent({ id: "b", startMinutes: 570, endMinutes: 660 }), // 9:30-11:00
      makeEvent({ id: "c", startMinutes: 630, endMinutes: 720 }), // 10:30-12:00
    ];
    const result = assignOverlapColumns(events);
    expect(result).toHaveLength(3);
    // A and B overlap -> 2 cols; B and C overlap -> they share a group
    // All 3 are in the same connected group
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const aResult = result.find((r) => r.event.id === "a")!;
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const bResult = result.find((r) => r.event.id === "b")!;
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const cResult = result.find((r) => r.event.id === "c")!;
    // A is col 0, B is col 1, C can reuse col 0 (since A ends before C starts)
    expect(aResult.column).toBe(0);
    expect(bResult.column).toBe(1);
    expect(cResult.column).toBe(0);
    // All in one group, so totalColumns should be 2
    expect(aResult.totalColumns).toBe(2);
    expect(bResult.totalColumns).toBe(2);
    expect(cResult.totalColumns).toBe(2);
  });

  it("handles adjacent events (end === start) as non-overlapping", () => {
    const events = [
      makeEvent({ id: "a", startMinutes: 540, endMinutes: 600 }), // 9-10
      makeEvent({ id: "b", startMinutes: 600, endMinutes: 660 }), // 10-11
    ];
    const result = assignOverlapColumns(events);
    expect(result).toHaveLength(2);
    // Both in column 0 since they don't overlap (end === start)
    for (const r of result) {
      expect(r.column).toBe(0);
      expect(r.totalColumns).toBe(1);
    }
  });

  it("caps at MAX_OVERLAP_COLUMNS visible columns per D-09", () => {
    const events = [
      makeEvent({ id: "a", startMinutes: 540, endMinutes: 660 }),
      makeEvent({ id: "b", startMinutes: 540, endMinutes: 660 }),
      makeEvent({ id: "c", startMinutes: 540, endMinutes: 660 }),
      makeEvent({ id: "d", startMinutes: 540, endMinutes: 660 }),
      makeEvent({ id: "e", startMinutes: 540, endMinutes: 660 }),
      makeEvent({ id: "f", startMinutes: 540, endMinutes: 660 }),
    ];
    const result = assignOverlapColumns(events);
    expect(result).toHaveLength(6);
    // All events should have totalColumns capped at MAX_OVERLAP_COLUMNS
    for (const r of result) {
      expect(r.totalColumns).toBeLessThanOrEqual(MAX_OVERLAP_COLUMNS);
    }
    // Columns assigned should be 0..5 but totalColumns capped at 4
    const maxCol = Math.max(...result.map((r) => r.column));
    expect(maxCol).toBe(5); // actual columns exist
    for (const r of result) {
      expect(r.totalColumns).toBe(MAX_OVERLAP_COLUMNS);
    }
  });

  it("returns empty array for empty input", () => {
    expect(assignOverlapColumns([])).toEqual([]);
  });
});
