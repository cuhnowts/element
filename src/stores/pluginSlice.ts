import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { PluginInfo, PluginSkillInfo } from "../lib/types";
import type { AppStore } from "./index";

export interface PluginSlice {
  plugins: PluginInfo[];
  pluginsLoading: boolean;
  pluginsError: string | null;
  pluginSkills: PluginSkillInfo[];
  pluginSkillsLoading: boolean;
  fetchPlugins: () => Promise<void>;
  fetchPluginSkills: () => Promise<void>;
  dispatchPluginSkill: (skillName: string, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  enablePlugin: (name: string) => Promise<void>;
  disablePlugin: (name: string) => Promise<void>;
  reloadPlugin: (name: string) => Promise<void>;
  scanPlugins: () => Promise<void>;
}

export const createPluginSlice: StateCreator<AppStore, [], [], PluginSlice> = (set, get) => ({
  plugins: [],
  pluginsLoading: false,
  pluginsError: null,
  pluginSkills: [],
  pluginSkillsLoading: false,
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
  fetchPluginSkills: async () => {
    set({ pluginSkillsLoading: true });
    try {
      const skills = await api.listPluginSkills();
      set({ pluginSkills: skills, pluginSkillsLoading: false });
    } catch (e) {
      set({
        pluginsError: e instanceof Error ? e.message : String(e),
        pluginSkillsLoading: false,
      });
    }
  },
  dispatchPluginSkill: async (skillName, input) => {
    return await api.dispatchPluginSkill(skillName, input);
  },
  enablePlugin: async (name) => {
    try {
      await api.enablePlugin(name);
      await get().fetchPlugins();
      await get().fetchPluginSkills();
    } catch (e) {
      set({ pluginsError: e instanceof Error ? e.message : String(e) });
    }
  },
  disablePlugin: async (name) => {
    try {
      await api.disablePlugin(name);
      await get().fetchPlugins();
      await get().fetchPluginSkills();
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
