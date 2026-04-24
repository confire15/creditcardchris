"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { CalculatorState } from "./calculator-types";
import { PREMIUM_CARDS, type PremiumCard } from "./premium-cards";
import { computeEaf, ResultsMath } from "./results-math";
import { SpendSlider } from "./spend-slider";
import { CardMockup } from "./card-mockup";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type StepResultsProps = {
  state: CalculatorState;
  card: PremiumCard;
  isPremium: boolean;
  onSetSpendMultiplier: (value: number) => void;
  onRestart: () => void;
};

export function StepResults({
  state,
  card,
  isPremium,
  onSetSpendMultiplier,
  onRestart,
}: StepResultsProps) {
  const breakdown = computeEaf(state, card);
  const { eaf, isProfit } = breakdown;
  const displayValue = formatCurrency(Math.abs(eaf));
  const [comparisonIds, setComparisonIds] = useState<string[]>([card.id]);

  useEffect(() => {
    setComparisonIds((prev) => {
      const withoutCurrent = prev.filter((id) => id !== card.id);
      return [card.id, ...withoutCurrent].slice(0, 3);
    });
  }, [card.id]);

  const comparisonRows = useMemo(() => {
    return comparisonIds
      .map((id) => {
        const comparisonCard = PREMIUM_CARDS.find((candidate) => candidate.id === id);
        if (!comparisonCard) return null;
        return {
          card: comparisonCard,
          breakdown: computeEaf(state, comparisonCard),
        };
      })
      .filter((row): row is { card: PremiumCard; breakdown: ReturnType<typeof computeEaf> } => row !== null)
      .sort((a, b) => a.breakdown.eaf - b.breakdown.eaf);
  }, [comparisonIds, state]);

  const baselineEaf =
    comparisonRows.find((row) => row.card.id === card.id)?.breakdown.eaf ?? eaf;

  function toggleComparisonCard(cardId: string) {
    if (cardId === card.id) return;

    setComparisonIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  }

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
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug">{card.name}</div>
          <div className="text-xs text-muted-foreground">
            Sticker AF {formatCurrency(card.annualFee)} · {card.rewardUnit}
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
            "font-heading text-6xl sm:text-7xl lg:text-8xl font-bold tabular-nums tracking-tight leading-none",
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

      <div className="rounded-2xl bg-card shadow-sm shadow-black/30 p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-primary font-semibold">
            Premium comparison
          </p>
          <h3 className="text-lg font-semibold leading-tight">
            Pin 2-3 cards and compare side-by-side
          </h3>
        </div>

        {isPremium ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PREMIUM_CARDS.map((candidate) => {
                const isPinned = comparisonIds.includes(candidate.id);
                const disabled = !isPinned && comparisonIds.length >= 3;

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleComparisonCard(candidate.id)}
                    disabled={disabled}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs border transition-colors",
                      isPinned
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {candidate.shortName}
                    {candidate.id === card.id ? " (current)" : ""}
                  </button>
                );
              })}
            </div>

            {comparisonIds.length < 2 ? (
              <p className="text-xs text-amber-400/90">
                Pin at least one more card to unlock side-by-side results.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {comparisonRows.map((row, index) => {
                  const rowEaf = row.breakdown.eaf;
                  const rowIsProfit = row.breakdown.isProfit;
                  const delta = rowEaf - baselineEaf;
                  const deltaLabel =
                    row.card.id === card.id
                      ? "Current card baseline"
                      : `${delta < 0 ? "Beats" : "Costs"} ${card.shortName} by ${formatCurrency(Math.abs(delta))}`;

                  return (
                    <div
                      key={row.card.id}
                      className={cn(
                        "rounded-xl border p-3 space-y-2",
                        index === 0
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-border bg-background/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-20 shrink-0">
                          <CardMockup card={row.card} size="sm" />
                        </div>
                        {index === 0 && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-400">
                            Best EAF
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{row.card.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Sticker {formatCurrency(row.card.annualFee)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "font-heading text-3xl tabular-nums leading-none",
                          rowIsProfit ? "text-emerald-400" : "text-foreground",
                        )}
                      >
                        {rowIsProfit ? "+" : ""}
                        {formatCurrency(Math.abs(rowEaf))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{deltaLabel}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 z-10 rounded-xl flex flex-col items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium">Card comparison mode with Premium</p>
              <Link href="/settings" className="text-xs text-primary hover:underline font-medium">
                Upgrade for $3.99/mo
              </Link>
            </div>
            <div className="opacity-20 pointer-events-none grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-28 bg-muted rounded-xl" />
              <div className="h-28 bg-muted rounded-xl" />
            </div>
          </div>
        )}
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
