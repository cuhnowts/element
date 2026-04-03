import { useEffect } from "react";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";

/**
 * App quit cleanup hook (D-13).
 * Cleans up terminal sessions on window beforeunload.
 * Uses the browser beforeunload event which fires synchronously
 * before the window closes — no need to intercept Tauri close.
 */
export function useTerminalCleanup() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const allSessions = useTerminalSessionStore.getState().getAllSessions();
        const projectIds = [...new Set(allSessions.map((s) => s.projectId))];
        for (const pid of projectIds) {
          useTerminalSessionStore.getState().removeAllForProject(pid);
        }
      } catch {
        // Best-effort cleanup
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
