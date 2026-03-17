import { FolderOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FsStepConfig as FsStepConfigType } from "@/lib/types";

interface FileStepConfigProps {
  config: FsStepConfigType;
  onChange: (config: FsStepConfigType) => void;
}

export function FileStepConfig({ config, onChange }: FileStepConfigProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">
          Operation
        </label>
        <Select
          value={config.operation}
          onValueChange={(val: string | null) => {
            if (val) {
              onChange({
                ...config,
                operation: val as FsStepConfigType["operation"],
                content:
                  val === "write" ? config.content ?? "" : undefined,
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="write">Write</SelectItem>
            <SelectItem value="list">List</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">Path</label>
        <div className="relative">
          <FolderOpen className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="/path/to/file"
            value={config.path}
            onChange={(e) => onChange({ ...config, path: e.target.value })}
          />
        </div>
      </div>

      {config.operation === "write" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide">
            Content
          </label>
          <Textarea
            className="font-mono"
            placeholder="File contents..."
            value={config.content ?? ""}
            onChange={(e) =>
              onChange({ ...config, content: e.target.value || undefined })
            }
          />
        </div>
      )}
    </div>
  );
}
