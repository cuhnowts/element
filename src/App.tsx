import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTauriEvents } from "@/hooks/useTauriEvents";

function App() {
  useTauriEvents();
  useKeyboardShortcuts();
  return (
    <>
      <AppLayout />
      <Toaster />
    </>
  );
}
export default App;
