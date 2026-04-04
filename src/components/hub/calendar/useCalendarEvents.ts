import { useMemo } from "react";
import { useStore } from "@/stores";
import type { MergedEvent } from "./calendarTypes";
import { normalizeToMinutes } from "./calendarLayout";

export function useCalendarEvents(dateStr: string): {
  events: MergedEvent[];
  allDayEvents: MergedEvent[];
  isLoading: boolean;
} {
  const calendarEvents = useStore((s) => s.calendarEvents);
  const calendarAccounts = useStore((s) => s.calendarAccounts);
  const todaySchedule = useStore((s) => s.todaySchedule);
  const scheduleDate = useStore((s) => s.scheduleDate);
  const isScheduleLoading = useStore((s) => s.isScheduleLoading);

  return useMemo(() => {
    const merged: MergedEvent[] = [];
    const allDay: MergedEvent[] = [];

    // Filter calendar events to the target date
    for (const ce of calendarEvents) {
      const eventDate = ce.startTime.slice(0, 10);
      if (eventDate !== dateStr) continue;

      const me: MergedEvent = {
        id: ce.id,
        type: "meeting",
        title: ce.title,
        startMinutes: normalizeToMinutes(ce.startTime),
        endMinutes: normalizeToMinutes(ce.endTime),
        allDay: ce.allDay,
        accountId: ce.accountId,
        location: ce.location,
        attendees: ce.attendees,
        status: ce.status,
      };

      if (ce.allDay) allDay.push(me);
      else merged.push(me);
    }

    // Merge schedule blocks (only available for scheduleDate, typically today)
    if (scheduleDate === dateStr) {
      for (const sb of todaySchedule) {
        if (sb.blockType === "meeting") continue; // skip meeting blocks, already from calendar
        merged.push({
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

    return { events: merged, allDayEvents: allDay, isLoading: isScheduleLoading };
  }, [calendarEvents, calendarAccounts, todaySchedule, scheduleDate, dateStr, isScheduleLoading]);
}
