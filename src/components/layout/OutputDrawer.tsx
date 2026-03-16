import { useTaskStore } from "@/stores/useTaskStore";
import { DrawerHeader } from "@/components/output/DrawerHeader";
import { LogViewer } from "@/components/output/LogViewer";

export function OutputDrawer() {
  const executionLogs = useTaskStore((s) => s.executionLogs);

  return (
    <div className="flex flex-col h-full bg-card border-t border-border">
      <DrawerHeader />
      <div className="flex-1 overflow-hidden">
        <LogViewer entries={executionLogs} />
      </div>
    </div>
  );
}
