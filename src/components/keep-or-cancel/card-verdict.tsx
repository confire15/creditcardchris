"use client";

import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type CardAnalysis } from "./keep-or-cancel-page";

const VERDICT_CONFIG = {
  keep: { label: "KEEP", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  cancel: { label: "CANCEL", className: "bg-red-500/15 text-red-500 border-red-500/30" },
  close_call: { label: "CLOSE CALL", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
};

export function CardVerdict({
  analysis,
  isExpanded,
  onToggle,
}: {
  analysis: CardAnalysis;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { card, annualFee, netValue, verdict } = analysis;
  const config = VERDICT_CONFIG[verdict];

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-muted/30 transition-colors text-left"
    >
      {/* Card color chip */}
      <div
        className="w-10 h-6 rounded-lg flex-shrink-0 shadow-sm"
        style={{ backgroundColor: getCardColor(card) }}
      />

      {/* Card name + fee · net value */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{getCardName(card)}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">{formatCurrency(annualFee)}/yr</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className={`text-xs font-semibold ${netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {netValue >= 0 ? "+" : ""}{formatCurrency(netValue)} net
          </span>
        </div>
      </div>

      {/* Verdict badge + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={`text-xs font-bold ${config.className}`}>
          {config.label}
        </Badge>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}
