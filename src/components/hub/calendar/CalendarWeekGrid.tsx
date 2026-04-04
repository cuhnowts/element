import { useState, useEffect, useRef, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { parseISO, addDays, format } from "date-fns";
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
import { useNowLine } from "./useNowLine";
import { NowLine } from "./NowLine";
import { CalendarEventBlock } from "./CalendarEventBlock";

const DEFAULT_WORK_DAYS = ["mon", "tue", "wed", "thu", "fri"];

const DAY_KEY_TO_OFFSET: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const DAY_COLUMN_MIN_WIDTH = 120;

interface CalendarWeekGridProps {
  weekStartDate: string; // "YYYY-MM-DD" of Monday
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function CalendarWeekGrid({ weekStartDate }: CalendarWeekGridProps) {
  const workHours = useStore((s) => s.workHours);
  const loadWorkHours = useStore((s) => s.loadWorkHours);
  const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);
  const calendarEvents = useStore((s) => s.calendarEvents);
  const calendarAccounts = useStore((s) => s.calendarAccounts);
  const calendarError = useStore((s) => s.calendarError);
  const todaySchedule = useStore((s) => s.todaySchedule);
  const scheduleDate = useStore((s) => s.scheduleDate);
  const isScheduleLoading = useStore((s) => s.isScheduleLoading);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Load work hours on mount if not available
  useEffect(() => {
    if (!workHours) {
      loadWorkHours();
    }
  }, [workHours, loadWorkHours]);

  // Fetch calendar events for the full week (Monday to Sunday)
  useEffect(() => {
    const endDate = addDays(parseISO(weekStartDate), 6)
      .toISOString()
      .split("T")[0];
    fetchCalendarEvents(
      weekStartDate + "T00:00:00",
      endDate + "T23:59:59",
    );
  }, [weekStartDate, fetchCalendarEvents]);

  // Listen for calendar-synced Tauri event
  useEffect(() => {
    const unlisten = listen("calendar-synced", () => {
      const endDate = addDays(parseISO(weekStartDate), 6)
        .toISOString()
        .split("T")[0];
      fetchCalendarEvents(
        weekStartDate + "T00:00:00",
        endDate + "T23:59:59",
      );
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [weekStartDate, fetchCalendarEvents]);

  // Reset scroll tracking when week changes
  useEffect(() => {
    hasScrolled.current = false;
  }, [weekStartDate]);

  // Compute visible day columns from workHours.workDays
  const visibleDays = useMemo(() => {
    const dayKeys = workHours?.workDays ?? DEFAULT_WORK_DAYS;
    return dayKeys
      .slice()
      .sort((a, b) => (DAY_KEY_TO_OFFSET[a] ?? 0) - (DAY_KEY_TO_OFFSET[b] ?? 0))
      .map((key) => addDays(parseISO(weekStartDate), DAY_KEY_TO_OFFSET[key] ?? 0));
  }, [workHours, weekStartDate]);

  // Compute grid range from work hours
  const gridStartMinutes = useMemo(() => {
    if (!workHours) return 9 * 60;
    return normalizeToMinutes(workHours.startTime);
  }, [workHours]);

  const gridEndMinutes = useMemo(() => {
    if (!workHours) return 17 * 60;
    return normalizeToMinutes(workHours.endTime);
  }, [workHours]);

  const { nowPixelOffset, isVisible: nowIsVisible } =
    useNowLine(gridStartMinutes);

  const todayStr = new Date().toISOString().split("T")[0];

  // Build account color index map
  const accountColorMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of calendarAccounts) {
      map.set(acc.id, map.size % CALENDAR_COLORS.length);
    }
    return map;
  }, [calendarAccounts]);

  // Events grouped by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof assignOverlapColumns>>();

    for (const day of visibleDays) {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayEvents: import("./calendarTypes").MergedEvent[] = [];

      // Calendar events for this day
      for (const ce of calendarEvents) {
        const eventDate = ce.startTime.slice(0, 10);
        if (eventDate !== dateStr) continue;
        if (ce.allDay) continue;
        dayEvents.push({
          id: ce.id,
          type: "meeting",
          title: ce.title,
          startMinutes: normalizeToMinutes(ce.startTime),
          endMinutes: normalizeToMinutes(ce.endTime),
          allDay: false,
          accountId: ce.accountId,
          location: ce.location,
          attendees: ce.attendees,
          status: ce.status,
        });
      }

      // Schedule blocks only for today's column (per research recommendation)
      if (scheduleDate === dateStr) {
        for (const sb of todaySchedule) {
          if (sb.blockType === "meeting") continue;
          dayEvents.push({
            id: sb.id,
            type: sb.blockType as "work" | "buffer",
            title: sb.taskTitle ?? sb.eventTitle ?? "Work Block",
            startMinutes: normalizeToMinutes(sb.startTime),
            endMinutes: normalizeToMinutes(sb.endTime),
            allDay: false,
            taskId: sb.taskId,
            taskPriority: sb.taskPriority,
            isConfirmed: sb.isConfirmed,
          });
        }
      }

      map.set(dateStr, assignOverlapColumns(dayEvents));
    }

    return map;
  }, [visibleDays, calendarEvents, todaySchedule, scheduleDate]);

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

  // Auto-scroll to now line on initial load
  useEffect(() => {
    if (nowIsVisible && !hasScrolled.current && scrollRef.current) {
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
  }, [nowIsVisible, nowPixelOffset]);

  // Loading state
  if (!workHours) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }

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
          onClick={() => {
            const endDate = addDays(parseISO(weekStartDate), 6)
              .toISOString()
              .split("T")[0];
            fetchCalendarEvents(
              weekStartDate + "T00:00:00",
              endDate + "T23:59:59",
            );
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Loading events
  if (isScheduleLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="flex min-w-0">
          {/* Time gutter */}
          <div
            className="shrink-0 relative"
            style={{ width: TIME_GUTTER_WIDTH, height: gridHeight }}
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

          {/* Day columns */}
          {visibleDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isToday = dateStr === todayStr;
            const dayPositioned = eventsByDate.get(dateStr) ?? [];

            return (
              <div
                key={dateStr}
                className="flex-1 flex flex-col"
                style={{ minWidth: DAY_COLUMN_MIN_WIDTH }}
              >
                {/* Column header */}
                <div className="flex items-center justify-center gap-1 py-1 border-b text-xs shrink-0">
                  <span className="text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={`size-6 flex items-center justify-center rounded-full font-semibold ${
                      isToday
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                    style={
                      isToday
                        ? { backgroundColor: "oklch(0.585 0.156 272)" }
                        : undefined
                    }
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Grid area */}
                <div
                  className={`relative border-l ${isToday ? "bg-card" : ""}`}
                  style={{ height: gridHeight }}
                >
                  {/* Grid lines */}
                  {hourLines.map(({ minutes, isHour }) => (
                    <div
                      key={minutes}
                      className="absolute left-0 right-0"
                      style={{
                        top: timeToPixelOffset(minutes, gridStartMinutes),
                        height: 1,
                        borderTop: isHour
                          ? "1px solid var(--color-border)"
                          : "1px dashed var(--color-border)",
                        opacity: isHour ? 1 : 0.5,
                      }}
                    />
                  ))}

                  {/* Events */}
                  {dayPositioned.map((pe) => (
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

                  {/* Now line - only in today's column */}
                  {isToday && nowIsVisible && (
                    <NowLine pixelOffset={nowPixelOffset} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
