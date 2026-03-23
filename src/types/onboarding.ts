export type OnboardingStep = "idle" | "scope-input" | "waiting" | "review";

export type AiMode = "on-demand" | "track-suggest" | "track-auto-execute";

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
