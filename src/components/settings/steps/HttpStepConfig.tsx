import { Lock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Credential, HttpStepConfig as HttpStepConfigType } from "@/lib/types";

interface HttpStepConfigProps {
  config: HttpStepConfigType;
  onChange: (config: HttpStepConfigType) => void;
  credentials: Credential[];
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const BODY_METHODS = ["POST", "PUT", "PATCH"];

export function HttpStepConfig({ config, onChange, credentials }: HttpStepConfigProps) {
  const showBody = BODY_METHODS.includes(config.method);

  const handleAddHeader = () => {
    const headers = [...(config.headers ?? []), { key: "", value: "" }];
    onChange({ ...config, headers });
  };

  const handleRemoveHeader = (index: number) => {
    const headers = (config.headers ?? []).filter((_, i) => i !== index);
    onChange({ ...config, headers: headers.length > 0 ? headers : undefined });
  };

  const handleHeaderChange = (index: number, field: "key" | "value", value: string) => {
    const headers = [...(config.headers ?? [])];
    headers[index] = { ...headers[index], [field]: value };
    onChange({ ...config, headers });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">Method</label>
        <Select
          value={config.method}
          onValueChange={(val: string | null) => {
            if (val)
              onChange({
                ...config,
                method: val as HttpStepConfigType["method"],
              });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">URL</label>
        <Input
          placeholder="https://api.example.com/endpoint"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">Headers</label>
        {(config.headers ?? []).map((header, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Key"
              value={header.key}
              onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
            />
            <Input
              className="flex-1"
              placeholder="Value"
              value={header.value}
              onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemoveHeader(index)}
              aria-label="Remove header"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-fit" onClick={handleAddHeader}>
          Add Header
        </Button>
      </div>

      {showBody && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide">Body</label>
          <Textarea
            className="font-mono"
            placeholder='{"key": "value"}'
            value={config.body ?? ""}
            onChange={(e) => onChange({ ...config, body: e.target.value || undefined })}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">Authentication</label>
        <Select
          value={config.auth?.type ?? "none"}
          onValueChange={(val: string | null) => {
            if (!val || val === "none") {
              onChange({ ...config, auth: { type: "none" } });
            } else if (val === "bearer") {
              onChange({
                ...config,
                auth: { type: "bearer", credentialId: "" },
              });
            } else if (val === "basic") {
              onChange({
                ...config,
                auth: { type: "basic", credentialId: "" },
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="bearer">Bearer</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
          </SelectContent>
        </Select>

        {config.auth && config.auth.type !== "none" && "credentialId" in config.auth && (
          <Select
            value={config.auth.credentialId}
            onValueChange={(val: string | null) => {
              if (val && config.auth && config.auth.type !== "none") {
                onChange({
                  ...config,
                  auth: { ...config.auth, credentialId: val },
                });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select credential..." />
            </SelectTrigger>
            <SelectContent>
              {credentials.map((cred) => (
                <SelectItem key={cred.id} value={cred.id}>
                  <Lock className="size-3" />
                  {cred.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wide">Timeout</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            value={config.timeoutSeconds ?? 30}
            onChange={(e) =>
              onChange({
                ...config,
                timeoutSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
          />
          <span className="text-sm text-muted-foreground">seconds</span>
        </div>
      </div>
    </div>
  );
}
