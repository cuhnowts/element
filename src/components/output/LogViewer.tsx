import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import type { LogEntry as LogEntryType } from "@/types/execution";
import { LogEntry } from "./LogEntry";

interface LogViewerProps {
  entries: LogEntryType[];
}

export function LogViewer({ entries }: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isAtBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        heading="No execution history"
        body="Run a task or workflow to see output here."
      />
    );
  }

  return (
    <div className="relative h-full">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-auto">
        {entries.map((entry, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
          <LogEntry key={i} entry={entry} />
        ))}
      </div>
      {!isAtBottom && entries.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              setIsAtBottom(true);
            }
          }}
          className="absolute bottom-2 right-4 text-xs bg-muted px-2 py-1 rounded hover:bg-muted-foreground/20 transition-colors"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
