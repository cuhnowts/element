import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/stores";
import { ScheduleBlockOverlay } from "./ScheduleBlockOverlay";

export function CalendarScheduleOverlay() {
  const todaySchedule = useStore((s) => s.todaySchedule);
  const isScheduleLoading = useStore((s) => s.isScheduleLoading);
  const generateSchedule = useStore((s) => s.generateSchedule);
  const applySchedule = useStore((s) => s.applySchedule);

  useEffect(() => {
    generateSchedule();
  }, [generateSchedule]);

  const hasUnconfirmed = todaySchedule.some((b) => !b.isConfirmed);

  const handleRegenerate = () => {
    generateSchedule();
  };

  const handleApply = async () => {
    await applySchedule();
    toast("Schedule applied");
  };

  // Loading state
  if (isScheduleLoading) {
    return (
      <div className="space-y-2 px-2 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            TODAY'S SCHEDULE
          </span>
        </div>
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[40px] w-full" />
      </div>
    );
  }

  // Empty state
  if (todaySchedule.length === 0) {
    return (
      <div className="space-y-2 px-2 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            TODAY'S SCHEDULE
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Regenerate schedule"
            onClick={handleRegenerate}
            className="size-7"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm font-medium text-foreground">No schedule for today</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect a calendar and add some tasks to generate a smart schedule for your day.
          </p>
        </div>
      </div>
    );
  }

  // Schedule blocks
  return (
    <div className="space-y-1 px-2 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          TODAY'S SCHEDULE
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Regenerate schedule"
          onClick={handleRegenerate}
          className="size-7"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-col gap-0.5">
        {todaySchedule.map((block) => (
          <ScheduleBlockOverlay key={block.id} block={block} />
        ))}
      </div>
      {hasUnconfirmed && (
        <Button variant="default" className="mt-2 w-full" onClick={handleApply}>
          Apply Schedule
        </Button>
      )}
    </div>
  );
}
