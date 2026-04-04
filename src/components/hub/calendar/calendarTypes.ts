export type MergedEvent = {
  id: string;
  type: "meeting" | "work" | "buffer";
  title: string;
  startMinutes: number;
  endMinutes: number;
  allDay: boolean;
  accountId?: string;
  location?: string | null;
  attendees?: string[];
  status?: string;
  taskId?: string;
  taskPriority?: string;
  isConfirmed?: boolean;
};

export type PositionedEvent = {
  event: MergedEvent;
  column: number;
  totalColumns: number;
};

// Grid dimensions (from UI-SPEC)
export const SLOT_HEIGHT = 24; // px per 30-min slot
export const MINUTES_PER_SLOT = 30;
export const HOUR_HEIGHT = SLOT_HEIGHT * 2; // 48px per hour

// Calendar account colors (from MiniCalendar.tsx)
export const CALENDAR_COLORS = [
  "var(--chart-2)", // teal (Account 1)
  "var(--chart-4)", // amber (Account 2)
  "var(--chart-1)", // orange (Account 3)
  "var(--chart-5)", // gold (Account 4+)
];

// AI work block color
export const WORK_BLOCK_COLOR = "oklch(0.585 0.156 272)";

// Layout constants (from UI-SPEC Grid Dimensions)
export const EVENT_MIN_HEIGHT = 20; // px, even 15-min events remain clickable
export const TIME_GUTTER_WIDTH = 56; // px, fits "12:00 PM"
export const ALLDAY_BANNER_HEIGHT = 28; // px per row
export const HEADER_BAR_HEIGHT = 40; // px
export const NOW_LINE_CIRCLE_SIZE = 8; // px diameter
export const EVENT_BORDER_RADIUS = 6; // px
export const MAX_OVERLAP_COLUMNS = 4; // D-09: 5+ events show "+N more"
