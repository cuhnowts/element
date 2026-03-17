import { create } from "zustand";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createTaskSlice, type TaskSlice } from "./taskSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";
import { createPluginSlice, type PluginSlice } from "./pluginSlice";
import { createCredentialSlice, type CredentialSlice } from "./credentialSlice";
import { createCalendarSlice, type CalendarSlice } from "./calendarSlice";

export type AppStore = ProjectSlice &
  TaskSlice &
  UiSlice &
  PluginSlice &
  CredentialSlice &
  CalendarSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTaskSlice(...a),
  ...createUiSlice(...a),
  ...createPluginSlice(...a),
  ...createCredentialSlice(...a),
  ...createCalendarSlice(...a),
}));
