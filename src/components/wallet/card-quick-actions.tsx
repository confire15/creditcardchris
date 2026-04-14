"use client";

import { UserCard, SpendingCategory } from "@/lib/types/database";
import { getCardName, getMultiplierForCategory } from "@/lib/utils/rewards";
import { NicknameEditor } from "./nickname-editor";
import { FeeRenewalPicker } from "./fee-renewal-picker";
import { Archive, ExternalLink } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function CardQuickActions({
  card,
  categories,
  onOpenDetail,
  onArchive,
  onCardUpdated,
}: {
  card: UserCard;
  categories: SpendingCategory[];
  onOpenDetail: () => void;
  onArchive: () => void;
  onCardUpdated: () => void;
}) {
  const baseRate = card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1;
  const topCategories = categories
    .filter((cat) => getMultiplierForCategory(card, cat.id) > baseRate)
    .sort((a, b) => getMultiplierForCategory(card, b.id) - getMultiplierForCategory(card, a.id))
    .slice(0, 3);

  const annualFee = card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
  const daysUntilRenewal = card.annual_fee_date
    ? differenceInDays(parseISO(card.annual_fee_date), new Date())
    : null;

  return (
    <div className="mt-3 rounded-2xl border border-overlay-subtle bg-card/50 backdrop-blur-sm p-4 space-y-4">
      {/* Nickname */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Nickname</p>
        <NicknameEditor card={card} onUpdated={onCardUpdated} />
      </div>

      {/* Fee renewal date */}
      {annualFee > 0 && (
        <FeeRenewalPicker card={card} onUpdated={onCardUpdated} />
      )}

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Top Rewards</p>
          <div className="flex flex-wrap gap-2">
            {topCategories.map((cat) => {
              const mult = getMultiplierForCategory(card, cat.id);
              const rewardUnit = card.card_template?.reward_unit ?? card.custom_reward_unit ?? "x";
              const isCash = rewardUnit === "%" || card.card_template?.reward_type?.toLowerCase().includes("cash");
              return (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.08] border border-primary/20 text-xs font-medium text-primary"
                >
                  {isCash ? `${mult}%` : `${mult}x`}
                  <span className="text-foreground/70">{cat.display_name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Annual fee renewal warning */}
      {daysUntilRenewal !== null && daysUntilRenewal <= 30 && daysUntilRenewal >= 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            ${annualFee} fee due in {daysUntilRenewal === 0 ? "today" : `${daysUntilRenewal} days`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onOpenDetail}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/60 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Edit Details
        </button>
        <button
          onClick={onArchive}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title={`Archive ${getCardName(card)}`}
        >
          <Archive className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
