export type OnboardingStep = "idle" | "scope-input" | "waiting" | "review";

export interface PendingTask {
  title: string;
  description?: string;
}

export interface PendingPhase {
  name: string;
  sortOrder?: number;
  tasks: PendingTask[];
}

export interface PlanOutput {
  phases: PendingPhase[];
}

export interface BatchCreateResult {
  phaseCount: number;
  taskCount: number;
}
