import { Skeleton } from "@/components/ui/skeleton";

export function BriefingSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-[80%]" />
      <Skeleton className="h-3.5 w-[60%]" />
      <Skeleton className="h-3.5 w-[70%]" />
    </div>
  );
}
