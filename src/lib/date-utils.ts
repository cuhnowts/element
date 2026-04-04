import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

const DUE_SOON_THRESHOLD = 2;

export function isOverdue(dueDate: string): boolean {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  return due < today;
}

export function isDueSoon(dueDate: string): boolean {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  const diff = differenceInCalendarDays(due, today);
  return diff >= 0 && diff <= DUE_SOON_THRESHOLD;
}

export function isBacklogPhase(sortOrder: number): boolean {
  return sortOrder >= 999;
}
