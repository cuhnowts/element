import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/stores";
import type { TaskScaffold } from "@/types/ai";

const FIELD_LABELS: Record<keyof TaskScaffold, string> = {
  description: "DESCRIPTION",
  steps: "STEPS",
  priority: "PRIORITY",
  estimatedMinutes: "ESTIMATED DURATION",
  tags: "TAGS",
  relatedTasks: "RELATED TASKS",
};

function SuggestionFieldRow({
  field,
  value,
  onAccept,
  onDismiss,
}: {
  field: keyof TaskScaffold;
  value: unknown;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const renderValue = () => {
    if (field === "steps" && Array.isArray(value)) {
      return (
        <ol className="list-inside list-decimal space-y-0.5 text-sm">
          {(value as string[]).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      );
    }
    if (field === "tags" && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      );
    }
    if (field === "relatedTasks" && Array.isArray(value)) {
      return (
        <ul className="list-inside list-disc space-y-0.5 text-sm">
          {(value as string[]).map((task, i) => (
            <li key={i}>{task}</li>
          ))}
        </ul>
      );
    }
    if (field === "estimatedMinutes") {
      return <span className="text-sm">{String(value)} minutes</span>;
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  return (
    <div
      className="flex items-start gap-2 border-l-2 pl-2"
      style={{ borderColor: "oklch(0.6 0.118 184.714)" }}
    >
      <div className="flex-1">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {FIELD_LABELS[field]}
        </div>
        {renderValue()}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button variant="ghost" size="icon-xs" onClick={onAccept}>
          <Check className="size-3" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
          <X className="size-3" />
        </Button>
      </div>
    </div>
  );
}

export function AiSuggestionPanel() {
  const pendingSuggestions = useStore((s) => s.pendingSuggestions);
  const isGenerating = useStore((s) => s.isGenerating);
  const aiError = useStore((s) => s.aiError);
  const acceptSuggestionField = useStore((s) => s.acceptSuggestionField);
  const dismissSuggestionField = useStore((s) => s.dismissSuggestionField);
  const acceptAllSuggestions = useStore((s) => s.acceptAllSuggestions);
  const dismissAllSuggestions = useStore((s) => s.dismissAllSuggestions);
  const requestAiAssist = useStore((s) => s.requestAiAssist);
  const selectedTask = useStore((s) => s.selectedTask);

  // Error state
  if (aiError) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="mb-2 text-sm text-destructive">
          AI couldn't generate suggestions. Check your provider connection in
          Settings and try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (selectedTask) requestAiAssist(selectedTask.id);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Loading state
  if (isGenerating && !pendingSuggestions) {
    return (
      <div className="space-y-3 rounded-lg bg-card p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // No suggestions
  if (!pendingSuggestions) {
    return null;
  }

  const fields = (
    Object.keys(FIELD_LABELS) as (keyof TaskScaffold)[]
  ).filter((field) => pendingSuggestions[field] !== undefined);

  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg bg-card p-4 transition-all duration-200 ease-out">
      {fields.map((field) => (
        <SuggestionFieldRow
          key={field}
          field={field}
          value={pendingSuggestions[field]}
          onAccept={() => acceptSuggestionField(field)}
          onDismiss={() => dismissSuggestionField(field)}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={acceptAllSuggestions}>
          Accept All
        </Button>
        <Button variant="ghost" size="sm" onClick={dismissAllSuggestions}>
          Dismiss All
        </Button>
      </div>
    </div>
  );
}
