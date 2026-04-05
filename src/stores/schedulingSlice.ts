import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { ScheduleBlock, WorkHoursConfig } from "../types/scheduling";
import type { AppStore } from "./index";

export interface SchedulingSlice {
  todaySchedule: ScheduleBlock[];
  workHours: WorkHoursConfig | null;
  isScheduleLoading: boolean;
  scheduleDate: string; // ISO date string
  loadWorkHours: () => Promise<void>;
  saveWorkHours: (config: WorkHoursConfig) => Promise<void>;
  generateSchedule: (date?: string) => Promise<void>;
  applySchedule: () => Promise<void>;
  setScheduleDate: (date: string) => void;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export const createSchedulingSlice: StateCreator<AppStore, [], [], SchedulingSlice> = (
  set,
  get,
) => ({
  todaySchedule: [],
  workHours: null,
  isScheduleLoading: false,
  scheduleDate: todayISO(),
  loadWorkHours: async () => {
    const workHours = await api.getWorkHours();
    set({ workHours });
  },
  saveWorkHours: async (config) => {
    const saved = await api.saveWorkHours(config);
    set({ workHours: saved });
  },
  generateSchedule: async (date) => {
    const targetDate = date || get().scheduleDate;
    set({ isScheduleLoading: true, scheduleDate: targetDate });
    try {
      const schedule = await api.generateSchedule(targetDate);
      set({ todaySchedule: schedule, isScheduleLoading: false });
    } catch {
      set({ isScheduleLoading: false });
    }
  },
  applySchedule: async () => {
    const blocks = get().todaySchedule;
    if (blocks.length === 0) return;
    await api.applySchedule(blocks);
    set({
      todaySchedule: blocks.map((b) => ({ ...b, isConfirmed: true })),
    });
  },
  setScheduleDate: (date) => set({ scheduleDate: date }),
});
