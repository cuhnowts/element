import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";

interface SessionIndicatorProps {
  projectId: string;
}

export function SessionIndicator({ projectId }: SessionIndicatorProps) {
  const runningCount = useTerminalSessionStore(
    (s) => (s.sessions[projectId] ?? []).filter((sess) => sess.status === "running").length,
  );

  if (runningCount === 0) return null;

  return (
    <span
      className="size-1.5 rounded-full bg-green-500/50 ml-1 flex-shrink-0"
      aria-label={`${runningCount} running terminal session${runningCount !== 1 ? "s" : ""}`}
    />
  );
}
