import { AlertTriangle, FolderOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ShellStepConfig as ShellStepConfigType } from "@/lib/types";

interface ShellStepConfigProps {
  config: ShellStepConfigType;
  onChange: (config: ShellStepConfigType) => void;
}

export function ShellStepConfig({ config, onChange }: ShellStepConfigProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="size-4 text-chart-4" />
          </TooltipTrigger>
          <TooltipContent>Shell commands run with full system access</TooltipContent>
        </Tooltip>
        <span className="text-xs font-semibold tracking-wide">Shell Command</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide">Command</span>
        <Input
          className="font-mono"
          placeholder="echo 'hello world'"
          value={config.command}
          onChange={(e) => onChange({ ...config, command: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide">Working Directory</span>
        <div className="relative">
          <FolderOpen className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="/path/to/directory"
            value={config.workingDirectory ?? ""}
            onChange={(e) =>
              onChange({
                ...config,
                workingDirectory: e.target.value || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wide">Timeout</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            value={config.timeoutSeconds ?? 30}
            onChange={(e) =>
              onChange({
                ...config,
                timeoutSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
          />
          <span className="text-sm text-muted-foreground">seconds</span>
        </div>
      </div>
    </div>
  );
}
