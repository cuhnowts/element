import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DueDateSuggestionProps {
  taskId: string;
  taskTitle: string;
  suggestedDate: string;
  onConfirm: (taskId: string, date: string) => void;
  onSkip: (taskId: string) => void;
}

function formatSuggestedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function DueDateSuggestion({
  taskId,
  taskTitle,
  suggestedDate,
  onConfirm,
  onSkip,
}: DueDateSuggestionProps) {
  const [state, setState] = useState<"active" | "confirmed" | "skipped">("active");

  if (state === "skipped") return null;

  if (state === "confirmed") {
    return (
      <div className="border rounded-md p-3 bg-card">
        <span className="text-xs text-muted-foreground">Set</span>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 bg-card flex items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="text-sm font-semibold truncate block">{taskTitle}</span>
        <span className="text-sm">{formatSuggestedDate(suggestedDate)}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="default"
          size="sm"
          className="text-xs font-semibold h-7"
          aria-label={`Confirm due date ${formatSuggestedDate(suggestedDate)} for ${taskTitle}`}
          onClick={() => {
            onConfirm(taskId, suggestedDate);
            setState("confirmed");
            setTimeout(() => setState("skipped"), 1500);
          }}
        >
          Confirm
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7"
          aria-label={`Skip due date suggestion for ${taskTitle}`}
          onClick={() => {
            onSkip(taskId);
            setState("skipped");
          }}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
