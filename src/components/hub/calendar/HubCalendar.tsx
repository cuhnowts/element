import { useStore } from "@/stores";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarDayGrid } from "./CalendarDayGrid";
import { AllDayBanner } from "./AllDayBanner";
import { useCalendarEvents } from "./useCalendarEvents";

export function HubCalendar() {
  const hubSelectedDate = useStore((s) => s.hubSelectedDate);
  const hubViewMode = useStore((s) => s.hubViewMode);
  const { allDayEvents } = useCalendarEvents(hubSelectedDate);

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader />
      <AllDayBanner events={allDayEvents} />
      {hubViewMode === "day" ? (
        <CalendarDayGrid dateStr={hubSelectedDate} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Week view coming in Plan 03
        </div>
      )}
    </div>
  );
}
