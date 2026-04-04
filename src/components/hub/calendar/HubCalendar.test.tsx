import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// --- Store mocks ---

const mockSelectTask = vi.fn();
const mockSetActiveView = vi.fn();
const mockSetHubViewMode = vi.fn();
const mockSetHubSelectedDate = vi.fn();
const mockFetchCalendarEvents = vi.fn().mockResolvedValue(undefined);
const mockLoadWorkHours = vi.fn().mockResolvedValue(undefined);

const defaultStoreState: Record<string, unknown> = {
  hubSelectedDate: new Date().toISOString().split("T")[0],
  hubViewMode: "day" as const,
  calendarEvents: [],
  calendarAccounts: [],
  calendarError: null,
  todaySchedule: [],
  scheduleDate: new Date().toISOString().split("T")[0],
  isScheduleLoading: false,
  workHours: {
    startTime: "09:00",
    endTime: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    bufferMinutes: 15,
    minBlockMinutes: 30,
  },
  fetchCalendarEvents: mockFetchCalendarEvents,
  loadWorkHours: mockLoadWorkHours,
  setHubSelectedDate: mockSetHubSelectedDate,
  setHubViewMode: mockSetHubViewMode,
  setActiveView: mockSetActiveView,
};

let storeState = { ...defaultStoreState };

const useStoreMock = (selector: (s: Record<string, unknown>) => unknown) =>
  selector(storeState);
useStoreMock.getState = () => storeState;

vi.mock("@/stores", () => ({
  useStore: useStoreMock,
}));

vi.mock("@/stores/useWorkspaceStore", () => ({
  useWorkspaceStore: {
    getState: () => ({
      selectTask: mockSelectTask,
    }),
  },
}));

// Mock date-fns used in CalendarHeader
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

beforeEach(() => {
  vi.clearAllMocks();
  storeState = { ...defaultStoreState };
});

describe("HubCalendar", () => {
  describe("Empty state", () => {
    it("renders 'No events today' when no events and schedule is loaded", async () => {
      storeState = {
        ...defaultStoreState,
        calendarEvents: [],
        todaySchedule: [],
        isScheduleLoading: false,
      };

      const { CalendarDayGrid } = await import("./CalendarDayGrid");
      render(<CalendarDayGrid dateStr={storeState.hubSelectedDate as string} />);

      expect(screen.getByText("No events today")).toBeInTheDocument();
      expect(
        screen.getByText(/Your calendar is clear/),
      ).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("renders skeleton elements when isScheduleLoading is true", async () => {
      storeState = {
        ...defaultStoreState,
        isScheduleLoading: true,
      };

      const { CalendarDayGrid } = await import("./CalendarDayGrid");
      render(<CalendarDayGrid dateStr={storeState.hubSelectedDate as string} />);

      // Skeletons have a known class
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Error state", () => {
    it("renders error message and Try Again button when calendarError is set", async () => {
      storeState = {
        ...defaultStoreState,
        calendarError: "Network error",
      };

      const { CalendarDayGrid } = await import("./CalendarDayGrid");
      render(<CalendarDayGrid dateStr={storeState.hubSelectedDate as string} />);

      expect(
        screen.getByText("Couldn't load your calendar"),
      ).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  describe("CalendarHeader view toggle", () => {
    it("calls setHubViewMode with 'week' when Week button is clicked", async () => {
      const { CalendarHeader } = await import("./CalendarHeader");
      render(<CalendarHeader />);

      const weekButton = screen.getByText("Week");
      fireEvent.click(weekButton);

      expect(mockSetHubViewMode).toHaveBeenCalledWith("week");
    });

    it("calls setHubSelectedDate with today when Today button is clicked from a different date", async () => {
      storeState = {
        ...defaultStoreState,
        hubSelectedDate: "2025-01-01",
      };

      const { CalendarHeader } = await import("./CalendarHeader");
      render(<CalendarHeader />);

      const todayButton = screen.getByText("Today");
      fireEvent.click(todayButton);

      const todayStr = new Date().toISOString().split("T")[0];
      expect(mockSetHubSelectedDate).toHaveBeenCalledWith(todayStr);
    });
  });

  describe("CalendarEventBlock - work block navigation", () => {
    it("calls selectTask and setActiveView when a work block with taskId is clicked", async () => {
      const { CalendarEventBlock } = await import("./CalendarEventBlock");

      render(
        <CalendarEventBlock
          event={{
            event: {
              id: "work-1",
              type: "work",
              title: "Implement feature",
              startMinutes: 600,
              endMinutes: 660,
              allDay: false,
              taskId: "test-123",
            },
            column: 0,
            totalColumns: 1,
          }}
          gridStartMinutes={540}
        />,
      );

      const block = screen.getByRole("button", {
        name: /Implement feature/,
      });
      fireEvent.click(block);

      expect(mockSelectTask).toHaveBeenCalledWith("test-123");
      expect(mockSetActiveView).toHaveBeenCalledWith("task");
    });
  });

  describe("CalendarEventBlock - meeting block", () => {
    it("does NOT call selectTask when a meeting block is clicked", async () => {
      const { CalendarEventBlock } = await import("./CalendarEventBlock");

      render(
        <CalendarEventBlock
          event={{
            event: {
              id: "meeting-1",
              type: "meeting",
              title: "Team Standup",
              startMinutes: 600,
              endMinutes: 660,
              allDay: false,
              accountId: "acc-1",
            },
            column: 0,
            totalColumns: 1,
          }}
          gridStartMinutes={540}
          accountColorIndex={0}
        />,
      );

      const block = screen.getByRole("button", {
        name: /Team Standup/,
      });
      fireEvent.click(block);

      expect(mockSelectTask).not.toHaveBeenCalled();
    });
  });
});
