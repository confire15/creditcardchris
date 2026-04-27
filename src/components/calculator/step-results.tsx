"use client";

import type { CalculatorState } from "./calculator-types";
import type { PremiumCard } from "./premium-cards";
import { computeEaf, ResultsMath } from "./results-math";
import { SpendSlider } from "./spend-slider";
import { CardMockup } from "./card-mockup";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type StepResultsProps = {
  state: CalculatorState;
  card: PremiumCard;
  onSetSpendMultiplier: (value: number) => void;
  onRestart: () => void;
};

export function StepResults({
  state,
  card,
  onSetSpendMultiplier,
  onRestart,
}: StepResultsProps) {
  const breakdown = computeEaf(state, card);
  const { eaf, isProfit } = breakdown;
  const displayValue = formatCurrency(Math.abs(eaf));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 5 · The real number
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          {isProfit
            ? `${card.shortName}: you're in the green.`
            : `${card.shortName}: effective annual fee.`}
        </h2>
      </header>

      <div className="flex items-center gap-4">
        <div className="w-32 shrink-0 sm:w-36">
          <CardMockup card={card} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug break-words">{card.name}</div>
          <div className="text-xs text-muted-foreground break-words">
            Sticker AF{" "}
            <span className="whitespace-nowrap tabular-nums">
              {formatCurrency(card.annualFee)}
            </span>{" "}
            · {card.rewardUnit}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl p-7 sm:p-10 text-center space-y-5",
          isProfit
            ? "bg-emerald-950/40 shadow-[0_0_0_1px_oklch(0.7_0.17_160/0.2),0_8px_32px_oklch(0_0_0/0.4)]"
            : "bg-card shadow-[0_8px_32px_oklch(0_0_0/0.4)]",
        )}
      >
        <div className="text-xs text-muted-foreground/60 line-through font-mono tabular-nums tracking-wide">
          {formatCurrency(card.annualFee)} sticker fee
        </div>

        <div
          key={`${eaf.toFixed(2)}-${isProfit}`}
          className={cn(
            "font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tabular-nums tracking-tight leading-none break-keep whitespace-nowrap",
            "animate-[pop-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]",
            isProfit
              ? "text-emerald-400"
              : "text-foreground",
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {isProfit ? "+" : ""}
          {displayValue}
        </div>

        <div className="text-sm font-medium">
          {isProfit ? (
            <span className="text-emerald-400">
              You come out ahead. This card pays you.
            </span>
          ) : (
            <span className="text-muted-foreground">
              Effective annual fee after credits &amp; rewards.
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm shadow-black/30 p-5 space-y-4">
        <ResultsMath breakdown={breakdown} />
      </div>

      <div className="rounded-2xl bg-card shadow-sm shadow-black/30 p-5">
        <SpendSlider value={state.spendMultiplier} onChange={onSetSpendMultiplier} />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Start over
      </button>
    </div>
  );
}
