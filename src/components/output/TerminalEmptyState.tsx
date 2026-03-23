import { Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalEmptyStateProps {
  hasProject: boolean;
  onLinkDirectory?: () => void;
}

export function TerminalEmptyState({ hasProject, onLinkDirectory }: TerminalEmptyStateProps) {
  if (!hasProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <TerminalIcon className="size-8 text-muted-foreground" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            Select a project to use the terminal
          </p>
          <p className="text-sm text-muted-foreground">
            Choose a project from the sidebar to open a terminal in its directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <TerminalIcon className="size-8 text-muted-foreground" />
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">
          Link a directory to enable terminal
        </p>
        <p className="text-sm text-muted-foreground">
          This project doesn't have a linked directory. Link one to open a terminal here.
        </p>
      </div>
      {onLinkDirectory && (
        <Button onClick={onLinkDirectory}>Link Directory</Button>
      )}
    </div>
  );
}
