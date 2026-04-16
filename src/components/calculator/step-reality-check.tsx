"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EquinoxModal } from "./equinox-modal";
import { Dumbbell, Check } from "lucide-react";

type StepRealityCheckProps = {
  equinoxToggled: boolean;
  utilizationFactor: number;
  onToggleEquinox: (toggled: boolean) => void;
  onSetUtilization: (value: number) => void;
  onContinue: () => void;
};

export function StepRealityCheck({
  equinoxToggled,
  utilizationFactor,
  onToggleEquinox,
  onSetUtilization,
  onContinue,
}: StepRealityCheckProps) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleToggle(next: boolean) {
    if (next) {
      onToggleEquinox(true);
      setModalOpen(true);
    } else {
      onToggleEquinox(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 3 · Reality check
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          The card everyone loves to hate.
        </h2>
        <p className="text-sm text-muted-foreground">
          A $695 annual fee. The internet is mad. Let&apos;s see what&apos;s actually on the table.
        </p>
      </header>

      <div
        className="relative mx-auto max-w-md aspect-[1.586/1] rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.22 0.02 260) 0%, oklch(0.13 0.02 260) 60%, oklch(0.18 0.03 260) 100%)",
          boxShadow:
            "0 24px 48px -16px oklch(0 0 0 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
        }}
      >
        <div className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, oklch(0.62 0.15 42 / 0.25), transparent 60%), radial-gradient(circle at 80% 90%, oklch(0.58 0.19 250 / 0.25), transparent 60%)",
          }}
        />
        <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                Premium Charge Card
              </div>
              <div className="text-lg sm:text-xl font-semibold mt-1">Platinum Tier</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
                Annual Fee
              </div>
              <div className="text-xl sm:text-2xl font-mono tabular-nums font-bold mt-1">
                $695
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="font-mono tracking-[0.2em] text-xs sm:text-sm opacity-80">
              •••• •••• •••• 1895
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
              Cardholder
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Credits attached to this card
        </h3>

        <button
          type="button"
          aria-pressed={equinoxToggled}
          onClick={() => handleToggle(!equinoxToggled)}
          className={cn(
            "w-full flex items-center gap-4 text-left rounded-2xl border p-4 transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            equinoxToggled
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/40",
          )}
        >
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              equinoxToggled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Dumbbell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm sm:text-base">$300 Equinox Gym Credit</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {equinoxToggled
                ? utilizationFactor === 1
                  ? "Already a member — counting the full $300."
                  : utilizationFactor === 0.3
                    ? "Aspirational — crediting about 30%."
                    : "Tap again to tell us how you'll use it."
                : "Tap to include this credit in your math."}
            </div>
          </div>
          <div
            className={cn(
              "w-11 h-6 rounded-full relative transition-colors shrink-0",
              equinoxToggled ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center",
                equinoxToggled ? "left-5" : "left-0.5",
              )}
            >
              {equinoxToggled ? <Check className="w-3 h-3 text-primary" /> : null}
            </span>
          </div>
        </button>
      </div>

      <div className="pt-2">
        <Button
          size="lg"
          onClick={onContinue}
          className="w-full"
        >
          See the real number
        </Button>
      </div>

      <EquinoxModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onResolve={onSetUtilization}
      />
    </div>
  );
}
