import { useState, useEffect, useRef, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "@/stores";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { normalizeToMinutes, timeToPixelOffset, assignOverlapColumns } from "./calendarLayout";
import {
  SLOT_HEIGHT,
  MINUTES_PER_SLOT,
  TIME_GUTTER_WIDTH,
  CALENDAR_COLORS,
} from "./calendarTypes";
import { useCalendarEvents } from "./useCalendarEvents";
import { useNowLine } from "./useNowLine";
import { NowLine } from "./NowLine";
import { CalendarEventBlock } from "./CalendarEventBlock";
import { OverflowIndicator } from "./OverflowIndicator";

interface CalendarDayGridProps {
  dateStr: string;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function CalendarDayGrid({ dateStr }: CalendarDayGridProps) {
  const workHours = useStore((s) => s.workHours);
  const loadWorkHours = useStore((s) => s.loadWorkHours);
  const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);
  const calendarError = useStore((s) => s.calendarError);
  const calendarAccounts = useStore((s) => s.calendarAccounts);

  // Default work hours if none configured
  const effectiveWorkHours = workHours ?? {
    startTime: "09:00",
    endTime: "17:00",
    workDays: [1, 2, 3, 4, 5],
  };

  const { events, allDayEvents, isLoading } = useCalendarEvents(dateStr);

  const [expandedRange, setExpandedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Load work hours on mount if not available
  useEffect(() => {
    if (!workHours) {
      loadWorkHours();
    }
  }, [workHours, loadWorkHours]);

  // Fetch calendar events for this date
  useEffect(() => {
    fetchCalendarEvents(dateStr + "T00:00:00", dateStr + "T23:59:59");
  }, [dateStr, fetchCalendarEvents]);

  // Listen for calendar-synced Tauri event
  useEffect(() => {
    const unlisten = listen("calendar-synced", () => {
      fetchCalendarEvents(dateStr + "T00:00:00", dateStr + "T23:59:59");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [dateStr, fetchCalendarEvents]);

  // Reset scroll tracking when date changes
  useEffect(() => {
    hasScrolled.current = false;
    setExpandedRange(null);
  }, [dateStr]);

  // Compute grid range
  const gridStartMinutes = useMemo(() => {
    if (expandedRange) return expandedRange.start;
    return normalizeToMinutes(effectiveWorkHours.startTime);
  }, [effectiveWorkHours, expandedRange]);

  const gridEndMinutes = useMemo(() => {
    if (expandedRange) return expandedRange.end;
    return normalizeToMinutes(effectiveWorkHours.endTime);
  }, [effectiveWorkHours, expandedRange]);

  const { nowPixelOffset, isVisible: nowIsVisible } =
    useNowLine(gridStartMinutes);

  const isToday = dateStr === new Date().toISOString().split("T")[0];

  // Positioned events
  const positionedEvents = useMemo(
    () => assignOverlapColumns(events),
    [events],
  );

  // Build account color index map
  const accountColorMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of calendarAccounts) {
      map.set(acc.id, map.size % CALENDAR_COLORS.length);
    }
    return map;
  }, [calendarAccounts]);

  // Overflow counts
  const earlierCount = useMemo(
    () => events.filter((e) => e.startMinutes < gridStartMinutes).length,
    [events, gridStartMinutes],
  );
  const laterCount = useMemo(
    () => events.filter((e) => e.endMinutes > gridEndMinutes).length,
    [events, gridEndMinutes],
  );

  // Grid dimensions
  const totalSlots = (gridEndMinutes - gridStartMinutes) / MINUTES_PER_SLOT;
  const gridHeight = totalSlots * SLOT_HEIGHT;

  // Hour lines
  const hourLines = useMemo(() => {
    const lines: { minutes: number; isHour: boolean }[] = [];
    const startHour = Math.ceil(gridStartMinutes / 60);
    const endHour = Math.floor(gridEndMinutes / 60);
    for (let h = startHour; h <= endHour; h++) {
      const mins = h * 60;
      if (mins >= gridStartMinutes && mins <= gridEndMinutes) {
        lines.push({ minutes: mins, isHour: true });
      }
      const halfMins = mins + 30;
      if (halfMins >= gridStartMinutes && halfMins < gridEndMinutes) {
        lines.push({ minutes: halfMins, isHour: false });
      }
    }
    return lines;
  }, [gridStartMinutes, gridEndMinutes]);

  // Hour labels
  const hourLabels = useMemo(() => {
    const labels: { hour: number; offset: number }[] = [];
    const startHour = Math.ceil(gridStartMinutes / 60);
    const endHour = Math.floor(gridEndMinutes / 60);
    for (let h = startHour; h <= endHour; h++) {
      const mins = h * 60;
      if (mins >= gridStartMinutes && mins <= gridEndMinutes) {
        labels.push({
          hour: h,
          offset: timeToPixelOffset(mins, gridStartMinutes),
        });
      }
    }
    return labels;
  }, [gridStartMinutes, gridEndMinutes]);

  // Auto-scroll to now line on initial load for today
  useEffect(() => {
    if (isToday && nowIsVisible && !hasScrolled.current && scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]',
      );
      if (viewport) {
        const viewportHeight = viewport.clientHeight;
        viewport.scrollTo({
          top: Math.max(0, nowPixelOffset - viewportHeight / 3),
        });
        hasScrolled.current = true;
      }
    }
  }, [isToday, nowIsVisible, nowPixelOffset]);

  // Error state
  if (calendarError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <h3 className="text-base font-semibold">
          Couldn't load your calendar
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Check your connection and try again, or reconnect your calendar
          account in Settings.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            fetchCalendarEvents(dateStr + "T00:00:00", dateStr + "T23:59:59")
          }
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Loading events
  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  // Empty state (no events and no schedule blocks)
  if (events.length === 0 && allDayEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <h3 className="text-base font-semibold">No events today</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your calendar is clear. Connect a calendar account in Settings to see
          your meetings here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Overflow indicator - earlier */}
      {!expandedRange && earlierCount > 0 && (
        <OverflowIndicator
          count={earlierCount}
          direction="earlier"
          onClick={() =>
            setExpandedRange({ start: 0, end: gridEndMinutes })
          }
        />
      )}

      {/* Scrollable grid */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="relative" style={{ height: gridHeight }}>
          {/* Time gutter */}
          <div
            className="absolute top-0 bottom-0"
            style={{ width: TIME_GUTTER_WIDTH }}
          >
            {hourLabels.map(({ hour, offset }) => (
              <div
                key={hour}
                className="absolute right-2 text-xs text-muted-foreground leading-none"
                style={{ top: offset, transform: "translateY(-50%)" }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Grid lines */}
          {hourLines.map(({ minutes, isHour }) => (
            <div
              key={minutes}
              className="absolute right-0"
              style={{
                top: timeToPixelOffset(minutes, gridStartMinutes),
                left: TIME_GUTTER_WIDTH,
                height: 1,
                borderTop: isHour
                  ? "1px solid var(--color-border)"
                  : "1px dashed var(--color-border)",
                opacity: isHour ? 1 : 0.5,
              }}
            />
          ))}

          {/* Event area */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: TIME_GUTTER_WIDTH, right: 0 }}
          >
            {positionedEvents.map((pe) => (
              <CalendarEventBlock
                key={pe.event.id}
                event={pe}
                gridStartMinutes={gridStartMinutes}
                accountColorIndex={
                  pe.event.accountId
                    ? accountColorMap.get(pe.event.accountId) ?? 0
                    : undefined
                }
              />
            ))}

            {/* Now line */}
            {isToday && nowIsVisible && (
              <NowLine pixelOffset={nowPixelOffset} />
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Overflow indicator - later */}
      {!expandedRange && laterCount > 0 && (
        <OverflowIndicator
          count={laterCount}
          direction="later"
          onClick={() =>
            setExpandedRange({ start: gridStartMinutes, end: 24 * 60 })
          }
        />
      )}
    </div>
  );
}
