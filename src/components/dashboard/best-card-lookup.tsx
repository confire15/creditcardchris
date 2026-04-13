"use client";

import { useState } from "react";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { rankCardsForCategory, getCardName, getCardColor } from "@/lib/utils/rewards";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/constants/categories";
import { DEFAULT_MONTHLY_SPEND } from "@/lib/constants/default-spend";
import { Sparkles } from "lucide-react";
import Link from "next/link";

type Props = {
  cards: UserCard[];
  categories: SpendingCategory[];
  globalSpend: Record<string, number>;
};

export function BestCardLookup({ cards, categories, globalSpend }: Props) {
  // Sort categories by user spend (or default spend as fallback)
  const rankedCategories = categories
    .map((cat) => ({
      cat,
      spend: globalSpend[cat.id] ?? (DEFAULT_MONTHLY_SPEND[cat.name] ?? 0) * 12,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 6)
    .map((r) => r.cat);

  const [selectedCatId, setSelectedCatId] = useState<string>(rankedCategories[0]?.id ?? "");

  const ranked = selectedCatId ? rankCardsForCategory(cards, selectedCatId) : [];
  const best = ranked[0];

  if (cards.length === 0 || rankedCategories.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Best Card For...
        </h2>
        <Link href="/best-card" className="text-xs text-primary font-medium hover:underline">
          See all
        </Link>
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {rankedCategories.map((cat) => {
          const isSelected = cat.id === selectedCatId;
          const color = CATEGORY_COLORS[cat.name] ?? "#9ca3af";
          const Icon = CATEGORY_ICONS[cat.icon ?? ""] ?? null;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                isSelected
                  ? "border-primary/30 bg-primary/[0.08] text-foreground"
                  : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />}
              {cat.display_name}
            </button>
          );
        })}
      </div>

      {/* Best card result */}
      {best && (
        <div className="px-4 py-3 border-t border-border/40 flex items-center gap-3">
          <div
            className="w-8 h-5 rounded-md flex-shrink-0"
            style={{ backgroundColor: getCardColor(best.card) }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getCardName(best.card)}</p>
            <p className="text-xs text-muted-foreground">{best.rewardUnit}</p>
          </div>
          <span className="text-sm font-bold text-primary">{best.multiplier}x</span>
        </div>
      )}
    </div>
  );
}
