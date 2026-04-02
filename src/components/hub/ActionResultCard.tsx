import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface ActionResultCardProps {
  success: boolean;
  message: string;
}

export function ActionResultCard({ success, message }: ActionResultCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-in fade-in duration-150 ease-in"
    >
      <Card
        className={`w-full ${!success ? "border-l-2 border-l-destructive" : ""}`}
      >
        <div className="flex items-center gap-2 px-4 py-2">
          {success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span className="text-sm">{message}</span>
        </div>
      </Card>
    </div>
  );
}
