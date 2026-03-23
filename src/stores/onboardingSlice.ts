import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { AppStore } from "./index";
import type {
  OnboardingStep,
  PlanOutput,
  PendingPhase,
  PendingTask,
} from "../types/onboarding";
import { toast } from "sonner";

export interface OnboardingSlice {
  onboardingStep: OnboardingStep;
  onboardingScope: string;
  onboardingGoals: string;
  pendingPlan: PlanOutput | null;
  onboardingSaving: boolean;

  setOnboardingStep: (step: OnboardingStep) => void;
  setOnboardingScope: (text: string) => void;
  setOnboardingGoals: (text: string) => void;
  setPendingPlan: (plan: PlanOutput | null) => void;
  updatePendingPhase: (index: number, updates: Partial<PendingPhase>) => void;
  removePendingPhase: (index: number) => void;
  addPendingPhase: () => void;
  reorderPendingPhases: (fromIndex: number, toIndex: number) => void;
  updatePendingTask: (phaseIndex: number, taskIndex: number, updates: Partial<PendingTask>) => void;
  removePendingTask: (phaseIndex: number, taskIndex: number) => void;
  addPendingTask: (phaseIndex: number) => void;
  confirmAndSavePlan: (projectId: string) => Promise<void>;
  discardPlan: () => void;
}

export const createOnboardingSlice: StateCreator<
  AppStore,
  [],
  [],
  OnboardingSlice
> = (set, get) => ({
  onboardingStep: "idle",
  onboardingScope: "",
  onboardingGoals: "",
  pendingPlan: null,
  onboardingSaving: false,

  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setOnboardingScope: (text) => set({ onboardingScope: text }),
  setOnboardingGoals: (text) => set({ onboardingGoals: text }),
  setPendingPlan: (plan) => set({ pendingPlan: plan }),

  updatePendingPhase: (index, updates) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = [...plan.phases];
    phases[index] = { ...phases[index], ...updates };
    set({ pendingPlan: { ...plan, phases } });
  },

  removePendingPhase: (index) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = plan.phases.filter((_, i) => i !== index);
    set({ pendingPlan: { ...plan, phases } });
  },

  addPendingPhase: () => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const newPhase: PendingPhase = { name: "", tasks: [] };
    set({ pendingPlan: { ...plan, phases: [...plan.phases, newPhase] } });
  },

  reorderPendingPhases: (fromIndex, toIndex) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = [...plan.phases];
    const [moved] = phases.splice(fromIndex, 1);
    phases.splice(toIndex, 0, moved);
    set({ pendingPlan: { ...plan, phases } });
  },

  updatePendingTask: (phaseIndex, taskIndex, updates) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = [...plan.phases];
    const tasks = [...phases[phaseIndex].tasks];
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    phases[phaseIndex] = { ...phases[phaseIndex], tasks };
    set({ pendingPlan: { ...plan, phases } });
  },

  removePendingTask: (phaseIndex, taskIndex) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = [...plan.phases];
    const tasks = phases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
    phases[phaseIndex] = { ...phases[phaseIndex], tasks };
    set({ pendingPlan: { ...plan, phases } });
  },

  addPendingTask: (phaseIndex) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    const phases = [...plan.phases];
    const newTask: PendingTask = { title: "" };
    phases[phaseIndex] = {
      ...phases[phaseIndex],
      tasks: [...phases[phaseIndex].tasks, newTask],
    };
    set({ pendingPlan: { ...plan, phases } });
  },

  confirmAndSavePlan: async (projectId) => {
    const plan = get().pendingPlan;
    if (!plan) return;
    set({ onboardingSaving: true });
    try {
      const result = await api.batchCreatePlan(
        projectId,
        plan.phases.map((p) => ({
          name: p.name,
          tasks: p.tasks.map((t) => ({ title: t.title, description: t.description })),
        }))
      );
      toast.success(`${result.phaseCount} phases and ${result.taskCount} tasks created`);
      set({
        onboardingStep: "idle",
        pendingPlan: null,
        onboardingScope: "",
        onboardingGoals: "",
        onboardingSaving: false,
      });
    } catch (e) {
      toast.error("Could not save plan. Check your connection and try again.");
      set({ onboardingSaving: false });
    }
  },

  discardPlan: () => {
    set({
      onboardingStep: "idle",
      pendingPlan: null,
      onboardingScope: "",
      onboardingGoals: "",
    });
  },
});
