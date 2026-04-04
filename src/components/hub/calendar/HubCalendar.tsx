import { startOfWeek } from "date-fns";
import { useStore } from "@/stores";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarDayGrid } from "./CalendarDayGrid";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { AllDayBanner } from "./AllDayBanner";
import { useCalendarEvents } from "./useCalendarEvents";

export function HubCalendar() {
  const hubSelectedDate = useStore((s) => s.hubSelectedDate);
  const hubViewMode = useStore((s) => s.hubViewMode);
  const { allDayEvents } = useCalendarEvents(hubSelectedDate);

  const weekStartStr = startOfWeek(new Date(hubSelectedDate + "T00:00:00"), {
    weekStartsOn: 1,
  })
    .toISOString()
    .split("T")[0];

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
