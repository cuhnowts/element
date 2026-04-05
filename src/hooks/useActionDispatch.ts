import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { getAction, isDestructive } from "@/lib/actionRegistry";
import { useStore } from "@/stores";

export interface DispatchResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface PendingAction {
  toolUseId: string;
  actionName: string;
  input: Record<string, unknown>;
  destructive: boolean;
}

export function useActionDispatch() {
  const dispatch = useCallback(
    async (actionName: string, input: Record<string, unknown>): Promise<DispatchResult> => {
      const action = getAction(actionName);
      if (!action) {
        return { success: false, error: `Unknown action: ${actionName}` };
      }
      try {
        // Transform input for actions that need parameter mapping
        let invokeInput = input;
        if (actionName === "reschedule_day") {
          invokeInput = { date: new Date().toISOString().split("T")[0] };
        }
        const result = await invoke(action.tauriCommand, invokeInput);
        // Refresh stores so UI reflects the change immediately
        const store = useStore.getState();
        store.loadStandaloneTasks();
        store.loadProjects();
        store.loadThemes();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
    [],
  );

  const checkDestructive = useCallback((actionName: string): boolean => {
    return isDestructive(actionName);
  }, []);

  const createPendingAction = useCallback(
    (toolUseId: string, actionName: string, input: Record<string, unknown>): PendingAction => ({
      toolUseId,
      actionName,
      input,
      destructive: isDestructive(actionName),
    }),
    [],
  );

  return { dispatch, checkDestructive, createPendingAction };
}
