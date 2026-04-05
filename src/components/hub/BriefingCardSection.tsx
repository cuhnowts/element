import { ChevronRight, type LucideIcon } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";

interface BriefingCardSectionProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  defaultOpen?: boolean;
}

export function BriefingCardSection({
  title,
  icon: Icon,
  items,
  defaultOpen = false,
}: BriefingCardSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  const toggle = () => setOpen((prev) => !prev);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className="py-1">
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useAriaPropsSupportedByRole: interactive element with click handler */}
      <div
        // biome-ignore lint/a11y/noNoninteractiveTabindex: custom interactive element needs focus
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 cursor-pointer select-none"
      >
        <ChevronRight
          className="h-4 w-4 text-muted-foreground transition-transform duration-150"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {open && (
        <ul id={contentId} className="mt-1 ml-9 space-y-0.5">
          {items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
            <li key={i} className="text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
