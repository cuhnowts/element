import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StepEditor } from "@/components/center/StepEditor";
import { StepInsertButton } from "@/components/center/StepInsertButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import type { ManualStepConfig, StepDefinition, Workflow } from "@/types/workflow";

interface WorkflowBuilderProps {
  workflow: Workflow;
  onSave: (steps: StepDefinition[]) => void;
}

function stepsEqual(a: StepDefinition[], b: StepDefinition[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function WorkflowBuilder({ workflow, onSave }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<StepDefinition[]>(workflow.steps);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync steps when workflow changes externally
  useEffect(() => {
    setSteps(workflow.steps);
    setHasChanges(false);
    setExpandedIndex(null);
  }, [workflow.steps]);

  // Track changes
  useEffect(() => {
    setHasChanges(!stepsEqual(steps, workflow.steps));
  }, [steps, workflow.steps]);

  const createNewStep = useCallback((): ManualStepConfig => {
    return { type: "manual", name: `Step ${steps.length + 1}`, description: "" };
  }, [steps.length]);

  const handleInsert = useCallback(
    (insertIndex: number) => {
      const newStep = createNewStep();
      const updated = [...steps.slice(0, insertIndex), newStep, ...steps.slice(insertIndex)];
      setSteps(updated);
      setExpandedIndex(insertIndex);
    },
    [steps, createNewStep],
  );

  const handleChange = useCallback((index: number, updatedStep: StepDefinition) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? updatedStep : s)));
  }, []);

  const handleDelete = useCallback(
    (index: number) => {
      setSteps((prev) => prev.filter((_, i) => i !== index));
      if (expandedIndex === index) {
        setExpandedIndex(null);
      } else if (expandedIndex !== null && expandedIndex > index) {
        setExpandedIndex(expandedIndex - 1);
      }
    },
    [expandedIndex],
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      const duplicated = { ...steps[index], name: `${steps[index].name} (copy)` };
      const updated = [...steps.slice(0, index + 1), duplicated, ...steps.slice(index + 1)];
      setSteps(updated);
      setExpandedIndex(index + 1);
    },
    [steps],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...steps];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      setSteps(updated);
      if (expandedIndex === index) setExpandedIndex(index - 1);
      else if (expandedIndex === index - 1) setExpandedIndex(index);
    },
    [steps, expandedIndex],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= steps.length - 1) return;
      const updated = [...steps];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      setSteps(updated);
      if (expandedIndex === index) setExpandedIndex(index + 1);
      else if (expandedIndex === index + 1) setExpandedIndex(index);
    },
    [steps, expandedIndex],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "n") {
        e.preventDefault();
        handleInsert(steps.length);
      }

      if (e.key === "Escape" && expandedIndex !== null) {
        e.preventDefault();
        setExpandedIndex(null);
      }

      if (isMod && e.key === "s") {
        e.preventDefault();
        if (hasChanges) onSave(steps);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [steps, expandedIndex, hasChanges, onSave, handleInsert]);

  if (steps.length === 0) {
    return (
      <EmptyState
        heading="No steps yet"
        body="Add your first step to start building this workflow."
        action={
          <Button onClick={() => handleInsert(0)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-0">
      <StepInsertButton onClick={() => handleInsert(0)} />

      {steps.map((step, index) => (
        <div key={`step-${index}`}>
          <StepEditor
            step={step}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            onChange={(updated) => handleChange(index, updated)}
            onDelete={() => handleDelete(index)}
            onDuplicate={() => handleDuplicate(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            canMoveUp={index > 0}
            canMoveDown={index < steps.length - 1}
          />
          <StepInsertButton onClick={() => handleInsert(index + 1)} />
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button disabled={!hasChanges} onClick={() => onSave(steps)}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
