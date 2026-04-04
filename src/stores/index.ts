import { create } from "zustand";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createTaskSlice, type TaskSlice } from "./taskSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";
import { createPluginSlice, type PluginSlice } from "./pluginSlice";
import { createCredentialSlice, type CredentialSlice } from "./credentialSlice";
import { createCalendarSlice, type CalendarSlice } from "./calendarSlice";
import {
  createSchedulingSlice,
  type SchedulingSlice,
} from "./schedulingSlice";
import { createAiSlice, type AiSlice } from "./aiSlice";
import { createThemeSlice, type ThemeSlice } from "./themeSlice";
import { createPhaseSlice, type PhaseSlice } from "./phaseSlice";
import {
  createFileExplorerSlice,
  type FileExplorerSlice,
} from "./fileExplorerSlice";
import {
  createOnboardingSlice,
  type OnboardingSlice,
} from "./onboardingSlice";
import {
  createNotificationSlice,
  type NotificationSlice,
} from "./notificationSlice";
import {
  createHeartbeatSlice,
  type HeartbeatSlice,
} from "./heartbeatSlice";

export type AppStore = ProjectSlice &
  TaskSlice &
  UiSlice &
  PluginSlice &
  CredentialSlice &
  CalendarSlice &
  SchedulingSlice &
  AiSlice &
  ThemeSlice &
  PhaseSlice &
  FileExplorerSlice &
  OnboardingSlice &
  NotificationSlice &
  HeartbeatSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTaskSlice(...a),
  ...createUiSlice(...a),
  ...createPluginSlice(...a),
  ...createCredentialSlice(...a),
  ...createCalendarSlice(...a),
  ...createSchedulingSlice(...a),
  ...createAiSlice(...a),
  ...createThemeSlice(...a),
  ...createPhaseSlice(...a),
  ...createFileExplorerSlice(...a),
  ...createOnboardingSlice(...a),
  ...createNotificationSlice(...a),
  ...createHeartbeatSlice(...a),
}));
