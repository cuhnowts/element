interface SlideOverPanelProps {
  open: boolean;
  side: "left" | "right";
  children: React.ReactNode;
}

export function SlideOverPanel({ open, side, children }: SlideOverPanelProps) {
  const positionClasses =
    side === "left" ? "left-0 top-0 bottom-0 border-r border-border" : "right-0 top-0 bottom-0 border-l border-border";

  const transformClass = open
    ? "translate-x-0"
    : side === "left"
      ? "-translate-x-full"
      : "translate-x-full";

  return (
    <div
      className={`absolute ${positionClasses} w-[320px] z-20 bg-card shadow-[0_4px_24px_oklch(0_0_0/0.4)] transition-transform duration-200 ease-out ${transformClass}`}
    >
      <div className="p-4 overflow-auto h-full">{children}</div>
    </div>
  );
}
