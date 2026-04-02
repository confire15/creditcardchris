"use client";

import { formatCurrency } from "@/lib/utils/format";
import { getMultiplierForCategory, getRewardUnit } from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { SpendingCategory } from "@/lib/types/database";
import { Lock, DollarSign, Gift } from "lucide-react";
import Link from "next/link";
import { type CardAnalysis } from "./keep-or-cancel-page";

export function ValueBreakdown({
  analysis,
  isPremium,
  categories,
  categorySpend,
  cppOverride,
}: {
  analysis: CardAnalysis;
  isPremium: boolean;
  categories: SpendingCategory[];
  categorySpend: Record<string, number>;
  cppOverride: number | null;
}) {
  const { card, annualFee, benefitsValue, creditsValue, credits, perks, perksValue, rewardsValue, totalValue } = analysis;
  const rewardUnit = getRewardUnit(card);
  const cpp = cppOverride ?? getDefaultCpp(rewardUnit);

  return (
    <div className="px-4 sm:px-5 py-4 space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Annual Fee</p>
          <p className="text-base font-bold text-red-400">-{formatCurrency(annualFee)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Benefits</p>
          <p className="text-base font-bold text-emerald-500">+{formatCurrency(benefitsValue)}</p>
          {credits.some((c) => !c.will_use) && (
            <p className="text-[10px] text-muted-foreground mt-0.5">you plan to use</p>
          )}
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Rewards</p>
          <p className="text-base font-bold text-emerald-500">+{formatCurrency(rewardsValue)}</p>
        </div>
      </div>

      {/* Detailed breakdown - premium only */}
      {isPremium ? (
        <div className="space-y-3">
          {/* Benefits detail (credits + perks merged) */}
          {(credits.length > 0 || perks.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Gift className="w-3 h-3" />
                Benefits
              </h4>
              <div className="space-y-1">
                {credits.map((credit) => (
                  <div
                    key={credit.id}
                    className={`flex items-center justify-between text-sm py-1 ${!credit.will_use ? "opacity-40" : ""}`}
                  >
                    <span className={`truncate mr-2 ${credit.will_use ? "text-muted-foreground" : "line-through text-muted-foreground"}`}>
                      {credit.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!credit.will_use && (
                        <span className="text-[10px] text-muted-foreground">won't use</span>
                      )}
                      <span className={`font-medium ${credit.will_use ? "" : "text-muted-foreground"}`}>
                        {formatCurrency(credit.annual_amount)}
                      </span>
                    </div>
                  </div>
                ))}
                {perks.map((perk) => (
                  <div key={perk.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground truncate mr-2">{perk.name}</span>
                    <span className="font-medium flex-shrink-0">
                      {perk.annual_value ? formatCurrency(perk.annual_value) : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-category rewards projection */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <DollarSign className="w-3 h-3" />
              Projected Rewards by Category
              <span className="text-[10px] font-normal">({cpp.toFixed(1)} cpp)</span>
            </h4>
            <div className="space-y-1">
              {categories
                .filter((cat) => (categorySpend[cat.id] ?? 0) > 0)
                .map((cat) => {
                  const monthly = categorySpend[cat.id] ?? 0;
                  const mult = getMultiplierForCategory(card, cat.id);
                  const value = monthly * 12 * mult * (cpp / 100);
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 text-muted-foreground truncate mr-2">
                        <span>{cat.display_name}</span>
                        <span className="text-[10px]">({mult}x)</span>
                      </div>
                      <span className="font-medium flex-shrink-0">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm font-semibold">
            <span>Total Value</span>
            <span className="text-emerald-500">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 z-10 rounded-xl flex flex-col items-center justify-center gap-2 px-4">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm font-medium text-center">Full breakdown with Premium</p>
            <Link
              href="/settings"
              className="text-xs text-primary hover:underline font-medium"
            >
              Upgrade for $3.99/mo
            </Link>
          </div>
          <div className="opacity-30 pointer-events-none space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
