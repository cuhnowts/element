import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Credential, CredentialType } from "@/lib/types";
import { useStore } from "@/stores";

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: Credential;
}

const credentialTypeOptions: { value: CredentialType; label: string }[] = [
  { value: "api_key", label: "API Key" },
  { value: "token", label: "Token" },
  { value: "secret", label: "Secret" },
  { value: "oauth_token", label: "OAuth Token" },
];

export function CredentialDialog({ open, onOpenChange, credential }: CredentialDialogProps) {
  const createCredential = useStore((s) => s.createCredential);
  const updateCredential = useStore((s) => s.updateCredential);

  const isEdit = !!credential;

  const [name, setName] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("api_key");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (credential) {
        setName(credential.name);
        setCredentialType(credential.credentialType);
        setValue("");
        setNotes(credential.notes);
      } else {
        setName("");
        setCredentialType("api_key");
        setValue("");
        setNotes("");
      }
    }
  }, [open, credential]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!isEdit && !value.trim()) return;

    setSubmitting(true);
    try {
      if (isEdit && credential) {
        await updateCredential(credential.id, {
          name: name.trim(),
          credentialType,
          notes: notes.trim(),
          ...(value.trim() ? { value: value.trim() } : {}),
        });
      } else {
        await createCredential({
          name: name.trim(),
          credentialType,
          value: value.trim(),
          notes: notes.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch (_e) {
      toast.error(
        "Couldn't save credential. The system keychain may be locked. Unlock it and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Credential" : "Add Credential"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the credential details below."
              : "Store a new credential securely in the system keychain."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <Input
              placeholder="e.g. OpenAI API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </label>
            <Select
              value={credentialType}
              onValueChange={(val: string | null) => {
                if (val) setCredentialType(val as CredentialType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {credentialTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Value
            </label>
            <Input
              type="password"
              placeholder={isEdit ? "(leave blank to keep current)" : "Secret value"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <Textarea
              placeholder="Optional notes about this credential"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || (!isEdit && !value.trim())}
          >
            {isEdit ? "Update Credential" : "Save Credential"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
