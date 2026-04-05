import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RefreshContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onKeepExisting: () => void;
}

export function RefreshContextDialog({
  open,
  onOpenChange,
  onRefresh,
  onKeepExisting,
}: RefreshContextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Refresh AI Context?</DialogTitle>
          <DialogDescription>
            An AI session is already running for this project. Refreshing will restart the session
            and lose all current context and memory.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onKeepExisting();
              onOpenChange(false);
            }}
          >
            Keep Existing
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onRefresh();
              onOpenChange(false);
            }}
          >
            Refresh Context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
