import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isOverdue, isDueSoon, isBacklogPhase } from "./date-utils";

describe("date-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "today" to 2026-04-03
    vi.setSystemTime(new Date("2026-04-03T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isOverdue", () => {
    it("returns true for a past date", () => {
      expect(isOverdue("2026-04-01")).toBe(true);
    });

    it("returns false for today", () => {
      expect(isOverdue("2026-04-03")).toBe(false);
    });

    it("returns false for a future date", () => {
      expect(isOverdue("2026-04-05")).toBe(false);
    });
  });

  describe("isDueSoon", () => {
    it("returns true for today (within 2 days)", () => {
      expect(isDueSoon("2026-04-03")).toBe(true);
    });

    it("returns true for tomorrow (within 2 days)", () => {
      expect(isDueSoon("2026-04-04")).toBe(true);
    });

    it("returns true for 2 days from now (within threshold)", () => {
      expect(isDueSoon("2026-04-05")).toBe(true);
    });

    it("returns false for 3 days from now (beyond threshold)", () => {
      expect(isDueSoon("2026-04-06")).toBe(false);
    });

    it("returns false for past dates (overdue, not due-soon)", () => {
      expect(isDueSoon("2026-04-01")).toBe(false);
    });
  });

  describe("isBacklogPhase", () => {
    it("returns true for sortOrder 999", () => {
      expect(isBacklogPhase(999)).toBe(true);
    });

    it("returns true for sortOrder 1000", () => {
      expect(isBacklogPhase(1000)).toBe(true);
    });

    it("returns false for sortOrder 998", () => {
      expect(isBacklogPhase(998)).toBe(false);
    });

    it("returns false for sortOrder 1", () => {
      expect(isBacklogPhase(1)).toBe(false);
    });
  });
});
