import {
  CircleCheck,
  FilePlus,
  FolderPlus,
  type LucideIcon,
  Palette,
  Pencil,
  Plus,
  Terminal,
  Trash2,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ACTION_ICON_MAP: Record<string, LucideIcon> = {
  create_task: Plus,
  update_task: Pencil,
  update_task_status: CircleCheck,
  delete_task: Trash2,
  update_phase_status: CircleCheck,
  create_project: FolderPlus,
  create_theme: Palette,
  create_file: FilePlus,
  execute_shell: Terminal,
};

const ACTION_TITLE_MAP: Record<string, string> = {
  create_task: "Create Task",
  update_task: "Update Task",
  update_task_status: "Update Status",
  delete_task: "Delete Task",
  update_phase_status: "Update Phase Status",
  create_project: "Create Project",
  create_theme: "Create Theme",
  create_file: "Create File",
  execute_shell: "Run Command",
};

const REJECT_LABEL_MAP: Record<string, string> = {
  create_task: "Don't Create",
  update_task: "Don't Update",
  update_task_status: "Don't Update",
  delete_task: "Don't Delete",
  update_phase_status: "Don't Update",
  create_project: "Don't Create",
  create_theme: "Don't Create",
  create_file: "Don't Create",
  execute_shell: "Don't Run",
};

function getBodyText(actionName: string, input: Record<string, unknown>): string {
  switch (actionName) {
    case "create_task":
      return `Create task "${input.title ?? ""}" in project?`;
    case "delete_task":
      return `Permanently delete task "${input.taskId ?? ""}"? This cannot be undone.`;
    case "update_task_status":
      return `Mark task as ${input.status ?? ""}?`;
    case "execute_shell":
      return `Run \`${input.command ?? ""}\` in project directory?`;
    case "create_file":
      return `Create file \`${input.path ?? ""}\`?`;
    default:
      return `Execute ${actionName}?`;
  }
}

interface ActionConfirmCardProps {
  actionName: string;
  input: Record<string, unknown>;
  destructive: boolean;
  onApprove: () => void;
  onReject: () => void;
  resolved?: "approved" | "rejected" | null;
}

export function ActionConfirmCard({
  actionName,
  input,
  destructive,
  onApprove,
  onReject,
  resolved = null,
}: ActionConfirmCardProps) {
  const approveRef = useRef<HTMLButtonElement>(null);
  const titleId = `confirm-title-${actionName}`;
  const bodyId = `confirm-body-${actionName}`;

  const Icon = ACTION_ICON_MAP[actionName] ?? Plus;
  const title = ACTION_TITLE_MAP[actionName] ?? actionName;
  const bodyText = getBodyText(actionName, input);
  const rejectLabel = REJECT_LABEL_MAP[actionName] ?? "Cancel";
  const approveLabel = destructive ? "Yes, proceed" : "Approve";
  const isResolved = resolved != null;

  useEffect(() => {
    if (!isResolved && approveRef.current) {
      approveRef.current.focus();
    }
  }, [isResolved]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isResolved) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onApprove();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onReject();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={handleKeyDown}
      className="animate-in slide-in-from-bottom-2 fade-in duration-200 ease-out"
    >
      <Card
        className={`w-full transition-opacity ${isResolved ? "opacity-50" : ""} ${
          !isResolved
            ? destructive
              ? "border-destructive animate-pulse-border-destructive"
              : "border-primary animate-pulse-border-primary"
            : ""
        }`}
        style={{
          borderLeftWidth: !isResolved ? "2px" : undefined,
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span id={titleId} className="text-sm font-medium">
              {title}
            </span>
            {destructive && (
              <Badge variant="destructive" aria-label="This action is destructive">
                destructive
              </Badge>
            )}
          </div>

          <p id={bodyId} className="mt-2 text-sm text-muted-foreground">
            {bodyText}
          </p>

          <Separator className="my-3" />

          {isResolved ? (
            <p className="text-xs text-muted-foreground">
              {resolved === "approved" ? "Approved" : "Dismissed"}
            </p>
          ) : (
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onReject} disabled={isResolved}>
                {rejectLabel}
              </Button>
              <Button
                ref={approveRef}
                variant={destructive ? "destructive" : "default"}
                size="sm"
                onClick={onApprove}
                disabled={isResolved}
              >
                {approveLabel}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
