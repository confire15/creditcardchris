"use client";

import { cn } from "@/lib/utils";
import { CardMockup } from "./card-mockup";
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
                "text-left rounded-2xl border p-3 sm:p-4 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5",
              )}
            >
              <CardMockup card={card} size="sm" className="mb-3" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm leading-snug">{card.name}</div>
                  <div className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                    {card.tagline}
                  </div>
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                  {formatCurrency(card.annualFee)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
