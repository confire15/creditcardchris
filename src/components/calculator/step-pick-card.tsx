"use client";

import { cn } from "@/lib/utils";
import { PREMIUM_CARDS } from "./premium-cards";
import { formatCurrency } from "@/lib/utils/format";

type StepPickCardProps = {
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
};

export function StepPickCard({
  selectedCardId,
  onSelect,
}: StepPickCardProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 1 · Pick a card
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          Which premium card is on your mind?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick one. We&apos;ll run the real numbers on it.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Premium card options"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {PREMIUM_CARDS.map((card) => {
          const isSelected = selectedCardId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(card.id)}
              className={cn(
                "text-left rounded-2xl border p-4 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary ring-inset"
                  : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                  {card.issuer}
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                  {formatCurrency(card.annualFee)}
                </div>
              </div>
              <div className="font-semibold text-base leading-snug mb-1">
                {card.name}
              </div>
              <div className="text-xs text-muted-foreground leading-snug">
                {card.tagline}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
