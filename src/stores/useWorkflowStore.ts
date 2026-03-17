import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type { Workflow, StepDefinition, Schedule } from "@/types/workflow";
import type { WorkflowRun, WorkflowStepResult, StepProgress } from "@/types/execution";
import * as commands from "@/lib/tauri-commands";

interface WorkflowState {
  // Data
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  selectedWorkflow: Workflow | null;
  schedule: Schedule | null;
  runs: WorkflowRun[];
  selectedRun: WorkflowRun | null;
  selectedRunSteps: WorkflowStepResult[];

  // Execution state
  isRunning: boolean;
  currentStepIndex: number | null;
  stepStatuses: Record<number, string>;

  // Loading
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkflows: () => Promise<void>;
  selectWorkflow: (id: string | null) => Promise<void>;
  createWorkflow: (
    name: string,
    description: string,
    steps: StepDefinition[],
    taskId?: string,
  ) => Promise<Workflow>;
  updateWorkflow: (
    id: string,
    name?: string,
    description?: string,
    steps?: StepDefinition[],
  ) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  promoteTask: (taskId: string) => Promise<Workflow>;
  runWorkflow: (id: string) => Promise<void>;
  retryStep: (workflowId: string, runId: string, stepIndex: number) => Promise<void>;
  fetchRuns: (workflowId: string) => Promise<void>;
  selectRun: (run: WorkflowRun | null) => Promise<void>;

  // Schedule actions
  fetchSchedule: (workflowId: string) => Promise<void>;
  createSchedule: (workflowId: string, cronExpression: string) => Promise<void>;
  updateSchedule: (scheduleId: string, cronExpression: string) => Promise<void>;
  toggleSchedule: (scheduleId: string, isActive: boolean) => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<void>;

  // Event handlers (internal)
  setStepRunning: (progress: StepProgress) => void;
  setStepCompleted: (progress: StepProgress) => void;
  setStepFailed: (progress: StepProgress) => void;
}

export const useWorkflowStore = create<WorkflowState>()((set, get) => ({
  // Initial data
  workflows: [],
  selectedWorkflowId: null,
  selectedWorkflow: null,
  schedule: null,
  runs: [],
  selectedRun: null,
  selectedRunSteps: [],

  // Execution state
  isRunning: false,
  currentStepIndex: null,
  stepStatuses: {},

  // Loading
  isLoading: false,
  error: null,

  // Actions
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const workflows = await commands.listWorkflows();
      set({ workflows, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  selectWorkflow: async (id: string | null) => {
    if (!id) {
      set({
        selectedWorkflowId: null,
        selectedWorkflow: null,
        schedule: null,
        runs: [],
        selectedRun: null,
        selectedRunSteps: [],
      });
      return;
    }

    set({ selectedWorkflowId: id, isLoading: true, error: null });
    try {
      const workflow = await commands.getWorkflow(id);
      set({ selectedWorkflow: workflow, isLoading: false });
      // Also fetch schedule and runs
      get().fetchSchedule(id);
      get().fetchRuns(id);
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createWorkflow: async (
    name: string,
    description: string,
    steps: StepDefinition[],
    taskId?: string,
  ) => {
    const workflow = await commands.createWorkflow(name, description, steps, taskId);
    set((s) => ({ workflows: [workflow, ...s.workflows] }));
    return workflow;
  },

  updateWorkflow: async (
    id: string,
    name?: string,
    description?: string,
    steps?: StepDefinition[],
  ) => {
    const updated = await commands.updateWorkflow(id, name, description, steps);
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? updated : w)),
      selectedWorkflow: s.selectedWorkflowId === id ? updated : s.selectedWorkflow,
    }));
  },

  deleteWorkflow: async (id: string) => {
    await commands.deleteWorkflow(id);
    set((s) => ({
      workflows: s.workflows.filter((w) => w.id !== id),
      selectedWorkflowId: s.selectedWorkflowId === id ? null : s.selectedWorkflowId,
      selectedWorkflow: s.selectedWorkflowId === id ? null : s.selectedWorkflow,
    }));
  },

  promoteTask: async (taskId: string) => {
    const workflow = await commands.promoteTaskToWorkflow(taskId);
    set((s) => ({ workflows: [workflow, ...s.workflows] }));
    return workflow;
  },

  runWorkflow: async (id: string) => {
    set({ isRunning: true, stepStatuses: {}, currentStepIndex: null, error: null });
    try {
      await commands.runWorkflow(id);
    } catch (e) {
      set({ isRunning: false, error: String(e) });
    }
  },

  retryStep: async (workflowId: string, runId: string, stepIndex: number) => {
    set({ isRunning: true, error: null });
    try {
      await commands.retryWorkflowStep(workflowId, runId, stepIndex);
    } catch (e) {
      set({ isRunning: false, error: String(e) });
    }
  },

  fetchRuns: async (workflowId: string) => {
    try {
      const runs = await commands.getWorkflowRuns(workflowId);
      set({ runs });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectRun: async (run: WorkflowRun | null) => {
    if (!run) {
      set({ selectedRun: null, selectedRunSteps: [] });
      return;
    }
    set({ selectedRun: run });
    try {
      const steps = await commands.getStepResults(run.id);
      set({ selectedRunSteps: steps });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  // Schedule actions
  fetchSchedule: async (workflowId: string) => {
    try {
      const schedule = await commands.getScheduleForWorkflow(workflowId);
      set({ schedule });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createSchedule: async (workflowId: string, cronExpression: string) => {
    const schedule = await commands.createSchedule(workflowId, cronExpression);
    set({ schedule });
  },

  updateSchedule: async (scheduleId: string, cronExpression: string) => {
    const schedule = await commands.updateSchedule(scheduleId, cronExpression);
    set({ schedule });
  },

  toggleSchedule: async (scheduleId: string, isActive: boolean) => {
    const schedule = await commands.toggleSchedule(scheduleId, isActive);
    set({ schedule });
  },

  deleteSchedule: async (scheduleId: string) => {
    await commands.deleteSchedule(scheduleId);
    set({ schedule: null });
  },

  // Event handlers
  setStepRunning: (progress: StepProgress) => {
    set((s) => ({
      currentStepIndex: progress.stepIndex,
      stepStatuses: { ...s.stepStatuses, [progress.stepIndex]: "running" },
    }));
  },

  setStepCompleted: (progress: StepProgress) => {
    set((s) => ({
      stepStatuses: { ...s.stepStatuses, [progress.stepIndex]: "completed" },
    }));
  },

  setStepFailed: (progress: StepProgress) => {
    set((s) => ({
      isRunning: false,
      stepStatuses: { ...s.stepStatuses, [progress.stepIndex]: "failed" },
    }));
  },
}));

// Set up Tauri event listeners for execution progress (module-level, runs once on import)
listen<StepProgress>("workflow-step-started", (event) => {
  useWorkflowStore.getState().setStepRunning(event.payload);
});

listen<StepProgress>("workflow-step-completed", (event) => {
  useWorkflowStore.getState().setStepCompleted(event.payload);
});

listen<StepProgress>("workflow-step-failed", (event) => {
  useWorkflowStore.getState().setStepFailed(event.payload);
});

// Listen for workflow completion to refresh runs
listen("workflow-run-completed", () => {
  const state = useWorkflowStore.getState();
  if (state.selectedWorkflowId) {
    state.fetchRuns(state.selectedWorkflowId);
  }
  useWorkflowStore.setState({ isRunning: false, currentStepIndex: null });
});
