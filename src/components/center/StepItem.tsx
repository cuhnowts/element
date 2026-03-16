import type { Step } from "@/types/execution";
import { StatusDot } from "@/components/shared/StatusDot";
import { AgentChip } from "@/components/shared/AgentChip";

const STEP_BORDER_STYLES: Record<string, string> = {
  pending: "border-muted-foreground",
  running: "border-primary animate-pulse",
  complete: "border-chart-2",
  failed: "border-destructive",
  skipped: "border-muted-foreground/50",
};

interface StepItemProps {
  step: Step;
  index: number;
  isLast: boolean;
}

export function StepItem({ step, index, isLast }: StepItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${STEP_BORDER_STYLES[step.status] ?? "border-muted-foreground"}`}
        >
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-border" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <StatusDot status={step.status} />
          <span className="font-semibold">{step.name}</span>
          {step.duration && (
            <span className="text-muted-foreground text-sm">({step.duration})</span>
          )}
        </div>
        {(step.agents?.length || step.skills?.length || step.tools?.length) ? (
          <div className="flex gap-1 mt-1">
            {step.agents?.map((a) => <AgentChip key={a} label={a} type="agent" />)}
            {step.skills?.map((s) => <AgentChip key={s} label={s} type="skill" />)}
            {step.tools?.map((t) => <AgentChip key={t} label={t} type="tool" />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
