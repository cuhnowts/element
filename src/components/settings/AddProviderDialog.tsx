import { useState, useEffect } from "react";
import { Loader2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/stores";
import { api } from "@/lib/tauri";
import type { ProviderType } from "@/types/ai";
import { toast } from "sonner";

interface AddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const providerTypeOptions: { value: ProviderType; label: string }[] = [
  { value: "anthropic", label: "Claude" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
  { value: "openai_compatible", label: "Custom Endpoint" },
];

export function AddProviderDialog({
  open,
  onOpenChange,
}: AddProviderDialogProps) {
  const addProvider = useStore((s) => s.addProvider);

  const [providerType, setProviderType] = useState<ProviderType>("anthropic");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      setProviderType("anthropic");
      setName("");
      setApiKey("");
      setBaseUrl("");
      setModel("");
      setTestResult(null);
    }
  }, [open]);

  // Clear test result after 3 seconds
  useEffect(() => {
    if (testResult !== null) {
      const timer = setTimeout(() => setTestResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

  const showApiKey = providerType !== "ollama";
  const showBaseUrl =
    providerType === "ollama" || providerType === "openai_compatible";

  const handleTestConnection = async () => {
    // Save first so we can test, then we'll use the test endpoint
    setTesting(true);
    try {
      const provider = await api.addAiProvider({
        providerType,
        name: name.trim() || "Test Provider",
        model: model.trim(),
        baseUrl: showBaseUrl ? baseUrl.trim() : undefined,
        apiKey: showApiKey ? apiKey.trim() : undefined,
      });
      const result = await api.testProviderConnection(provider.id);
      setTestResult(result);
      // Clean up the test provider
      await api.removeAiProvider(provider.id);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !model.trim()) return;

    setSubmitting(true);
    try {
      await addProvider({
        providerType,
        name: name.trim(),
        model: model.trim(),
        baseUrl: showBaseUrl ? baseUrl.trim() : undefined,
        apiKey: showApiKey ? apiKey.trim() : undefined,
      });
      onOpenChange(false);
    } catch {
      toast.error("Could not save provider. Check your settings and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogDescription>
            Configure an AI provider for task scaffolding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provider Type
            </label>
            <Select
              value={providerType}
              onValueChange={(val: string | null) => {
                if (val) setProviderType(val as ProviderType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <Input
              placeholder="My Claude Provider"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {showApiKey && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                API Key
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Stored securely in your system keychain
              </p>
            </div>
          )}
          {showBaseUrl && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Base URL
              </label>
              <Input
                placeholder={
                  providerType === "ollama"
                    ? "http://localhost:11434"
                    : "https://api.example.com/v1"
                }
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Model
            </label>
            <Input
              placeholder={
                providerType === "anthropic"
                  ? "claude-sonnet-4-20250514"
                  : providerType === "openai"
                    ? "gpt-4o"
                    : "llama3"
              }
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !model.trim()}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : testResult === true ? (
              <Check className="size-4 text-green-500" data-icon="inline-start" />
            ) : testResult === false ? (
              <X className="size-4 text-destructive" data-icon="inline-start" />
            ) : null}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !name.trim() || !model.trim()}
          >
            Save Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
