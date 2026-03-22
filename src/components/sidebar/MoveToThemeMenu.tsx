import { Check } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Theme } from "@/lib/types";

interface MoveToThemeMenuProps {
  themes: Theme[];
  currentThemeId: string | null;
  onSelect: (themeId: string | null) => void;
}

export function MoveToThemeMenu({
  themes,
  currentThemeId,
  onSelect,
}: MoveToThemeMenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Move to Theme</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => onSelect(theme.id)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="flex-1">{theme.name}</span>
            {theme.id === currentThemeId && (
              <Check className="size-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect(null)}>
          <span className="flex-1">Uncategorized</span>
          {currentThemeId === null && (
            <Check className="size-4 ml-2" />
          )}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
