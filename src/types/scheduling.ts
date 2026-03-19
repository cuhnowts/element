export type BlockType = "work" | "meeting" | "buffer";

export interface ScheduleBlock {
  id: string;
  scheduleDate: string;
  blockType: BlockType;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  taskId?: string;
  taskTitle?: string;
  taskPriority?: string;
  eventTitle?: string;
  isConfirmed: boolean;
  isContinuation: boolean;
}

export interface WorkHoursConfig {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  workDays: string[]; // ["mon", "tue", ...]
  bufferMinutes: number;
  minBlockMinutes: number;
}
