import { ProgressBar } from "@/components/shared/ProgressBar";

interface TodayViewHeaderProps {
  completedCount: number;
  totalCount: number;
  overdueCount: number;
  upcomingCount: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayViewHeader({
  completedCount,
  totalCount,
  overdueCount,
  upcomingCount,
}: TodayViewHeaderProps) {
  const progressValue = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mb-12">
      <h1 className="text-[28px] font-semibold leading-[1.2]">{getGreeting()}</h1>
      <p className="text-sm text-foreground mt-1">
        {completedCount} of {totalCount} tasks complete
      </p>
      <ProgressBar value={progressValue} className="mt-2" />
      <p className="text-xs font-semibold mt-2">
        <span className="text-destructive-foreground">{overdueCount} overdue</span>
        <span className="text-muted-foreground"> / {upcomingCount} upcoming</span>
      </p>
    </div>
  );
}
