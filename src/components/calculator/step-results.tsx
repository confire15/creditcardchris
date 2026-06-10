"use client";

import { useState } from "react";
import type { CalculatorState } from "./calculator-types";
import type { PremiumCard } from "./premium-cards";
import { computeEaf, ResultsMath } from "./results-math";
import { SpendSlider } from "./spend-slider";
import { CardMockup } from "./card-mockup";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Verdict = "keep" | "watch" | "drop";
type Explanation = { verdict: Verdict; headline: string; paragraph: string };

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

  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  async function handleExplain() {
    setExplainLoading(true);
    setExplainError(null);
    try {
      const res = await fetch("/api/agentic/fee-calculator/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: card.name,
          annualFee: breakdown.annualFee,
          creditTotal: breakdown.creditTotal,
          rewardsValue: breakdown.rewardsValue,
          eaf: breakdown.eaf,
          topCredits: breakdown.creditLines
            .filter((line) => line.applied > 0)
            .sort((a, b) => b.applied - a.applied)
            .slice(0, 4)
            .map((line) => ({ name: line.name, applied: line.applied })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Request failed");
      }
      const data = (await res.json()) as Explanation;
      setExplanation(data);
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : "Could not load verdict");
    } finally {
      setExplainLoading(false);
    }
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
              ? "text-emerald-600 dark:text-emerald-400"
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
            <span className="text-emerald-600 dark:text-emerald-400">
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

      <div className="rounded-2xl bg-card shadow-sm shadow-black/30 p-5 space-y-3">
        {explanation ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold uppercase tracking-wide",
                  explanation.verdict === "keep" && "bg-emerald-950/60 text-emerald-300",
                  explanation.verdict === "watch" && "bg-amber-950/60 text-amber-300",
                  explanation.verdict === "drop" && "bg-rose-950/60 text-rose-300",
                )}
              >
                {explanation.verdict}
              </span>
              <span className="text-sm font-semibold leading-snug">{explanation.headline}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{explanation.paragraph}</p>
            <button
              type="button"
              onClick={handleExplain}
              disabled={explainLoading}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {explainLoading ? "Thinking…" : "Re-run verdict"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleExplain}
            disabled={explainLoading}
            className="w-full rounded-xl bg-primary/10 hover:bg-primary/15 disabled:opacity-50 text-primary font-medium text-sm py-3 transition-colors"
          >
            {explainLoading ? "Thinking…" : "Get Chris's verdict"}
          </button>
        )}
        {explainError ? (
          <p className="text-xs text-rose-400" role="alert">
            {explainError}
          </p>
        ) : null}
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
