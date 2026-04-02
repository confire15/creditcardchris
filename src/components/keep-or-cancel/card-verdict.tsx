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
      className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-muted/30 transition-colors text-left"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-10 h-6 rounded-lg flex-shrink-0 shadow-sm"
          style={{ backgroundColor: getCardColor(card) }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{getCardName(card)}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(annualFee)}/yr fee
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          <p className={`text-sm font-bold ${netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {netValue >= 0 ? "+" : ""}{formatCurrency(netValue)}
          </p>
          <p className="text-[10px] text-muted-foreground">net value/yr</p>
        </div>
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
