import { useCallback } from "react";
import type { PositionedEvent } from "./calendarTypes";
import {
  CALENDAR_COLORS,
  WORK_BLOCK_COLOR,
  EVENT_MIN_HEIGHT,
  EVENT_BORDER_RADIUS,
} from "./calendarTypes";
import { timeToPixelOffset, eventHeight } from "./calendarLayout";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";

interface CalendarEventBlockProps {
  event: PositionedEvent;
  gridStartMinutes: number;
  accountColorIndex?: number;
  onClick?: () => void;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const minuteStr = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${hour12}${minuteStr}`;
}

function formatMinutesToTimeWithPeriod(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const period = h >= 12 ? "PM" : "AM";
  return `${formatMinutesToTime(minutes)} ${period}`;
}

export function CalendarEventBlock({
  event: positioned,
  gridStartMinutes,
  accountColorIndex,
  onClick,
}: CalendarEventBlockProps) {
  const { event, column, totalColumns } = positioned;
  const isMeeting = event.type === "meeting";
  const isWorkOrBuffer = event.type === "work" || event.type === "buffer";

  const top = timeToPixelOffset(event.startMinutes, gridStartMinutes);
  const height = Math.max(
    EVENT_MIN_HEIGHT,
    eventHeight(event.startMinutes, event.endMinutes),
  );
  const left = `${(column / totalColumns) * 100}%`;
  const width = `${(1 / totalColumns) * 100}%`;

  const accountColor = CALENDAR_COLORS[accountColorIndex ?? 0];

  const timeLabel = `${formatMinutesToTime(event.startMinutes)} - ${formatMinutesToTimeWithPeriod(event.endMinutes)}`;
  const ariaLabel = `${event.title}, ${formatMinutesToTimeWithPeriod(event.startMinutes)} to ${formatMinutesToTimeWithPeriod(event.endMinutes)}`;

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (isWorkOrBuffer && event.taskId) {
      useWorkspaceStore.getState().selectTask(event.taskId);
      useStore.getState().setActiveView("task");
    }
  }, [onClick, isWorkOrBuffer, event.taskId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className="absolute overflow-hidden transition-opacity duration-150"
      style={{
        top,
        height,
        left,
        width,
        borderRadius: EVENT_BORDER_RADIUS,
        cursor: isWorkOrBuffer ? "pointer" : "default",
        ...(isMeeting
          ? {
              borderLeft: `3px solid ${accountColor}`,
              backgroundColor: `color-mix(in oklch, ${accountColor} 40%, transparent)`,
            }
          : {
              border: `1px solid ${WORK_BLOCK_COLOR}`,
              backgroundColor: `color-mix(in oklch, ${WORK_BLOCK_COLOR} 15%, transparent)`,
            }),
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (isMeeting) {
          el.style.backgroundColor = `color-mix(in oklch, ${accountColor} 55%, transparent)`;
        } else {
          el.style.backgroundColor = `color-mix(in oklch, ${WORK_BLOCK_COLOR} 25%, transparent)`;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (isMeeting) {
          el.style.backgroundColor = `color-mix(in oklch, ${accountColor} 40%, transparent)`;
        } else {
          el.style.backgroundColor = `color-mix(in oklch, ${WORK_BLOCK_COLOR} 15%, transparent)`;
        }
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-start">
        <span className="text-sm truncate text-foreground leading-tight">
          {event.title}
        </span>
        {height > 30 && (
          <span className="text-xs text-muted-foreground truncate">
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
