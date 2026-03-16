import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";

interface EmptyStateProps {
  variant: "no-projects" | "no-tasks" | "no-selection";
}

export function EmptyState({ variant }: EmptyStateProps) {
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);

  if (variant === "no-projects") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Welcome to Element
        </h1>
        <p className="text-muted-foreground text-center max-w-md">
          Projects organize your tasks and workflows. Create your first project
          to get started.
        </p>
        <Button onClick={() => openCreateProjectDialog()} className="mt-4">
          Create your first project
        </Button>
      </div>
    );
  }

  if (variant === "no-tasks") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <h2 className="text-[20px] font-semibold leading-[1.2]">
          No tasks yet
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Create a task to start tracking your work in this project.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Select a task to view details</p>
    </div>
  );
}
