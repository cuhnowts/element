import { create } from "zustand";
import { type AiSlice, createAiSlice } from "./aiSlice";
import { type CalendarSlice, createCalendarSlice } from "./calendarSlice";
import { type CredentialSlice, createCredentialSlice } from "./credentialSlice";
import { createFileExplorerSlice, type FileExplorerSlice } from "./fileExplorerSlice";
import { createHeartbeatSlice, type HeartbeatSlice } from "./heartbeatSlice";
import { createNotificationSlice, type NotificationSlice } from "./notificationSlice";
import { createOnboardingSlice, type OnboardingSlice } from "./onboardingSlice";
import { createPhaseSlice, type PhaseSlice } from "./phaseSlice";
import { createPluginSlice, type PluginSlice } from "./pluginSlice";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createSchedulingSlice, type SchedulingSlice } from "./schedulingSlice";
import { createTaskSlice, type TaskSlice } from "./taskSlice";
import { createThemeSlice, type ThemeSlice } from "./themeSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";

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
