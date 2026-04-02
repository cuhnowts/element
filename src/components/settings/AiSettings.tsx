import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores";
import { ProviderCard } from "./ProviderCard";
import { AddProviderDialog } from "./AddProviderDialog";
import { api } from "@/lib/tauri";
import { toast } from "sonner";
import { ShellAllowlistSettings } from "./ShellAllowlistSettings";

export function AiSettings() {
  const providers = useStore((s) => s.providers);
  const loadProviders = useStore((s) => s.loadProviders);
  const removeProvider = useStore((s) => s.removeProvider);
  const setDefaultProvider = useStore((s) => s.setDefaultProvider);
  const [dialogOpen, setDialogOpen] = useState(false);

  // CLI Tool state
  const [cliCommand, setCliCommand] = useState("");
  const [cliArgs, setCliArgs] = useState("");

  useEffect(() => {
    loadProviders().catch(() => {
      toast.error("Could not load AI providers.");
    });
  }, [loadProviders]);

  // Load CLI settings on mount
  useEffect(() => {
    const loadCliSettings = async () => {
      try {
        const cmd = await api.getAppSetting("cli_command");
        const args = await api.getAppSetting("cli_args");
        if (cmd) setCliCommand(cmd);
        if (args) setCliArgs(args);
      } catch {
        // Settings not found is fine — fields stay empty
      }
    };
    loadCliSettings();
  }, []);

  const handleSaveCliTool = async () => {
    try {
      if (cliCommand.trim()) {
        await api.setAppSetting("cli_command", cliCommand.trim());
      } else {
        await api.setAppSetting("cli_command", "");
      }
      if (cliArgs.trim()) {
        await api.setAppSetting("cli_args", cliArgs.trim());
      } else {
        await api.setAppSetting("cli_args", "");
      }
      toast.success("CLI tool saved.");
    } catch {
      toast.error("Could not save CLI tool settings.");
    }
  };

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
      {/* CLI Tool section */}
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">CLI Tool</h2>
          <p className="text-sm text-muted-foreground">
            Set the command that runs when you click Open AI. Leave empty to disable.
          </p>
        </div>

        <div className="max-w-[400px] space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cli-command">Command</Label>
            <Input
              id="cli-command"
              placeholder="claude"
              value={cliCommand}
              onChange={(e) => setCliCommand(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-args">Default arguments</Label>
            <Input
              id="cli-args"
              placeholder="--dangerously-skip-permissions"
              value={cliArgs}
              onChange={(e) => setCliArgs(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveCliTool}>Save CLI Tool</Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Shell Allowlist section */}
      <div className="mb-6">
        <ShellAllowlistSettings />
      </div>

      <Separator className="my-6" />

      {/* AI Providers section */}
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
