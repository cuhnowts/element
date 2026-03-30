/**
 * Stub for useAgentLifecycle hook.
 * Plan 03 (wave 2) provides the real implementation.
 * This stub allows Plan 04 UI components to compile and type-check.
 */
import { useAgentStore } from "@/stores/useAgentStore";

export function useAgentLifecycle(): {
  startAgent: () => Promise<void>;
  restartAgent: () => Promise<void>;
  handleAgentExit: (exitCode: number) => void;
  agentCommand: string | null;
  agentArgs: string[];
} {
  return {
    startAgent: async () => {
      useAgentStore.getState().setStatus("running");
    },
    restartAgent: async () => {
      useAgentStore.getState().setStatus("starting");
      useAgentStore.getState().incrementRestart();
      setTimeout(() => {
        useAgentStore.getState().setStatus("running");
      }, 1000);
    },
    handleAgentExit: (_exitCode: number) => {
      useAgentStore.getState().setStatus("error");
    },
    agentCommand: null,
    agentArgs: [],
  };
}
