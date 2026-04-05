import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ShellOutputBlockProps {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  running?: boolean;
}

const MAX_VISIBLE_LINES = 200;
const AUTO_EXPAND_THRESHOLD = 20;

export function ShellOutputBlock({
  command,
  stdout,
  stderr,
  exitCode,
  timedOut,
  running = false,
}: ShellOutputBlockProps) {
  const outputLines = stdout.split("\n");
  const lineCount = outputLines.length;
  const [open, setOpen] = useState(lineCount < AUTO_EXPAND_THRESHOLD);

  const isError = exitCode !== 0 || timedOut;

  // Truncate long output
  const truncated = lineCount > MAX_VISIBLE_LINES;
  const visibleOutput = truncated ? outputLines.slice(0, MAX_VISIBLE_LINES).join("\n") : stdout;

  // Build combined output text
  let displayText = visibleOutput;
  if (truncated) {
    displayText += `\n... ${lineCount - MAX_VISIBLE_LINES} more lines`;
  }
  if (timedOut) {
    const timeoutMsg = "Command timed out after 30s. Output so far is shown below.";
    displayText = stderr
      ? `${timeoutMsg}\n\n${stderr}\n\n${displayText}`
      : `${timeoutMsg}\n\n${displayText}`;
  } else if (stderr) {
    displayText = `${stderr}\n\n${displayText}`;
  }

  return (
    <div
      className={cn(
        "rounded-[--radius] border bg-secondary",
        isError ? "border-destructive" : "border-border",
      )}
      aria-label={`Shell output for ${command}`}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between bg-card px-4 py-2 rounded-t-[--radius]">
          <span className="font-mono text-sm text-primary">$ {command}</span>
          {running ? (
            <RunningIndicator />
          ) : (
            <span className="text-muted-foreground">
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ScrollArea className="max-h-[400px]">
            <pre
              className="whitespace-pre-wrap break-words px-4 py-2 font-mono text-sm text-foreground"
              role={running ? "log" : undefined}
              aria-live={running ? "polite" : undefined}
            >
              {displayText}
            </pre>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function RunningIndicator() {
  return <span className="text-sm text-muted-foreground animate-pulse">Running...</span>;
}
