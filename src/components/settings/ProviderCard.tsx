import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiProvider } from "@/types/ai";

interface ProviderCardProps {
  provider: AiProvider;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function ProviderCard({
  provider,
  onRemove,
  onSetDefault,
}: ProviderCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="size-2 rounded-full bg-green-500" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{provider.name}</span>
            {provider.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {provider.model}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!provider.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(provider.id)}
          >
            Set as Default
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(provider.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
