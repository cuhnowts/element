import { listen } from "@tauri-apps/api/event";
import { Loader2, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/tauri";
import { useStore } from "@/stores";
import type { CliComplete, CliOutput } from "@/types/cli";

interface CliInvokePanelProps {
  taskId: string;
}

interface OutputLine {
  stream: "stdout" | "stderr";
  line: string;
}

export function CliInvokePanel({ taskId: _taskId }: CliInvokePanelProps) {
  const hasDefaultProvider = useStore((s) => s.hasDefaultProvider);
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [argsInput, setArgsInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  // Listen for CLI events
  useEffect(() => {
    const unlistenOutput = listen<CliOutput>("cli-output", (event) => {
      setOutput((prev) => [...prev, { stream: event.payload.stream, line: event.payload.line }]);
    });

    const unlistenComplete = listen<CliComplete>("cli-complete", (event) => {
      setExitCode(event.payload.exitCode);
      setIsRunning(false);
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (!command.trim() || isRunning) return;

    setIsRunning(true);
    setOutput([]);
    setExitCode(null);

    const args = argsInput
      .trim()
      .split(/\s+/)
      .filter((a) => a.length > 0);

    try {
      await api.runCliTool(command.trim(), args);
    } catch (err) {
      setOutput((prev) => [...prev, { stream: "stderr", line: `Error: ${err}` }]);
      setIsRunning(false);
    }
  }, [command, argsInput, isRunning]);

  const handleClear = useCallback(() => {
    setOutput([]);
    setExitCode(null);
  }, []);

  if (!hasDefaultProvider()) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Terminal className="size-3.5" />
        <span>CLI Tool</span>
        <span className="text-[10px]">{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      {isOpen && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., claude, code-puppy, npx"
              className="flex-1 h-8 text-sm"
              disabled={isRunning}
            />
            <Input
              value={argsInput}
              onChange={(e) => setArgsInput(e.target.value)}
              placeholder="arguments (space-separated)"
              className="flex-1 h-8 text-sm"
              disabled={isRunning}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRun();
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleRun}
              disabled={isRunning || !command.trim()}
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-3 mr-1 animate-spin" />
                  Running
                </>
              ) : (
                "Run"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={output.length === 0}>
              Clear
            </Button>
          </div>

          {(output.length > 0 || exitCode !== null) && (
            <div className="space-y-1">
              <pre
                ref={outputRef}
                className="font-mono text-xs bg-muted p-3 rounded-md max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all"
              >
                {output.map((line, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
                  <div key={i} className={line.stream === "stderr" ? "text-destructive" : ""}>
                    {line.line}
                  </div>
                ))}
                {exitCode !== null && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <Badge variant={exitCode === 0 ? "secondary" : "destructive"}>
                      Exit code: {exitCode}
                    </Badge>
                  </div>
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
