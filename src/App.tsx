import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTauriEvents } from "@/hooks/useTauriEvents";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

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
