import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/stores";
import { normalizeToMinutes } from "./calendarLayout";
import type { MergedEvent } from "./calendarTypes";

interface WorkBlock {
  id: string;
  scheduleDate: string;
  taskId: string | null;
  blockType: string;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
  taskTitle: string | null;
}

export function useCalendarEvents(dateStr: string): {
  events: MergedEvent[];
  allDayEvents: MergedEvent[];
  isLoading: boolean;
} {
  const calendarEvents = useStore((s) => s.calendarEvents);
  const _calendarAccounts = useStore((s) => s.calendarAccounts);
  const [workBlocks, setWorkBlocks] = useState<WorkBlock[]>([]);

  // Fetch work blocks for the selected date
  useEffect(() => {
    invoke<WorkBlock[]>("list_work_blocks", { date: dateStr })
      .then(setWorkBlocks)
      .catch(() => setWorkBlocks([]));
  }, [dateStr]);

  return useMemo(() => {
    const merged: MergedEvent[] = [];
    const allDay: MergedEvent[] = [];

    // Calendar events (meetings)
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

    // Work blocks from scheduled_blocks table
    for (const wb of workBlocks) {
      merged.push({
        id: wb.id,
        type: "work",
        title: wb.taskTitle ?? "Work Block",
        startMinutes: normalizeToMinutes(wb.startTime),
        endMinutes: normalizeToMinutes(wb.endTime),
        allDay: false,
        taskId: wb.taskId ?? undefined,
        isConfirmed: wb.isConfirmed,
      });
    }

    return { events: merged, allDayEvents: allDay, isLoading: false };
  }, [calendarEvents, workBlocks, dateStr]);
}
