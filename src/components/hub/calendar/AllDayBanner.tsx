import type { MergedEvent } from "./calendarTypes";
import {
  ALLDAY_BANNER_HEIGHT,
  CALENDAR_COLORS,
  WORK_BLOCK_COLOR,
  EVENT_BORDER_RADIUS,
} from "./calendarTypes";

interface AllDayBannerProps {
  events: MergedEvent[];
}

export function AllDayBanner({ events }: AllDayBannerProps) {
  if (events.length === 0) return null;

  return (
    <div className="bg-card border-b px-2 py-1 flex flex-col gap-1">
      {events.map((event, idx) => {
        const isMeeting = event.type === "meeting";
        const color = isMeeting
          ? CALENDAR_COLORS[idx % CALENDAR_COLORS.length]
          : WORK_BLOCK_COLOR;

        return (
          <div
            key={event.id}
            className="flex items-center px-2 truncate text-xs text-foreground"
            style={{
              height: ALLDAY_BANNER_HEIGHT,
              borderRadius: EVENT_BORDER_RADIUS,
              backgroundColor: `color-mix(in oklch, ${color} ${isMeeting ? 40 : 15}%, transparent)`,
              borderLeft: isMeeting ? `3px solid ${color}` : undefined,
              border: !isMeeting ? `1px solid ${color}` : undefined,
            }}
          >
            <span className="truncate">{event.title}</span>
          </div>
        );
      })}
    </div>
  );
}
