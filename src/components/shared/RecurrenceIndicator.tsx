import { Repeat } from "lucide-react";

interface RecurrenceIndicatorProps {
  rule: string; // "daily" | "weekdays" | "weekly" | "monthly"
}

const LABEL_MAP: Record<string, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function RecurrenceIndicator({ rule }: RecurrenceIndicatorProps) {
  const label = LABEL_MAP[rule] ?? rule;

  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Repeat className="size-4" />
      <span className="text-xs font-semibold">{label}</span>
    </span>
  );
}
