import type { StepType } from "@/types/workflow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, Globe, Hand } from "lucide-react";

interface WorkflowExecutorPickerProps {
  value: StepType;
  onChange: (type: StepType) => void;
}

const STEP_TYPE_OPTIONS: { value: StepType; label: string; icon: React.ReactNode }[] = [
  { value: "shell", label: "Shell Command", icon: <Terminal className="h-4 w-4" /> },
  { value: "http", label: "HTTP Request", icon: <Globe className="h-4 w-4" /> },
  { value: "manual", label: "Manual Step", icon: <Hand className="h-4 w-4" /> },
];

export function WorkflowExecutorPicker({ value, onChange }: WorkflowExecutorPickerProps) {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as StepType)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STEP_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              {opt.icon}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
