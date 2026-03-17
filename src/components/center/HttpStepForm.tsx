import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";

interface HttpStepFormProps {
  method: string;
  url: string;
  headers: [string, string][];
  body: unknown;
  onChange: (field: string, value: unknown) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const BODY_METHODS = ["POST", "PUT", "PATCH"];

export function HttpStepForm({
  method,
  url,
  headers,
  body,
  onChange,
}: HttpStepFormProps) {
  const showBody = BODY_METHODS.includes(method);

  const handleAddHeader = () => {
    onChange("headers", [...headers, ["", ""]]);
  };

  const handleRemoveHeader = (index: number) => {
    const updated = headers.filter((_, i) => i !== index);
    onChange("headers", updated);
  };

  const handleHeaderChange = (
    index: number,
    position: 0 | 1,
    value: string,
  ) => {
    const updated = headers.map((h, i) =>
      i === index
        ? ([
            position === 0 ? value : h[0],
            position === 1 ? value : h[1],
          ] as [string, string])
        : h,
    );
    onChange("headers", updated);
  };

  return (
    <div className="space-y-4">
      {/* Method and URL */}
      <div className="flex gap-2">
        <Select
          value={method}
          onValueChange={(val) => onChange("method", val)}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={url}
          onChange={(e) => onChange("url", e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="flex-1"
        />
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Headers
        </label>
        {headers.map((header, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              value={header[0]}
              onChange={(e) => handleHeaderChange(index, 0, e.target.value)}
              placeholder="Key"
              className="flex-1"
            />
            <Input
              value={header[1]}
              onChange={(e) => handleHeaderChange(index, 1, e.target.value)}
              placeholder="Value"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemoveHeader(index)}
              aria-label="Remove header"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddHeader}
          className="text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Header
        </Button>
      </div>

      {/* Body */}
      {showBody && (
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Body
          </label>
          <CodeMirror
            value={typeof body === "string" ? body : JSON.stringify(body ?? {}, null, 2)}
            onChange={(val) => onChange("body", val)}
            height="120px"
            theme={oneDark}
            extensions={[json()]}
            placeholder='{ "key": "value" }'
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              bracketMatching: true,
            }}
          />
        </div>
      )}
    </div>
  );
}
