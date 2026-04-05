import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { PluginInfo } from "../lib/types";
import type { AppStore } from "./index";

export interface PluginSlice {
  plugins: PluginInfo[];
  pluginsLoading: boolean;
  pluginsError: string | null;
  fetchPlugins: () => Promise<void>;
  enablePlugin: (name: string) => Promise<void>;
  disablePlugin: (name: string) => Promise<void>;
  reloadPlugin: (name: string) => Promise<void>;
  scanPlugins: () => Promise<void>;
}

export const createPluginSlice: StateCreator<AppStore, [], [], PluginSlice> = (set, get) => ({
  plugins: [],
  pluginsLoading: false,
  pluginsError: null,
  fetchPlugins: async () => {
    set({ pluginsLoading: true, pluginsError: null });
    try {
      const plugins = await api.listPlugins();
      set({ plugins, pluginsLoading: false });
    } catch (e) {
      set({
        pluginsError: e instanceof Error ? e.message : String(e),
        pluginsLoading: false,
      });
    }
  },
  enablePlugin: async (name) => {
    try {
      await api.enablePlugin(name);
      await get().fetchPlugins();
    } catch (e) {
      set({ pluginsError: e instanceof Error ? e.message : String(e) });
    }
  },
  disablePlugin: async (name) => {
    try {
      await api.disablePlugin(name);
      await get().fetchPlugins();
    } catch (e) {
      set({ pluginsError: e instanceof Error ? e.message : String(e) });
    }
  },
  reloadPlugin: async (name) => {
    try {
      await api.reloadPlugin(name);
      await get().fetchPlugins();
    } catch (e) {
      set({ pluginsError: e instanceof Error ? e.message : String(e) });
    }
  },
  scanPlugins: async () => {
    set({ pluginsLoading: true, pluginsError: null });
    try {
      const plugins = await api.scanPlugins();
      set({ plugins, pluginsLoading: false });
    } catch (e) {
      set({
        pluginsError: e instanceof Error ? e.message : String(e),
        pluginsLoading: false,
      });
    }
  },
});
