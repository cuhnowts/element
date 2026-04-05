import { CalendarClock } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ScheduleChangeCardProps {
  taskTitle: string;
  beforeDay: string;
  beforeTime: string;
  afterDay: string;
  afterTime: string;
  sideEffect?: string;
  onConfirm: () => void;
  onDismiss: () => void;
  resolved?: "confirmed" | "dismissed" | null;
}

export function ScheduleChangeCard({
  taskTitle,
  beforeDay,
  beforeTime,
  afterDay,
  afterTime,
  sideEffect,
  onConfirm,
  onDismiss,
  resolved = null,
}: ScheduleChangeCardProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const reactId = useId();
  const titleId = `schedule-change-title-${reactId}`;
  const bodyId = `schedule-change-body-${reactId}`;
  const isResolved = resolved != null;

  useEffect(() => {
    if (!isResolved && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isResolved]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isResolved) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onDismiss();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={handleKeyDown}
      className="animate-in slide-in-from-bottom-2 fade-in duration-200 ease-out"
    >
      <Card className={`w-full transition-opacity ${isResolved ? "opacity-50" : ""}`}>
        <div className="p-4 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span id={titleId} className="text-sm font-semibold">
              Move Task
            </span>
          </div>

          {/* Task title */}
          <p className="text-sm font-medium">{taskTitle}</p>

          {/* Before / After diff */}
          <div id={bodyId} className="space-y-1">
            <p className="text-sm text-muted-foreground">
              <del>
                {beforeDay} {beforeTime}
              </del>
            </p>
            <p className="text-sm text-foreground">
              <ins className="no-underline">
                {afterDay} {afterTime}
              </ins>
            </p>
          </div>

          {/* Side effects */}
          {sideEffect && <p className="text-xs text-muted-foreground">{sideEffect}</p>}

          <Separator />

          {/* Actions */}
          {isResolved ? (
            <p className="text-xs text-muted-foreground">
              {resolved === "confirmed" ? "Confirmed" : "Dismissed"}
            </p>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onDismiss}>
                Dismiss Change
              </Button>
              <Button ref={confirmRef} variant="default" size="sm" onClick={onConfirm}>
                Confirm Move
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
