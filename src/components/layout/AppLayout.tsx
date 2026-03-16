import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Sidebar } from "./Sidebar";
import { CenterPanel } from "./CenterPanel";
import { OutputDrawer } from "./OutputDrawer";

export function AppLayout() {
  const { drawerOpen, drawerHeight, toggleDrawer, selectTask, setDrawerHeight } =
    useWorkspaceStore();

  useKeyboardShortcuts([
    { key: "b", meta: true, handler: toggleDrawer },
    { key: "Escape", handler: () => selectTask(null) },
  ]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-[280px] border-r border-border flex-shrink-0 overflow-hidden">
        <Sidebar />
      </aside>

      <ResizablePanelGroup
        direction="vertical"
        className="flex-1"
        onLayout={(sizes) => {
          if (sizes.length === 2 && sizes[1] !== undefined) {
            setDrawerHeight(sizes[1]);
          }
        }}
      >
        <ResizablePanel
          defaultSize={drawerOpen ? 100 - drawerHeight : 100}
          minSize={30}
        >
          <CenterPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={drawerOpen ? drawerHeight : 0}
          minSize={0}
          maxSize={60}
          collapsible
          collapsedSize={0}
        >
          <OutputDrawer />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
