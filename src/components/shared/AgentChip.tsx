import { Badge } from "@/components/ui/badge";

interface AgentChipProps {
  label: string;
  type?: "agent" | "skill" | "tool";
}

export function AgentChip({ label, type: _type = "agent" }: AgentChipProps) {
  return (
    <Badge variant="secondary" className="text-xs">
      {label}
    </Badge>
  );
}
