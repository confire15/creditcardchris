"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UtilizationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (utilization: number) => void;
  creditName: string;
};

/**
 * Generic "are you actually going to use this credit?" disambiguator.
 * Used by every credit toggle on Step 4 Reality Check.
 */
export function UtilizationModal({
  open,
  onOpenChange,
  onResolve,
  creditName,
}: UtilizationModalProps) {
  function handleChoose(value: number) {
    onResolve(value);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Real talk.</DialogTitle>
          <DialogDescription className="text-base text-foreground/90">
            How honestly will you use the {creditName}?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            className="justify-start h-auto py-4 flex-col items-start gap-0.5"
            onClick={() => handleChoose(1.0)}
          >
            <span className="font-semibold text-base">Already using it</span>
            <span className="text-xs opacity-90 font-normal">
              Count the full amount — this is guaranteed money.
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="justify-start h-auto py-4 flex-col items-start gap-0.5"
            onClick={() => handleChoose(0.3)}
          >
            <span className="font-semibold text-base">I plan to</span>
            <span className="text-xs text-muted-foreground font-normal">
              We&apos;ll credit ~30%. Be honest with yourself.
            </span>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="justify-start h-auto py-4 flex-col items-start gap-0.5"
            onClick={() => handleChoose(0)}
          >
            <span className="font-semibold text-base">Skip it</span>
            <span className="text-xs text-muted-foreground font-normal">
              Zero out — won&apos;t change behavior just for points.
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
