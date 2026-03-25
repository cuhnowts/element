import { useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";

interface TerminalTabProps {
  cwd: string;
  isVisible: boolean;
  initialCommand?: { command: string; args: string[] } | null;
}

export function TerminalTab({ cwd, isVisible, initialCommand }: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { error } = useTerminal(containerRef, cwd, isVisible, initialCommand);

  return (
    <div className="h-full w-full flex flex-col">
      <div ref={containerRef} className="h-full w-full p-2" />
      {error && (
        <div className="text-sm text-destructive-foreground p-4">
          <p className="font-medium">Terminal failed to start -- check that your shell is configured correctly.</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
