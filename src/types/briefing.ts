export type BriefingTag =
  | "overdue"
  | "approaching-deadline"
  | "blocked"
  | "on-track"
  | "recently-completed";

export interface BriefingProject {
  name: string;
  projectId?: string;
  tags: BriefingTag[];
  blockers: string[];
  deadlines: string[];
  wins: string[];
}

export interface BriefingJSON {
  summary: string;
  projects: BriefingProject[];
}

export type BriefingStatus = "idle" | "loading" | "streaming" | "complete" | "error";
