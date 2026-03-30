import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RefreshContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onKeepExisting: () => void;
}

/**
 * Placeholder for Plan 02's RefreshContextDialog.
 * This minimal implementation provides the correct interface so Plan 03's
 * OpenAiButton integration compiles. Plan 02 will replace this with the
 * full implementation.
 */
export function RefreshContextDialog({
  open,
  onOpenChange,
  onRefresh,
  onKeepExisting,
}: RefreshContextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refresh AI Context?</DialogTitle>
          <DialogDescription>
            An AI session is already running for this project. You can refresh
            its context (the current session will be closed) or keep using the
            existing session.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onKeepExisting}>
            Keep Existing
          </Button>
          <Button onClick={onRefresh}>Refresh Context</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
