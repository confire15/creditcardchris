"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type EquinoxModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (utilization: number) => void;
};

export function EquinoxModal({ open, onOpenChange, onResolve }: EquinoxModalProps) {
  function handleChoose(value: number) {
    onResolve(value);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Hold up.</DialogTitle>
          <DialogDescription className="text-base text-foreground/90">
            Are you already paying for Equinox, or is this the year you swear you&apos;ll start?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            className="justify-start h-auto py-4 flex-col items-start gap-0.5"
            onClick={() => handleChoose(1.0)}
          >
            <span className="font-semibold text-base">Already a member</span>
            <span className="text-xs opacity-90 font-normal">
              Count the full $300 — this is guaranteed money.
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="justify-start h-auto py-4 flex-col items-start gap-0.5"
            onClick={() => handleChoose(0.3)}
          >
            <span className="font-semibold text-base">I plan to go</span>
            <span className="text-xs text-muted-foreground font-normal">
              We&apos;ll credit ~30% — be honest with yourself.
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
