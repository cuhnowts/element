export type { TaskStatus, TaskPriority, Task, TaskWithTags } from "@/lib/types";
import type { Task } from "@/lib/types";
import type { Step } from "./execution";

export interface TaskDetail extends Task {
  tags: string[];
  agents: string[];
  skills: string[];
  tools: string[];
  steps: Step[];
}
