"use client";

import { analyzeCardSimple } from "@/lib/utils/card-analysis";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { DashboardSectionProps } from "@/lib/types/dashboard";

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

  const totalCreditsPotential = credits.reduce((s, c) => s + c.annual_amount, 0);
  const totalCreditsUsed = credits.reduce((s, c) => s + c.used_amount, 0);
  const creditsPct = totalCreditsPotential > 0 ? Math.round((totalCreditsUsed / totalCreditsPotential) * 100) : 0;

  const keepCount = analyses.filter((a) => a.verdict === "keep").length;
  const cancelCount = analyses.filter((a) => a.verdict === "cancel").length;
  const closeCount = analyses.filter((a) => a.verdict === "close_call").length;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {/* Total Annual Value */}
      <div className={`bg-card shadow-sm shadow-black/30 border-l-[3px] ${totalAnnualValue >= 0 ? "border-l-emerald-500" : "border-l-red-500"} rounded-2xl px-3 py-3.5 overflow-hidden`}>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5 truncate">Annual Value</p>
        <p className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${totalAnnualValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {totalAnnualValue >= 0 ? "+" : "-"}$<AnimatedNumber value={Math.round(Math.abs(totalAnnualValue))} />
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {annualFeeCards.length > 0 ? `${annualFeeCards.length} fee card${annualFeeCards.length !== 1 ? "s" : ""}` : `${cards.length} card${cards.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Credits Used */}
      <div className="bg-card shadow-sm shadow-black/30 border-l-[3px] border-l-primary rounded-2xl px-3 py-3.5 overflow-hidden">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5 truncate">Credits Used</p>
        <p className="text-xl sm:text-2xl font-bold tabular-nums text-primary truncate">
          $<AnimatedNumber value={Math.round(totalCreditsUsed)} />
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {creditsPct}% of ${fmt(totalCreditsPotential)}
        </p>
      </div>

      {/* Verdicts */}
      <div className="bg-card shadow-sm shadow-black/30 rounded-2xl px-3 py-3.5 overflow-hidden">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5 truncate">Verdicts</p>
        {annualFeeCards.length > 0 ? (
          <>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">
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
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {cards.length} card{cards.length !== 1 ? "s" : ""} total
            </p>
          </>
        ) : (
          <>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{cards.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              no annual fees
            </p>
          </>
        )}
      </div>
    </div>
  );
}
