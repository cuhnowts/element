import { Skeleton } from "@/components/ui/skeleton";
import { DailyPlanTaskRow } from "./DailyPlanTaskRow";
import { OutOfTimeDivider } from "./OutOfTimeDivider";

export interface ScheduleBlock {
  id: string;
  scheduleDate: string;
  blockType: "work" | "meeting" | "buffer";
  startTime: string;
  endTime: string;
  taskId: string | null;
  taskTitle: string | null;
  taskPriority: string | null;
  eventTitle: string | null;
  isConfirmed: boolean;
  isContinuation: boolean;
}

interface DailyPlanSectionProps {
  blocks: ScheduleBlock[];
  isLoading: boolean;
  overflowIndex: number | null;
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function DailyPlanSection({
  blocks,
  isLoading,
  overflowIndex,
}: DailyPlanSectionProps) {
  const workBlocks = blocks.filter(
    (b) => b.blockType === "work" && b.taskTitle,
  );

  return (
    <div>
      <h3 className="text-base font-semibold">Today's Plan</h3>

      {isLoading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {!isLoading && workBlocks.length === 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">No tasks scheduled</p>
          <p className="text-xs text-muted-foreground">
            Your day is open. Add due dates to tasks or ask the bot to plan your
            day.
          </p>
        </div>
      )}

      {!isLoading && workBlocks.length > 0 && (
        <div role="list" className="mt-4 space-y-4">
          {workBlocks.map((block, idx) => {
            const duration =
              parseMinutes(block.endTime) - parseMinutes(block.startTime);
            const isFaded = overflowIndex !== null && idx >= overflowIndex;

            return (
              <div key={block.id}>
                {overflowIndex !== null && idx === overflowIndex && (
                  <OutOfTimeDivider />
                )}
                <div role="listitem">
                  <DailyPlanTaskRow
                    taskTitle={block.taskTitle!}
                    startTime={block.startTime}
                    endTime={block.endTime}
                    durationMinutes={duration}
                    priority={block.taskPriority ?? "medium"}
                    faded={isFaded}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
