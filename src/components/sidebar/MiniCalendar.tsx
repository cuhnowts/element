import { useState, useEffect, useCallback, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { Calendar } from "@/components/ui/calendar";
import { useStore } from "@/stores";
import { CalendarScheduleOverlay } from "./CalendarScheduleOverlay";

const CALENDAR_COLORS = [
  "var(--chart-2)", // teal (Account 1)
  "var(--chart-4)", // amber (Account 2)
  "var(--chart-1)", // orange (Account 3)
  "var(--chart-5)", // gold (Account 4+)
];

function getCalendarColor(colorIndex: number): string {
  return CALENDAR_COLORS[Math.min(colorIndex, CALENDAR_COLORS.length - 1)];
}

interface MiniCalendarProps {
  onDateSelect?: (date: Date | undefined) => void;
}

export function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarEvents = useStore((s) => s.calendarEvents);
  const calendarAccounts = useStore((s) => s.calendarAccounts);
  const fetchCalendarEvents = useStore((s) => s.fetchCalendarEvents);

  // Fetch events for the visible month range
  const fetchMonthEvents = useCallback(() => {
    const start = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const end = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    fetchCalendarEvents(start.toISOString(), end.toISOString());
  }, [currentMonth, fetchCalendarEvents]);

  // Fetch on mount and when month changes
  useEffect(() => {
    fetchMonthEvents();
  }, [fetchMonthEvents]);

  // Listen for "calendar-synced" Tauri event to auto-refresh
  useEffect(() => {
    const unlisten = listen("calendar-synced", () => {
      fetchMonthEvents();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchMonthEvents]);

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onDateSelect?.(date);
    if (date) {
      const setHubSelectedDate = useStore.getState().setHubSelectedDate;
      setHubSelectedDate(date.toISOString().split("T")[0]);
    }
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  // Build a map of date -> account color indices for event dots
  const eventDotsByDate = useMemo(() => {
    const map = new Map<string, Set<number>>();

    // Build account id -> colorIndex lookup
    const accountColors = new Map<string, number>();
    for (const account of calendarAccounts) {
      accountColors.set(account.id, account.colorIndex);
    }

    for (const event of calendarEvents) {
      const dateKey = event.startTime.slice(0, 10); // YYYY-MM-DD
      if (!map.has(dateKey)) {
        map.set(dateKey, new Set());
      }
      const colorIndex = accountColors.get(event.accountId) ?? 0;
      map.get(dateKey)!.add(colorIndex);
    }

    return map;
  }, [calendarEvents, calendarAccounts]);

  // Build a map for tooltip content
  const eventDetailsByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        title: string;
        startTime: string;
        endTime: string;
        location: string | null;
        attendeeCount: number;
      }>
    >();

    for (const event of calendarEvents) {
      const dateKey = event.startTime.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push({
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        attendeeCount: event.attendees.length,
      });
    }

    return map;
  }, [calendarEvents]);

  return (
    <div className="relative px-2">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        onMonthChange={handleMonthChange}
        className="w-full"
        components={{
          DayButton: ({ day, ...props }) => {
            const dateKey = day.isoDate ?? `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
            const dots = eventDotsByDate.get(dateKey);
            const events = eventDetailsByDate.get(dateKey);

            const dotColors = dots
              ? Array.from(dots)
                  .slice(0, 3)
                  .map((ci) => getCalendarColor(ci))
              : [];

            const tooltipContent = events
              ?.slice(0, 5)
              .map((e) => {
                const time = e.startTime.includes("T00:00:00")
                  ? "All day"
                  : `${new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(e.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                let text = `${e.title} (${time})`;
                if (e.location) text += ` @ ${e.location}`;
                if (e.attendeeCount > 0)
                  text += ` [${e.attendeeCount} attendee${e.attendeeCount > 1 ? "s" : ""}]`;
                return text;
              })
              .join("\n");

            return (
              <div className="relative flex flex-col items-center">
                <button
                  {...props}
                  title={tooltipContent || undefined}
                />
                {dotColors.length > 0 && (
                  <div className="absolute -bottom-0.5 flex gap-0.5">
                    {dotColors.map((color, i) => (
                      <span
                        key={i}
                        className="size-1 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          },
        }}
      />
      <CalendarScheduleOverlay />
    </div>
  );
}
