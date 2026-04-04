import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { emitDataChanged } from "./write-tools.js";

// --- Helpers ---

/** Parse "HH:mm" to minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:mm" */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface OccupiedRange {
  start: number; // minutes since midnight
  end: number;
}

// --- handleListCalendarEvents ---

export function handleListCalendarEvents(
  db: Database.Database,
  args: { startDate: string; endDate: string }
) {
  const rows = db
    .prepare(
      `SELECT id, title, description, location, start_time, end_time, all_day, status
       FROM calendar_events
       WHERE start_time >= ? AND end_time <= ?
       ORDER BY start_time`
    )
    .all(args.startDate + "T00:00:00", args.endDate + "T23:59:59");

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
  };
}

// --- handleGetAvailableSlots ---

interface WorkHoursRow {
  start_time: string;
  end_time: string;
  work_days: string;
  buffer_minutes: number;
  min_block_minutes: number;
}

interface TimeRange {
  start_time: string;
  end_time: string;
}

export function handleGetAvailableSlots(
  db: Database.Database,
  args: { date: string }
) {
  // Read work_hours config (defaults if missing)
  const whRow = db
    .prepare(
      "SELECT start_time, end_time, work_days, buffer_minutes, min_block_minutes FROM work_hours WHERE id = 1"
    )
    .get() as WorkHoursRow | undefined;

  const workHours = whRow ?? {
    start_time: "09:00",
    end_time: "17:00",
    work_days: "mon,tue,wed,thu,fri",
    buffer_minutes: 10,
    min_block_minutes: 30,
  };

  const workStart = timeToMinutes(workHours.start_time);
  const workEnd = timeToMinutes(workHours.end_time);
  const bufferMins = workHours.buffer_minutes;
  const minBlockMins = workHours.min_block_minutes;

  if (workStart >= workEnd) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify([]) }],
    };
  }

  // Compute next day for calendar event query range
  const dateParts = args.date.split("-").map(Number);
  const nextDate = new Date(
    Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2] + 1)
  );
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  // Read calendar events for the date
  const calEvents = db
    .prepare(
      "SELECT start_time, end_time FROM calendar_events WHERE start_time >= ? AND start_time < ?"
    )
    .all(args.date + "T00:00:00", nextDateStr + "T00:00:00") as TimeRange[];

  // Read confirmed scheduled blocks for the date
  const blocks = db
    .prepare(
      "SELECT start_time, end_time FROM scheduled_blocks WHERE schedule_date = ? AND is_confirmed = 1"
    )
    .all(args.date) as TimeRange[];

  const occupied: OccupiedRange[] = [];

  // Calendar events: clamp to work hours, apply buffer
  for (const evt of calEvents) {
    const eStart = timeToMinutes(evt.start_time.slice(11, 16));
    const eEnd = timeToMinutes(evt.end_time.slice(11, 16));

    // Skip events entirely outside work hours
    if (eEnd <= workStart || eStart >= workEnd) continue;

    // Clamp to work hours
    const clampedStart = Math.max(eStart, workStart);
    const clampedEnd = Math.min(eEnd, workEnd);
    if (clampedStart >= clampedEnd) continue;

    // Apply buffer
    const bufferedStart = Math.max(clampedStart - bufferMins, workStart);
    const bufferedEnd = Math.min(clampedEnd + bufferMins, workEnd);

    occupied.push({ start: bufferedStart, end: bufferedEnd });
  }

  // Scheduled blocks: clamp to work hours, NO buffer
  for (const blk of blocks) {
    const bStart = timeToMinutes(blk.start_time);
    const bEnd = timeToMinutes(blk.end_time);

    if (bEnd <= workStart || bStart >= workEnd) continue;

    const clampedStart = Math.max(bStart, workStart);
    const clampedEnd = Math.min(bEnd, workEnd);
    if (clampedStart >= clampedEnd) continue;

    occupied.push({ start: clampedStart, end: clampedEnd });
  }

  // Sort by start
  occupied.sort((a, b) => a.start - b.start);

  // Merge overlapping ranges
  const merged: OccupiedRange[] = [];
  for (const range of occupied) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  // Walk from workStart to workEnd collecting gaps
  const gaps: { start: string; end: string; duration_minutes: number }[] = [];
  let cursor = workStart;

  for (const occ of merged) {
    if (cursor < occ.start) {
      const duration = occ.start - cursor;
      if (duration >= minBlockMins) {
        gaps.push({
          start: minutesToTime(cursor),
          end: minutesToTime(occ.start),
          duration_minutes: duration,
        });
      }
    }
    cursor = Math.max(cursor, occ.end);
  }

  // Final gap after last occupied range
  if (cursor < workEnd) {
    const duration = workEnd - cursor;
    if (duration >= minBlockMins) {
      gaps.push({
        start: minutesToTime(cursor),
        end: minutesToTime(workEnd),
        duration_minutes: duration,
      });
    }
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(gaps, null, 2) }],
  };
}

// --- handleCreateWorkBlock ---

export function handleCreateWorkBlock(
  db: Database.Database,
  dbPath: string,
  args: { date: string; taskId: string; startTime: string; endTime: string }
) {
  // Validate task exists
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ?")
    .get(args.taskId);

  if (!task) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Task not found with id "${args.taskId}"`,
        },
      ],
      isError: true,
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
     VALUES (?, ?, ?, 'work', ?, ?, 1, ?)`
  ).run(id, args.date, args.taskId, args.startTime, args.endTime, now);

  emitDataChanged(dbPath, "schedule-changed");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          id,
          date: args.date,
          taskId: args.taskId,
          startTime: args.startTime,
          endTime: args.endTime,
        }),
      },
    ],
  };
}

// --- handleMoveWorkBlock ---

export function handleMoveWorkBlock(
  db: Database.Database,
  dbPath: string,
  args: { blockId: string; startTime: string; endTime: string }
) {
  const block = db
    .prepare("SELECT id, schedule_date FROM scheduled_blocks WHERE id = ?")
    .get(args.blockId);

  if (!block) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Scheduled block not found with id "${args.blockId}"`,
        },
      ],
      isError: true,
    };
  }

  db.prepare(
    "UPDATE scheduled_blocks SET start_time = ?, end_time = ? WHERE id = ?"
  ).run(args.startTime, args.endTime, args.blockId);

  emitDataChanged(dbPath, "schedule-changed");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          blockId: args.blockId,
          startTime: args.startTime,
          endTime: args.endTime,
        }),
      },
    ],
  };
}

// --- handleDeleteWorkBlock ---

export function handleDeleteWorkBlock(
  db: Database.Database,
  dbPath: string,
  args: { blockId: string }
) {
  const block = db
    .prepare("SELECT id FROM scheduled_blocks WHERE id = ?")
    .get(args.blockId);

  if (!block) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: Scheduled block not found with id "${args.blockId}"`,
        },
      ],
      isError: true,
    };
  }

  db.prepare("DELETE FROM scheduled_blocks WHERE id = ?").run(args.blockId);

  emitDataChanged(dbPath, "schedule-changed");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ blockId: args.blockId, deleted: true }),
      },
    ],
  };
}
