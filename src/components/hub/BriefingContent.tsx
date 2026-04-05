import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore } from "@/stores";
import { useBriefingStore } from "@/stores/useBriefingStore";
import { DailyPlanSection, type ScheduleBlock } from "./DailyPlanSection";
import { DueDateSuggestion } from "./DueDateSuggestion";

const DISMISSED_KEY = "element-dismissed-due-date-suggestions";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

interface BriefingContentProps {
  scheduleBlocks: ScheduleBlock[];
  scheduleLoading: boolean;
}

export function BriefingContent({ scheduleBlocks, scheduleLoading }: BriefingContentProps) {
  const content = useBriefingStore((s) => s.briefingContent);
  const status = useBriefingStore((s) => s.briefingStatus);
  const updateTask = useStore((s) => s.updateTask);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(loadDismissed);

  // Persist dismissed set whenever it changes
  useEffect(() => {
    saveDismissed(dismissedSuggestions);
  }, [dismissedSuggestions]);

  const cleanContent = useMemo(() => {
    return content.replace(/SUGGEST_DUE_DATE:\s*\{[^}]+\}/g, "").trim();
  }, [content]);

  // Parse and validate suggestions — verify task IDs exist
  const [suggestions, setSuggestions] = useState<
    Array<{ taskId: string; date: string; taskTitle: string }>
  >([]);
  useEffect(() => {
    const regex = /SUGGEST_DUE_DATE:\s*(\{[^}]+\})/g;
    const found: Array<{ taskId: string; date: string; taskTitle: string }> = [];
    let match: RegExpExecArray | null = null;
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex iteration
    while ((match = regex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.taskId && parsed.date && parsed.taskTitle) {
          found.push(parsed);
        }
      } catch {
        /* skip */
      }
    }
    // Validate each task ID exists
    Promise.all(
      found.map(async (s) => {
        try {
          await invoke("get_task", { id: s.taskId });
          return s;
        } catch {
          return null; // hallucinated ID
        }
      }),
    ).then((results) => {
      setSuggestions(results.filter((r): r is NonNullable<typeof r> => r !== null));
    });
  }, [content]);

  const overflowIndex = useMemo(() => {
    const workBlocks = scheduleBlocks.filter((b) => b.blockType === "work" && b.taskTitle);
    const idx = workBlocks.findIndex((b) => b.isContinuation === true);
    return idx >= 0 ? idx : null;
  }, [scheduleBlocks]);

  return (
    <div>
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
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
                  setDismissedSuggestions((prev) => new Set(prev).add(taskId));
                }}
                onSkip={(taskId) => {
                  setDismissedSuggestions((prev) => new Set(prev).add(taskId));
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
