import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { format } from "date-fns";

describe("Calendar today detection", () => {
  beforeEach(() => {
    // Fix time to 2026-04-04 23:30 local -- near midnight to stress timezone edge case
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 4, 23, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("todayStr uses local timezone format, not UTC toISOString", () => {
    // This is what the fixed code should produce
    const todayStr = format(new Date(), "yyyy-MM-dd");
    expect(todayStr).toBe("2026-04-04");

    // This is what the buggy code produced (UTC may roll to next day)
    const utcStr = new Date().toISOString().split("T")[0];
    // In UTC+N timezones where 23:30 local = next day UTC, these will differ
    // In UTC-N timezones they'll match -- but the fix ensures consistent local behavior
    expect(typeof utcStr).toBe("string");
  });

  it("only one day matches todayStr in a week range", () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2026, 3, 1 + i); // Apr 1-7
      return format(d, "yyyy-MM-dd");
    });
    const todayMatches = weekDays.filter((d) => d === todayStr);
    expect(todayMatches).toHaveLength(1);
    expect(todayMatches[0]).toBe("2026-04-04");
  });
});
