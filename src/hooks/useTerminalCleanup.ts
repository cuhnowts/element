import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
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

      try {
        await appWindow.destroy();
      } catch {
        // If destroy fails, force quit via Tauri
        try { await invoke("plugin:process|exit", { exitCode: 0 }); } catch { /* last resort */ }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
}
