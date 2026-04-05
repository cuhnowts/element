import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/tauri";

const DEFAULT_COMMANDS = [
  "git",
  "npm",
  "yarn",
  "pnpm",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "echo",
  "date",
  "pwd",
];

const SETTINGS_KEY = "shell_allowlist";

export function ShellAllowlistSettings() {
  const [customCommands, setCustomCommands] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const val = await api.getAppSetting(SETTINGS_KEY);
        if (val) {
          const parsed = val
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          setCustomCommands(parsed);
        }
      } catch {
        // No setting yet -- that's fine
      }
    };
    load();
  }, []);

  const save = async (commands: string[]) => {
    try {
      await api.setAppSetting(SETTINGS_KEY, commands.join(","));
    } catch {
      toast.error("Could not save shell allowlist.");
    }
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (customCommands.includes(trimmed) || DEFAULT_COMMANDS.includes(trimmed)) {
      toast.info(`"${trimmed}" is already in the allowlist.`);
      setInputValue("");
      return;
    }
    const updated = [...customCommands, trimmed];
    setCustomCommands(updated);
    save(updated);
    setInputValue("");
  };

  const handleRemove = (command: string) => {
    const updated = customCommands.filter((c) => c !== command);
    setCustomCommands(updated);
    save(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Shell Allowlist</h2>
        <p className="text-sm text-muted-foreground">
          Commands the AI bot is allowed to run. Default safe commands are always included.
        </p>
      </div>

      {/* Default commands */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Default commands (always available):</p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COMMANDS.map((cmd) => (
            <Badge key={cmd} variant="secondary">
              {cmd}
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom commands */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Custom commands:</p>
        {customCommands.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom commands added. Default commands (git, npm, ls, cat, etc.) are always
            available.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customCommands.map((cmd) => (
              <Badge
                key={cmd}
                variant="outline"
                className="gap-1 transition-all duration-150 ease-in"
              >
                {cmd}
                <button
                  type="button"
                  onClick={() => handleRemove(cmd)}
                  className="ml-1 rounded-sm hover:text-destructive"
                  aria-label={`Remove ${cmd} from allowlist`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Add input */}
      <div className="flex max-w-[400px] gap-2">
        <Input
          placeholder="e.g., docker, cargo, python"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Add command to shell allowlist"
        />
        <Button variant="outline" size="sm" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}
