import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { HttpStepForm } from "@/components/center/HttpStepForm";
import { ShellEditor } from "@/components/center/ShellEditor";
import { WorkflowExecutorPicker } from "@/components/center/WorkflowExecutorPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  HttpStepConfig,
  ManualStepConfig,
  ShellStepConfig,
  StepDefinition,
  StepType,
} from "@/types/workflow";

interface StepEditorProps {
  step: StepDefinition;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updatedStep: StepDefinition) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const STEP_TYPE_LABELS: Record<StepType, string> = {
  shell: "Shell Command",
  http: "HTTP Request",
  manual: "Manual Step",
};

function makeDefaultStep(type: StepType, name: string): StepDefinition {
  switch (type) {
    case "shell":
      return { type: "shell", name, command: "", workingDir: undefined, timeoutMs: undefined };
    case "http":
      return {
        type: "http",
        name,
        method: "GET",
        url: "",
        headers: undefined,
        body: undefined,
        timeoutMs: undefined,
      };
    case "manual":
      return { type: "manual", name, description: "" };
  }
}

export function StepEditor({
  step,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: StepEditorProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleTypeChange = (newType: StepType) => {
    if (newType === step.type) return;
    onChange(makeDefaultStep(newType, step.name));
  };

  const handleNameChange = (name: string) => {
    onChange({ ...step, name });
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Collapsed header row */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: interactive element with click handler */}
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: custom interactive element needs focus
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
          {index + 1}
        </div>
        <span className="font-medium flex-1 truncate">{step.name}</span>
        <Badge variant="secondary" className="text-xs">
          {STEP_TYPE_LABELS[step.type]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-xs" aria-label="Step options" />}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!canMoveUp} onClick={onMoveUp}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveDown} onClick={onMoveDown}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Step
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Step name */}
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step Name
            </span>
            <Input
              value={step.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Step name"
            />
          </div>

          {/* Type picker */}
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step Type
            </span>
            <WorkflowExecutorPicker value={step.type} onChange={handleTypeChange} />
          </div>

          {/* Type-specific editor */}
          {step.type === "shell" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Command
                </span>
                <ShellEditor
                  value={(step as ShellStepConfig).command}
                  onChange={(val) => onChange({ ...step, command: val } as ShellStepConfig)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Working Directory
                </span>
                <Input
                  value={(step as ShellStepConfig).workingDir ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...step,
                      workingDir: e.target.value || undefined,
                    } as ShellStepConfig)
                  }
                  placeholder="/path/to/directory (optional)"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Timeout (ms)
                </span>
                <Input
                  type="number"
                  value={(step as ShellStepConfig).timeoutMs ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...step,
                      timeoutMs: e.target.value ? Number(e.target.value) : undefined,
                    } as ShellStepConfig)
                  }
                  placeholder="30000 (optional)"
                />
              </div>
            </div>
          )}

          {step.type === "http" && (
            <HttpStepForm
              method={(step as HttpStepConfig).method}
              url={(step as HttpStepConfig).url}
              headers={(step as HttpStepConfig).headers ?? []}
              body={(step as HttpStepConfig).body}
              onChange={(field, value) => onChange({ ...step, [field]: value } as HttpStepConfig)}
            />
          )}

          {step.type === "manual" && (
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </span>
              <Textarea
                value={(step as ManualStepConfig).description}
                onChange={(e) =>
                  onChange({ ...step, description: e.target.value } as ManualStepConfig)
                }
                placeholder="Describe what needs to be done manually..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete step</DialogTitle>
            <DialogDescription>
              Remove this step from the workflow? Step configuration will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteDialog(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
