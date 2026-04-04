export function OutOfTimeDivider() {
  return (
    <div
      className="flex items-center gap-3 py-2"
      role="separator"
      aria-label="Tasks that won't fit today"
    >
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">Won't fit today</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
