"use client";

import { formatCurrency } from "@/lib/utils/format";
import { getMultiplierForCategory, getRewardUnit } from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { SpendingCategory } from "@/lib/types/database";
import { Lock, DollarSign, Gift, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type CardAnalysis } from "./keep-or-cancel-page";

export function ValueBreakdown({
  analysis,
  isPremium,
  categories,
  categorySpend,
  onSpendChange,
  onToggleCredit,
}: {
  analysis: CardAnalysis;
  isPremium: boolean;
  categories: SpendingCategory[];
  categorySpend: Record<string, number>;
  onSpendChange: (categoryId: string, amount: number) => void;
  onToggleCredit: (creditId: string) => void;
}) {
  const { card, annualFee, benefitsValue, credits, perks, rewardsValue, totalValue } = analysis;
  const rewardUnit = getRewardUnit(card);
  const cpp = getDefaultCpp(rewardUnit);
  const baseRate = card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1;

  // Bonus categories for this card (earn above base rate)
  const bonusCategories = categories.filter(
    (cat) => getMultiplierForCategory(card, cat.id) > baseRate
  );

  // Categories where user has stated spend > 0
  const categoriesWithSpend = categories.filter((cat) => (categorySpend[cat.id] ?? 0) > 0);

  return (
    <div className="px-4 sm:px-5 py-4 space-y-4">
      {/* Summary row — 2 columns: Annual Fee + Benefits */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* Bonus category spending — visible to all users */}
      {bonusCategories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            Estimated Annual Spending
          </h4>
          {bonusCategories.map((cat) => {
            const mult = getMultiplierForCategory(card, cat.id);
            const spend = categorySpend[cat.id] ?? 0;
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">{cat.display_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">({mult}x)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={spend || ""}
                      onChange={(e) => onSpendChange(cat.id, parseFloat(e.target.value) || 0)}
                      className="pl-6 h-7 text-xs text-right"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-5">/yr</span>
                </div>
              </div>
            );
          })}
          {bonusCategories.every((cat) => (categorySpend[cat.id] ?? 0) === 0) && (
            <p className="text-[10px] text-muted-foreground italic">Enter your annual spend above to see reward estimates in your verdict.</p>
          )}
        </div>
      )}

      {/* Detailed breakdown - premium only */}
      {isPremium ? (
        <div className="space-y-3">
          {/* Benefits detail (credits w/ toggles + perks) */}
          {(credits.length > 0 || perks.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Gift className="w-3 h-3" />
                Benefits
                <span className="text-[10px] font-normal text-muted-foreground/60">tap to toggle</span>
              </h4>
              <div className="space-y-0.5">
                {credits.map((credit) => (
                  <button
                    key={credit.id}
                    onClick={() => onToggleCredit(credit.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 py-1.5 text-left transition-opacity",
                      !credit.will_use && "opacity-40"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      credit.will_use ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )}>
                      {credit.will_use && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <span className={cn("text-sm flex-1 truncate", !credit.will_use && "line-through text-muted-foreground")}>
                      {credit.name}
                    </span>
                    <span className={cn("text-sm font-medium flex-shrink-0 ml-1", !credit.will_use && "text-muted-foreground/50")}>
                      {formatCurrency(credit.annual_amount)}
                    </span>
                  </button>
                ))}
                {perks.map((perk) => (
                  <div key={perk.id} className="flex items-center gap-2.5 py-1.5">
                    <div className="w-4 h-4 rounded border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground flex-1 truncate">{perk.name}</span>
                    <span className="text-sm font-medium flex-shrink-0 ml-1">
                      {perk.annual_value ? formatCurrency(perk.annual_value) : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-category rewards projection — only when spend data exists */}
          {categoriesWithSpend.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3 h-3" />
                Bonus Rewards
                <span className="text-[10px] font-normal">({cpp.toFixed(1)} cpp)</span>
              </h4>
              <div className="space-y-1">
                {categoriesWithSpend.map((cat) => {
                  const annual = categorySpend[cat.id] ?? 0;
                  const mult = getMultiplierForCategory(card, cat.id);
                  const value = annual * mult * (cpp / 100);
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-sm py-0.5">
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
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm font-semibold">
            <span>Total Value</span>
            <span className="text-emerald-500">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm font-semibold">Full breakdown — Premium</p>
          </div>
          <ul className="space-y-1.5 pl-1">
            {[
              "Credit-by-credit detail with will-use toggles",
              "Per-category rewards projection",
              "Total value calculation",
            ].map((item) => (
              <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/settings" className="text-xs font-semibold text-primary hover:underline block">
            Upgrade for $3.99/mo →
          </Link>
        </div>
      )}
    </div>
  );
}
