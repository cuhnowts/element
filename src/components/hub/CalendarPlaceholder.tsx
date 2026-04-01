import { Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CalendarPlaceholder() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h2 className="text-base font-semibold leading-tight">Calendar</h2>
        <div className="mt-8 flex flex-col items-center text-center px-4">
          <Calendar className="size-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Your schedule and time blocks will appear here in a future update.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
