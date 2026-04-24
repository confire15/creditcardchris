"use client";

import { useState } from "react";
import { UserCard, SpendingCategory } from "@/lib/types/database";
import { rankCardsForCategory, getCardName, getCardColor } from "@/lib/utils/rewards";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/constants/categories";
import { DEFAULT_MONTHLY_SPEND } from "@/lib/constants/default-spend";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const top3 = ranked.slice(0, 3);

  if (cards.length === 0 || rankedCategories.length === 0) return null;

  const rankStyles = [
    { badge: "text-primary font-bold", multiplier: "bg-primary/[0.12] text-primary text-base font-bold" },
    { badge: "text-muted-foreground font-semibold", multiplier: "bg-muted/60 text-foreground text-sm font-semibold" },
    { badge: "text-muted-foreground/60 font-medium", multiplier: "bg-muted/40 text-muted-foreground text-sm font-medium" },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Best Card For...
        </h2>
        <Link href="/best-card" className="flex h-8 items-center rounded-full px-2 text-sm text-primary font-medium hover:bg-primary/[0.08]">
          See all
        </Link>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch]">
        {rankedCategories.map((cat) => {
          const isSelected = cat.id === selectedCatId;
          const color = CATEGORY_COLORS[cat.name] ?? "#9ca3af";
          const Icon = CATEGORY_ICONS[cat.icon ?? ""] ?? null;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={cn(
                "flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-all duration-200",
                isSelected
                  ? "border-primary/40 bg-primary/[0.12] text-foreground shadow-sm shadow-primary/10"
                  : "border-border/50 bg-muted/25 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />}
              {cat.display_name}
            </button>
          );
        })}
      </div>

      {/* Ranked results */}
      {top3.length > 0 && (
        <div className="divide-y divide-border/40 border-t border-border/40">
          {top3.map((result, i) => {
            const style = rankStyles[i];
            return (
              <div key={result.card.id} className="px-4 py-3 flex items-center gap-3">
                <span className={cn("w-5 text-center text-sm flex-shrink-0 tabular-nums", style.badge)}>
                  {i + 1}
                </span>
                <div
                  className="w-8 h-5 rounded flex-shrink-0 shadow-sm shadow-black/20"
                  style={{ backgroundColor: getCardColor(result.card) }}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("leading-tight truncate", i === 0 ? "text-sm font-semibold" : "text-sm font-medium text-muted-foreground")}>
                    {getCardName(result.card)}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 flex-shrink-0", style.multiplier)}>
                  {result.multiplier}x
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
