import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { invoke } from "@tauri-apps/api/core";
import { useBriefingStore } from "@/stores/useBriefingStore";
import { useStore } from "@/stores";
import { DailyPlanSection, type ScheduleBlock } from "./DailyPlanSection";
import { DueDateSuggestion } from "./DueDateSuggestion";

interface BriefingContentProps {
  scheduleBlocks: ScheduleBlock[];
  scheduleLoading: boolean;
}

export function BriefingContent({
  scheduleBlocks,
  scheduleLoading,
}: BriefingContentProps) {
  const content = useBriefingStore((s) => s.briefingContent);
  const status = useBriefingStore((s) => s.briefingStatus);
  const updateTask = useStore((s) => s.updateTask);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  const { cleanContent, suggestions } = useMemo(() => {
    const regex = /SUGGEST_DUE_DATE:\s*(\{[^}]+\})/g;
    const found: Array<{ taskId: string; date: string; taskTitle: string }> =
      [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.taskId && parsed.date && parsed.taskTitle) {
          found.push(parsed);
        }
      } catch {
        /* skip malformed */
      }
    }
    const clean = content
      .replace(/SUGGEST_DUE_DATE:\s*\{[^}]+\}/g, "")
      .trim();
    return { cleanContent: clean, suggestions: found };
  }, [content]);

  const overflowIndex = useMemo(() => {
    const workBlocks = scheduleBlocks.filter(
      (b) => b.blockType === "work" && b.taskTitle,
    );
    const idx = workBlocks.findIndex((b) => b.isContinuation === true);
    return idx >= 0 ? idx : null;
  }, [scheduleBlocks]);

  return (
    <div>
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cleanContent}
        </ReactMarkdown>
        {status === "streaming" && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1"
            aria-hidden="true"
          />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions
            .filter((s) => !dismissedSuggestions.has(s.taskId))
            .map((s) => (
              <DueDateSuggestion
                key={s.taskId}
                taskId={s.taskId}
                taskTitle={s.taskTitle}
                suggestedDate={s.date}
                onConfirm={async (taskId, date) => {
                  try {
                    // Validate task exists before updating
                    await invoke("get_task", { id: taskId });
                    updateTask(taskId, { dueDate: date });
                  } catch {
                    // Task ID doesn't exist — hallucinated by LLM, skip silently
                  }
                  setDismissedSuggestions(
                    (prev) => new Set(prev).add(taskId),
                  );
                }}
                onSkip={(taskId) => {
                  setDismissedSuggestions(
                    (prev) => new Set(prev).add(taskId),
                  );
                }}
              />
            ))}
        </div>
      )}

      <div className="mt-6">
        <DailyPlanSection
          blocks={scheduleBlocks}
          isLoading={scheduleLoading}
          overflowIndex={overflowIndex}
        />
      </div>
    </div>
  );
}
