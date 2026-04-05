import { addDays, endOfWeek, startOfWeek } from "date-fns";
import { useEffect, useRef } from "react";
import { api } from "@/lib/tauri";
import { useStore } from "@/stores";
import { AllDayBanner } from "./AllDayBanner";
import { CalendarDayGrid } from "./CalendarDayGrid";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { useCalendarEvents } from "./useCalendarEvents";

export function HubCalendar() {
  const hubSelectedDate = useStore((s) => s.hubSelectedDate);
  const hubViewMode = useStore((s) => s.hubViewMode);
  const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);
  const { allDayEvents } = useCalendarEvents(hubSelectedDate);
  const hasSynced = useRef(false);

  const weekStart = startOfWeek(new Date(`${hubSelectedDate}T00:00:00`), {
    weekStartsOn: 1,
  });
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Auto-sync calendar on mount (if stale)
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      api.syncAllIfStale().catch(() => {});
    }
  }, []);

  // Fetch events when date or view mode changes
  useEffect(() => {
    let start: string;
    let end: string;
    if (hubViewMode === "day") {
      start = hubSelectedDate;
      end = addDays(new Date(`${hubSelectedDate}T00:00:00`), 1)
        .toISOString()
        .split("T")[0];
    } else {
      start = weekStartStr;
      end = endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString().split("T")[0];
    }
    fetchCalendarEvents(start, end);
  }, [hubSelectedDate, hubViewMode, weekStartStr, fetchCalendarEvents, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader />
      <AllDayBanner events={allDayEvents} />
      {hubViewMode === "day" ? (
        <CalendarDayGrid dateStr={hubSelectedDate} />
      ) : (
        <CalendarWeekGrid weekStartDate={weekStartStr} />
      )}
    </div>
  );
}
