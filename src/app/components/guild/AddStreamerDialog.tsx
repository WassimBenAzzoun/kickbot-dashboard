import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Plus, RadioTower } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";

interface AddStreamerDialogProps {
  guildName: string;
  isPending: boolean;
  onSubmit: (streamerUsername: string) => Promise<unknown>;
  triggerLabel?: string;
}

export function AddStreamerDialog({
  guildName,
  isPending,
  onSubmit,
  triggerLabel = "Add streamer"
}: AddStreamerDialogProps) {
  const [open, setOpen] = useState(false);
  const [streamerUsername, setStreamerUsername] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedUsername = streamerUsername.trim();
    if (!normalizedUsername) {
      toast.error("Enter a Kick username first.");
      return;
    }

    try {
      await onSubmit(normalizedUsername);
      setStreamerUsername("");
      setOpen(false);
    } catch {
      // Parent mutation handlers show the toast; keep the dialog open for correction.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a tracked streamer</DialogTitle>
          <DialogDescription>
            Start monitoring a Kick creator for <strong>{guildName}</strong>. We will use the existing backend validation rules for duplicates and formatting.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Kick username</label>
            <Input
              autoFocus
              value={streamerUsername}
              placeholder="example_streamer"
              onChange={(event) => setStreamerUsername(event.target.value)}
            />
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <RadioTower className="text-primary" />
              What happens next
            </div>
            The bot will start tracking live state changes for this username and send notifications to the configured Discord alert channel when they go live.
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Save streamer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
