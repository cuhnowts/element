import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import type { Schedule } from "@/types/workflow";
import { CronPreview } from "./CronPreview";

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every Monday at 9am", value: "0 9 * * 1" },
  { label: "First of every month", value: "0 0 1 * *" },
];

interface CronSchedulerProps {
  workflowId: string;
  schedule: Schedule | null;
}

export function CronScheduler({ workflowId, schedule }: CronSchedulerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedValue, setAdvancedValue] = useState(schedule?.cronExpression ?? "");

  const createSchedule = useWorkflowStore((s) => s.createSchedule);
  const updateSchedule = useWorkflowStore((s) => s.updateSchedule);
  const toggleSchedule = useWorkflowStore((s) => s.toggleSchedule);

  const isActive = schedule?.isActive ?? false;
  const hasSchedule = schedule !== null;

  const handleToggleRecurring = useCallback(
    async (checked: boolean) => {
      if (checked) {
        if (!hasSchedule) {
          await createSchedule(workflowId, "0 0 * * *");
        } else {
          await toggleSchedule(schedule?.id, true);
        }
      } else if (hasSchedule) {
        await toggleSchedule(schedule?.id, false);
      }
    },
    [hasSchedule, schedule, workflowId, createSchedule, toggleSchedule],
  );

  const handlePresetChange = useCallback(
    async (value: string | null) => {
      if (!schedule || !value) return;
      setAdvancedValue(value);
      await updateSchedule(schedule.id, value);
    },
    [schedule, updateSchedule],
  );

  const handleAdvancedBlur = useCallback(async () => {
    if (!schedule || !advancedValue.trim()) return;
    if (advancedValue !== schedule.cronExpression) {
      await updateSchedule(schedule.id, advancedValue);
    }
  }, [schedule, advancedValue, updateSchedule]);

  const handleAdvancedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleAdvancedBlur();
      }
    },
    [handleAdvancedBlur],
  );

  // Determine which preset matches the current cron expression
  const currentPreset = CRON_PRESETS.find((p) => p.value === schedule?.cronExpression);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={handleToggleRecurring} />
        <span className="text-sm font-medium">Recurring</span>
        {hasSchedule && !isActive && (
          <Badge variant="outline" className="text-xs">
            Paused
          </Badge>
        )}
      </div>

      {hasSchedule && (
        <div className={isActive ? "" : "opacity-50 pointer-events-none"}>
          <div className="space-y-2">
            <Select value={currentPreset?.value ?? ""} onValueChange={handlePresetChange}>
              <SelectTrigger size="sm">
                <SelectValue placeholder="Choose a schedule..." />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide advanced" : "Advanced"}
            </button>

            {showAdvanced && (
              <Input
                value={advancedValue}
                onChange={(e) => setAdvancedValue(e.target.value)}
                onBlur={handleAdvancedBlur}
                onKeyDown={handleAdvancedKeyDown}
                placeholder="* * * * *"
                className="font-mono text-sm"
              />
            )}

            <CronPreview cronExpression={schedule?.cronExpression} />
          </div>
        </div>
      )}
    </div>
  );
}
