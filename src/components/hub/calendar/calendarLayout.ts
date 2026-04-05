import type { MergedEvent, PositionedEvent } from "./calendarTypes";
import {
  EVENT_MIN_HEIGHT,
  MAX_OVERLAP_COLUMNS,
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "./calendarTypes";

/**
 * Normalize a time string to minutes from midnight.
 * Accepts "HH:mm" or ISO datetime ("2026-04-03T14:00:00").
 */
export function normalizeToMinutes(time: string): number {
  if (time.includes("T")) {
    // ISO datetime format
    const d = new Date(time);
    return d.getHours() * 60 + d.getMinutes();
  }
  // HH:mm format
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes-from-midnight to a pixel offset relative to grid start.
 */
export function timeToPixelOffset(minutes: number, gridStartMinutes: number): number {
  return ((minutes - gridStartMinutes) / MINUTES_PER_SLOT) * SLOT_HEIGHT;
}

/**
 * Compute pixel height for an event given start/end in minutes.
 * Clamps to EVENT_MIN_HEIGHT for very short events.
 */
export function eventHeight(startMinutes: number, endMinutes: number): number {
  const durationMinutes = endMinutes - startMinutes;
  const raw = (durationMinutes / MINUTES_PER_SLOT) * SLOT_HEIGHT;
  return Math.max(EVENT_MIN_HEIGHT, raw);
}

/**
 * Assign overlap columns using a greedy column assignment algorithm
 * (Google Calendar pattern). Events are sorted by start time, then by
 * duration (longer first). Each event is placed in the first column
 * where the previous event has ended.
 *
 * After column assignment, overlap groups are computed as connected
 * components of overlapping events. totalColumns for each event is
 * the number of distinct columns in its group, capped at MAX_OVERLAP_COLUMNS.
 */
export function assignOverlapColumns(events: MergedEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];

  // Sort by start time, then by duration descending (longer first)
  const sorted = [...events].sort((a, b) => {
    const diff = a.startMinutes - b.startMinutes;
    if (diff !== 0) return diff;
    return b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes);
  });

  // Greedy column assignment: for each event, find first column where
  // the last event in that column ends <= this event's start
  const columns: MergedEvent[][] = [];
  const eventColumnMap = new Map<string, number>();

  for (const event of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      if (lastInCol.endMinutes <= event.startMinutes) {
        columns[col].push(event);
        eventColumnMap.set(event.id, col);
        placed = true;
        break;
      }
    }
    if (!placed) {
      eventColumnMap.set(event.id, columns.length);
      columns.push([event]);
    }
  }

  // Build overlap groups as connected components.
  // Two events are in the same group if they overlap in time.
  // Use union-find for efficiency.
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id);
    if (p !== undefined && p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const event of sorted) {
    parent.set(event.id, event.id);
  }

  // Check pairwise overlaps (events are sorted by start)
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // Since sorted by start, sorted[j].start >= sorted[i].start
      // They overlap if sorted[j].start < sorted[i].end
      if (sorted[j].startMinutes < sorted[i].endMinutes) {
        union(sorted[i].id, sorted[j].id);
      } else {
        // No further events can overlap with sorted[i] either
        // (but they might overlap with something else, so don't break)
      }
    }
  }

  // For each group, compute the number of distinct columns used
  const groupColumns = new Map<string, Set<number>>();
  for (const event of sorted) {
    const root = find(event.id);
    if (!groupColumns.has(root)) {
      groupColumns.set(root, new Set());
    }
    const col = eventColumnMap.get(event.id);
    if (col !== undefined) {
      groupColumns.get(root)?.add(col);
    }
  }

  // Build result
  return sorted.map((event) => {
    const root = find(event.id);
    const colCount = groupColumns.get(root)?.size;
    return {
      event,
      column: eventColumnMap.get(event.id) ?? 0,
      totalColumns: Math.min(colCount ?? 1, MAX_OVERLAP_COLUMNS),
    };
  });
}
