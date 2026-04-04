import { useEffect } from "react";
import { startOfWeek, endOfWeek, addDays } from "date-fns";
import { useStore } from "@/stores";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarDayGrid } from "./CalendarDayGrid";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { AllDayBanner } from "./AllDayBanner";
import { useCalendarEvents } from "./useCalendarEvents";

export function HubCalendar() {
  const hubSelectedDate = useStore((s) => s.hubSelectedDate);
  const hubViewMode = useStore((s) => s.hubViewMode);
  const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);
  const { allDayEvents } = useCalendarEvents(hubSelectedDate);

  const weekStart = startOfWeek(new Date(hubSelectedDate + "T00:00:00"), {
    weekStartsOn: 1,
  });
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Fetch events when date or view mode changes
  useEffect(() => {
    let start: string;
    let end: string;
    if (hubViewMode === "day") {
      start = hubSelectedDate;
      end = addDays(new Date(hubSelectedDate + "T00:00:00"), 1).toISOString().split("T")[0];
    } else {
      start = weekStartStr;
      end = endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString().split("T")[0];
    }
    fetchCalendarEvents(start, end);
  }, [hubSelectedDate, hubViewMode, weekStartStr]); // eslint-disable-line react-hooks/exhaustive-deps

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
