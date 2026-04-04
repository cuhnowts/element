import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { useStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { HEADER_BAR_HEIGHT } from "./calendarTypes";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function CalendarHeader() {
  const hubSelectedDate = useStore((s) => s.hubSelectedDate);
  const hubViewMode = useStore((s) => s.hubViewMode);
  const setHubSelectedDate = useStore((s) => s.setHubSelectedDate);
  const setHubViewMode = useStore((s) => s.setHubViewMode);

  const isToday = hubSelectedDate === todayISO();

  const dateLabel = useMemo(() => {
    const date = new Date(hubSelectedDate + "T00:00:00");
    if (hubViewMode === "day") {
      return format(date, "EEE, MMM d");
    }
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    // Show Mon-Fri (work week)
    const fri = addDays(weekStart, 4);
    return `${format(weekStart, "MMM d")} - ${format(fri, "MMM d")}`;
  }, [hubSelectedDate, hubViewMode]);

  const goBack = () => {
    const date = new Date(hubSelectedDate + "T00:00:00");
    const result =
      hubViewMode === "day" ? addDays(date, -1) : addWeeks(date, -1);
    setHubSelectedDate(result.toISOString().split("T")[0]);
  };

  const goForward = () => {
    const date = new Date(hubSelectedDate + "T00:00:00");
    const result =
      hubViewMode === "day" ? addDays(date, 1) : addWeeks(date, 1);
    setHubSelectedDate(result.toISOString().split("T")[0]);
  };

  const goToday = () => {
    setHubSelectedDate(todayISO());
  };

  const prevLabel =
    hubViewMode === "day" ? "Previous day" : "Previous week";
  const nextLabel = hubViewMode === "day" ? "Next day" : "Next week";

  return (
    <div
      className="flex items-center justify-between px-4 bg-card border-b shrink-0"
      style={{ height: HEADER_BAR_HEIGHT }}
    >
      {/* Left: date display */}
      <span className="text-base font-semibold whitespace-nowrap">
        {dateLabel}
      </span>

      {/* Center: nav arrows + Today */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={prevLabel}
          onClick={goBack}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isToday}
          onClick={goToday}
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={nextLabel}
          onClick={goForward}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Right: Day/Week toggle */}
      <div role="tablist" className="flex rounded-md border">
        <button
          type="button"
          role="tab"
          aria-selected={hubViewMode === "day"}
          className={`px-3 py-1 text-xs font-medium rounded-l-md transition-colors ${
            hubViewMode === "day"
              ? "bg-secondary text-foreground"
              : "bg-transparent text-muted-foreground"
          }`}
          onClick={() => setHubViewMode("day")}
        >
          Day
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={hubViewMode === "week"}
          className={`px-3 py-1 text-xs font-medium rounded-r-md transition-colors ${
            hubViewMode === "week"
              ? "bg-secondary text-foreground"
              : "bg-transparent text-muted-foreground"
          }`}
          onClick={() => setHubViewMode("week")}
        >
          Week
        </button>
      </div>
    </div>
  );
}
