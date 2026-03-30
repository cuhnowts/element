import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";

/**
 * App quit cleanup hook (D-13).
 * Intercepts the window close request to gracefully tear down all terminal sessions
 * before the app exits. Clearing the store triggers React component unmounts,
 * which run gracefulKillPty in their cleanup effects (TerminalSession.tsx).
 */
export function useTerminalCleanup() {
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      event.preventDefault();

      // Get all sessions across all projects
      const allSessions = useTerminalSessionStore.getState().getAllSessions();

      // PTY refs are held by React components, not the store.
      // The store's removeAllForProject will trigger component unmounts,
      // which run gracefulKillPty in their cleanup effects (TerminalSession.tsx).
      // We clear the store state here to trigger those unmounts.
      const projectIds = [...new Set(allSessions.map((s) => s.projectId))];
      for (const pid of projectIds) {
        useTerminalSessionStore.getState().removeAllForProject(pid);
      }

      // Brief delay to allow React cleanup effects to run
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Now close the window
      await appWindow.destroy();
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
}
