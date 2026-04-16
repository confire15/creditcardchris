"use client";

import type { CalculatorState } from "./calculator-types";
import { ANNUAL_FEE } from "./calculator-types";
import { computeEaf, ResultsMath } from "./results-math";
import { SpendSlider } from "./spend-slider";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type StepResultsProps = {
  state: CalculatorState;
  onSetSpendMultiplier: (value: number) => void;
  onRestart: () => void;
};

export function StepResults({
  state,
  onSetSpendMultiplier,
  onRestart,
}: StepResultsProps) {
  const breakdown = computeEaf(state);
  const { eaf, isProfit } = breakdown;
  const displayValue = formatCurrency(Math.abs(eaf));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 4 · The real number
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          {isProfit ? "You're in the green." : "Here's the effective annual fee."}
        </h2>
      </header>

      <div
        className={cn(
          "rounded-2xl border bg-card p-6 sm:p-8 text-center space-y-4",
          isProfit
            ? "border-emerald-500/40 glow-primary"
            : "border-border",
        )}
      >
        <div className="text-sm text-muted-foreground line-through font-mono tabular-nums">
          {formatCurrency(ANNUAL_FEE)} sticker fee
        </div>

        <div
          key={`${eaf.toFixed(2)}-${isProfit}`}
          className={cn(
            "font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tabular-nums tracking-tight",
            "animate-[pop-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]",
            isProfit
              ? "text-emerald-400 [text-shadow:0_0_24px_oklch(0.7_0.17_160/0.45)]"
              : "text-foreground",
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {isProfit ? "+" : ""}
          {displayValue}
        </div>

        <div className="text-sm">
          {isProfit ? (
            <span className="text-emerald-400 font-medium">
              You come out ahead. This card pays you.
            </span>
          ) : (
            <span className="text-muted-foreground">
              Effective annual fee after credits &amp; rewards.
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
        <ResultsMath breakdown={breakdown} />
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5">
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
