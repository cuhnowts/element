import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTauriEvents } from "@/hooks/useTauriEvents";
import { setProjectDirectory } from "@/lib/errorLogger";
import { useStore } from "@/stores";

function App() {
  useTauriEvents();
  useKeyboardShortcuts();

  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const projects = useStore((s) => s.projects);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDirectory(null);
      return;
    }
    const project = projects.find((p) => p.id === selectedProjectId);
    setProjectDirectory(project?.directoryPath ?? null);
  }, [selectedProjectId, projects]);

  return (
    <>
      <AppLayout />
      <Toaster />
    </>
  );
}
export default App;
