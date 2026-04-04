import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { StateCreator } from "zustand";
import type { AppStore } from "./index";

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMinutes: number;
  providerId: string | null;
}

export interface DeadlineRisk {
  type: "overdue" | "atRisk" | "noEstimate";
  task: {
    id: string;
    title: string;
    projectId: string | null;
    projectName: string | null;
    dueDate: string;
    estimatedMinutes: number | null;
    isBacklog: boolean;
  };
  neededMinutes?: number;
  availableMinutes?: number;
  daysRemaining?: number;
}

export interface RiskAssessment {
  risks: DeadlineRisk[];
  summary: string;
  assessedAt: string;
}

export interface HeartbeatSlice {
  heartbeatEnabled: boolean;
  heartbeatInterval: number;
  heartbeatProviderId: string | null;
  heartbeatRunning: boolean;
  lastHeartbeatAt: string | null;
  latestAssessment: RiskAssessment | null;
  fetchHeartbeatConfig: () => Promise<void>;
  setHeartbeatEnabled: (enabled: boolean) => Promise<void>;
  setHeartbeatInterval: (minutes: number) => Promise<void>;
  setHeartbeatProviderId: (id: string | null) => Promise<void>;
  fetchHeartbeatStatus: () => Promise<void>;
  initHeartbeatListener: () => () => void;
}

export const createHeartbeatSlice: StateCreator<
  AppStore,
  [],
  [],
  HeartbeatSlice
> = (set, get) => ({
  heartbeatEnabled: false,
  heartbeatInterval: 30,
  heartbeatProviderId: null,
  heartbeatRunning: false,
  lastHeartbeatAt: null,
  latestAssessment: null,

  fetchHeartbeatConfig: async () => {
    try {
      const config = await invoke<HeartbeatConfig>("get_heartbeat_config");
      set({
        heartbeatEnabled: config.enabled,
        heartbeatInterval: config.intervalMinutes,
        heartbeatProviderId: config.providerId,
      });
    } catch {
      // Config not found is fine -- defaults remain
    }
  },

  setHeartbeatEnabled: async (enabled: boolean) => {
    set({ heartbeatEnabled: enabled });
    const state = get();
    try {
      await invoke("set_heartbeat_config", {
        config: {
          enabled,
          intervalMinutes: state.heartbeatInterval,
          providerId: state.heartbeatProviderId,
        },
      });
    } catch {
      // Revert on failure
      set({ heartbeatEnabled: !enabled });
    }
  },

  setHeartbeatInterval: async (minutes: number) => {
    const prev = get().heartbeatInterval;
    set({ heartbeatInterval: minutes });
    const state = get();
    try {
      await invoke("set_heartbeat_config", {
        config: {
          enabled: state.heartbeatEnabled,
          intervalMinutes: minutes,
          providerId: state.heartbeatProviderId,
        },
      });
    } catch {
      set({ heartbeatInterval: prev });
    }
  },

  setHeartbeatProviderId: async (id: string | null) => {
    const prev = get().heartbeatProviderId;
    set({ heartbeatProviderId: id });
    const state = get();
    try {
      await invoke("set_heartbeat_config", {
        config: {
          enabled: state.heartbeatEnabled,
          intervalMinutes: state.heartbeatInterval,
          providerId: id,
        },
      });
    } catch {
      set({ heartbeatProviderId: prev });
    }
  },

  fetchHeartbeatStatus: async () => {
    try {
      const status = await invoke<{
        running: boolean;
        latest_assessment: RiskAssessment | null;
      }>("get_heartbeat_status");
      set({
        heartbeatRunning: status.running,
        latestAssessment: status.latest_assessment,
      });
    } catch {
      // Status unavailable
    }
  },

  initHeartbeatListener: () => {
    let unlisten: (() => void) | null = null;

    listen<RiskAssessment>("heartbeat-risks-updated", (event) => {
      set({
        latestAssessment: event.payload,
        lastHeartbeatAt: new Date().toISOString(),
      });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  },
});
