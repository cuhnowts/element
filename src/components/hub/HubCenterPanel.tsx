import { ScrollArea } from "@/components/ui/scroll-area";

export function HubCenterPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h1 className="text-xl font-semibold leading-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your daily briefing and chat will appear here soon.
        </p>
      </div>
    </ScrollArea>
  );
}
