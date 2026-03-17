import { useEffect, useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/stores";
import type { Credential } from "@/lib/types";
import { CredentialDialog } from "./CredentialDialog";

export function CredentialVault() {
  const credentials = useStore((s) => s.credentials);
  const credentialsLoading = useStore((s) => s.credentialsLoading);
  const fetchCredentials = useStore((s) => s.fetchCredentials);
  const revealedCredentialId = useStore((s) => s.revealedCredentialId);
  const revealedValue = useStore((s) => s.revealedValue);
  const revealCredential = useStore((s) => s.revealCredential);
  const hideCredential = useStore((s) => s.hideCredential);
  const deleteCredentialAction = useStore((s) => s.deleteCredential);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCredential, setEditCredential] = useState<Credential | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleCopy = async (id: string) => {
    // Reveal the secret first if not already revealed
    if (revealedCredentialId !== id) {
      await revealCredential(id);
    }
    // Get the value from the store after reveal
    const value = useStore.getState().revealedValue;
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCredentialAction(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAddClick = () => {
    setEditCredential(undefined);
    setDialogOpen(true);
  };

  if (credentialsLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <Button onClick={handleAddClick}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Credential
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold">No credentials stored</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add API keys, tokens, and secrets that plugins can use securely.
          </p>
        </div>
        <CredentialDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          credential={editCredential}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleAddClick}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Credential
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="flex flex-col gap-1">
          {credentials.map((cred) => {
            const isRevealed = revealedCredentialId === cred.id;
            const isCopied = copiedId === cred.id;

            return (
              <div
                key={cred.id}
                className="group flex items-center gap-3 rounded-lg bg-card px-4 py-2 transition-colors duration-100 hover:bg-muted"
              >
                <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {cred.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {cred.credentialType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRevealed && revealedValue ? (
                      <code className="font-mono text-foreground opacity-100 transition-opacity duration-100">
                        {revealedValue}
                      </code>
                    ) : (
                      "Stored securely in system keychain"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      isRevealed ? "Hide credential" : "Reveal credential"
                    }
                    onClick={() =>
                      isRevealed
                        ? hideCredential()
                        : revealCredential(cred.id)
                    }
                  >
                    {isRevealed ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy credential to clipboard"
                    onClick={() => handleCopy(cred.id)}
                  >
                    {isCopied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete credential"
                    className="text-destructive-foreground"
                    onClick={() => setDeleteTarget(cred)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credential={editCredential}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Credential</DialogTitle>
            <DialogDescription>
              This will permanently remove &apos;{deleteTarget?.name}&apos; from
              the vault. Plugins using this credential will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
