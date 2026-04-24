"use client";

import { analyzeCardSimple } from "@/lib/utils/card-analysis";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { DashboardSectionProps } from "@/lib/types/dashboard";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = DashboardSectionProps;

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("en-US");

export function WalletScorecard({ cards, credits, perks, categories, globalSpend }: Props) {
  const annualFeeCards = cards.filter(
    (c) => (c.custom_annual_fee ?? c.card_template?.annual_fee ?? 0) > 0
  );

  const analyses = annualFeeCards.map((card) =>
    analyzeCardSimple(card, credits, perks, categories, globalSpend)
  );

  const totalCreditsValue = analyses.reduce((s, a) => s + a.creditsValue, 0);
  const totalPerksValue = analyses.reduce((s, a) => s + a.perksValue, 0);
  const totalRewardsValue = analyses.reduce((s, a) => s + a.rewardsValue, 0);
  const totalFees = analyses.reduce((s, a) => s + a.annualFee, 0);
  const totalAnnualValue = totalCreditsValue + totalPerksValue + totalRewardsValue - totalFees;

  // Only count credits the user plans to use (will_use !== false)
  const activeCredits = credits.filter((c) => c.will_use !== false);
  const totalCreditsPotential = activeCredits.reduce((s, c) => s + c.annual_amount, 0);
  const totalCreditsUsed = activeCredits.reduce((s, c) => s + c.used_amount, 0);
  const creditsPct = totalCreditsPotential > 0 ? Math.round((totalCreditsUsed / totalCreditsPotential) * 100) : 0;

  const keepCount = analyses.filter((a) => a.verdict === "keep").length;
  const cancelCount = analyses.filter((a) => a.verdict === "cancel").length;
  const closeCount = analyses.filter((a) => a.verdict === "close_call").length;

  const tileBase = "min-h-[104px] bg-card shadow-sm shadow-black/20 border border-border/50 border-l-[3px] rounded-2xl px-3 py-3.5 overflow-hidden flex flex-col justify-between transition-colors";

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Total Annual Value */}
      <Link
        href="/keep-or-cancel"
        className={cn(tileBase, totalAnnualValue >= 0 ? "border-l-emerald-500 hover:bg-card/80" : "border-l-red-500 hover:bg-card/80")}
      >
        <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Annual Value</p>
        <p className={`text-[1.65rem] leading-none sm:text-3xl font-bold tabular-nums ${totalAnnualValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {totalAnnualValue >= 0 ? "+" : "-"}$<AnimatedNumber value={Math.round(Math.abs(totalAnnualValue))} />
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {annualFeeCards.length > 0 ? `${annualFeeCards.length} fee card${annualFeeCards.length !== 1 ? "s" : ""}` : `${cards.length} card${cards.length !== 1 ? "s" : ""}`}
        </p>
      </Link>

      {/* Credits Used */}
      <Link
        href="/benefits"
        className={cn(tileBase, "border-l-primary hover:bg-card/80")}
      >
        <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Credits Used</p>
        <p className="text-[1.65rem] leading-none sm:text-3xl font-bold tabular-nums text-primary">
          $<AnimatedNumber value={Math.round(totalCreditsUsed)} />
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {creditsPct}% of ${fmt(totalCreditsPotential)}
        </p>
      </Link>

      {/* Verdicts */}
      <Link
        href="/keep-or-cancel"
        className={cn(tileBase, "border-l-transparent hover:bg-card/80")}
      >
        <p className="text-[11px] font-semibold leading-tight text-muted-foreground">Verdicts</p>
        {annualFeeCards.length > 0 ? (
          <>
            <p className="text-[1.65rem] leading-none sm:text-3xl font-bold tabular-nums whitespace-nowrap">
              <span className="text-emerald-400">{keepCount}K</span>
              <span className="text-muted-foreground/40 mx-0.5">·</span>
              <span className="text-red-400">{cancelCount}C</span>
              {closeCount > 0 && (
                <>
                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                  <span className="text-amber-400">{closeCount}?</span>
                </>
              )}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {cards.length} card{cards.length !== 1 ? "s" : ""} total
            </p>
          </>
        ) : (
          <>
            <p className="text-[1.65rem] leading-none sm:text-3xl font-bold tabular-nums">{cards.length}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              no annual fees
            </p>
          </>
        )}
      </Link>
    </div>
  );
}
