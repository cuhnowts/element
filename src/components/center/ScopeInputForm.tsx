import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";

interface ScopeInputFormProps {
  projectName: string;
  onSubmit: (scope: string, goals: string) => void;
  onCancel: () => void;
}

export function ScopeInputForm({ projectName: _projectName, onSubmit, onCancel }: ScopeInputFormProps) {
  const [scope, setScope] = useState("");
  const [goals, setGoals] = useState("");

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Plan with AI</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="scope">Scope <span className="text-destructive">*</span></Label>
          <Textarea
            id="scope"
            aria-required="true"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Describe what this project is about, what you're building, and any key constraints..."
            className="min-h-[120px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goals">Goals (optional)</Label>
          <Input
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="What does success look like?"
          />
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Back to project
          </Button>
          <Button onClick={() => onSubmit(scope, goals)} disabled={scope.trim().length === 0}>
            Start AI Planning
          </Button>
        </div>
      </div>
    </div>
  );
}
