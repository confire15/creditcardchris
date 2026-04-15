"use client";

import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { analyzeCardSimple } from "@/lib/utils/card-analysis";
import { Scale } from "lucide-react";
import Link from "next/link";
import type { DashboardSectionProps } from "@/lib/types/dashboard";

type Props = DashboardSectionProps;

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("en-US");

export function WalletBreakdown({ cards, credits, perks, categories, globalSpend }: Props) {
  const annualFeeCards = cards.filter(
    (c) => (c.custom_annual_fee ?? c.card_template?.annual_fee ?? 0) > 0
  );

  if (annualFeeCards.length === 0) return null;

  const analyses = annualFeeCards
    .map((card) => ({
      card,
      ...analyzeCardSimple(card, credits, perks, categories, globalSpend),
    }))
    .sort((a, b) => b.netValue - a.netValue);

  const displayed = analyses.slice(0, 5);

  const verdictClass: Record<string, string> = {
    keep: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    cancel: "bg-red-500/15 text-red-500 border-red-500/30",
    close_call: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  };
  const verdictLabel: Record<string, string> = {
    keep: "KEEP",
    cancel: "CANCEL",
    close_call: "CLOSE",
  };

  return (
    <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Card Value
        </h2>
        <Link href="/keep-or-cancel" className="text-xs text-primary font-medium hover:underline">
          Full analysis
        </Link>
      </div>
      <div className="divide-y divide-border/40">
        {displayed.map(({ card, annualFee, netValue, verdict }) => (
          <div key={card.id} className="flex items-center gap-3 px-4 py-2.5">
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0"
              style={{ backgroundColor: netValue >= 0 ? "#22c55e" : "#ef4444" }}
            />
            <div
              className="w-7 h-[18px] rounded-md flex-shrink-0"
              style={{ backgroundColor: getCardColor(card) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{getCardName(card)}</p>
              <p className="text-[10px] text-muted-foreground">${fmt(annualFee)}/yr</p>
            </div>
            <span className={`flex-shrink-0 text-xs font-semibold ${netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {netValue >= 0 ? "+" : "-"}${fmt(netValue)}
            </span>
            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${verdictClass[verdict]}`}>
              {verdictLabel[verdict]}
            </span>
          </div>
        ))}
      </div>
      {analyses.length > 5 && (
        <div className="px-4 py-2 border-t border-border/40">
          <Link href="/keep-or-cancel" className="text-xs text-primary font-medium hover:underline">
            See all {analyses.length} cards
          </Link>
        </div>
      )}
    </div>
  );
}
