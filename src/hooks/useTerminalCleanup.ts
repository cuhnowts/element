import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";

/**
 * App quit cleanup hook (D-13).
 * Intercepts the window close request to gracefully tear down all terminal sessions
 * before the app exits. Clearing the store triggers React component unmounts,
 * which run gracefulKillPty in their cleanup effects (TerminalSession.tsx).
 */
let cleanupDone = false;

export function useTerminalCleanup() {
  useEffect(() => {
    cleanupDone = false;
    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      // Second close attempt after cleanup — let it through
      if (cleanupDone) return;

      event.preventDefault();
      cleanupDone = true;

      try {
        const allSessions = useTerminalSessionStore.getState().getAllSessions();
        const projectIds = [...new Set(allSessions.map((s) => s.projectId))];
        for (const pid of projectIds) {
          useTerminalSessionStore.getState().removeAllForProject(pid);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch {
        // Cleanup errors should not prevent closing
      }

      // Re-trigger close — this time cleanupDone is true so it goes through
      await appWindow.close();
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
}
