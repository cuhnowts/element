import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { ProviderCard } from "./ProviderCard";
import { AddProviderDialog } from "./AddProviderDialog";
import { toast } from "sonner";

export function AiSettings() {
  const providers = useStore((s) => s.providers);
  const loadProviders = useStore((s) => s.loadProviders);
  const removeProvider = useStore((s) => s.removeProvider);
  const setDefaultProvider = useStore((s) => s.setDefaultProvider);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadProviders().catch(() => {
      toast.error("Could not load AI providers.");
    });
  }, [loadProviders]);

  const handleRemove = async (id: string) => {
    try {
      await removeProvider(id);
    } catch {
      toast.error("Could not remove provider.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultProvider(id);
    } catch {
      toast.error("Could not set default provider.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Providers</h2>
        <Button onClick={() => setDialogOpen(true)}>Add Provider</Button>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="mb-2 text-base font-medium">
            No AI providers configured
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add an AI provider to enable smart task scaffolding. Element works
            fully without AI -- this is an optional enhancement.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onRemove={handleRemove}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      <AddProviderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
