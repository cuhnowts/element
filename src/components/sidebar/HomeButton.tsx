import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/stores";

export function HomeButton() {
  const activeView = useStore((s) => s.activeView);
  const navigateToHub = useStore((s) => s.navigateToHub);
  const isActive = activeView === "hub";

  return (
    <button
      type="button"
      onClick={navigateToHub}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 w-full px-4 py-2 text-sm font-medium transition-colors duration-150",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      <Home className="size-[18px]" />
      Home
    </button>
  );
}
