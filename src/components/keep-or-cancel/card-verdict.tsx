"use client";

import { useState } from "react";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
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
  const { card, annualFee, netValue, verdict, credits } = analysis;
  const creditsUsed = credits.filter((c) => c.will_use).length;
  const config = VERDICT_CONFIG[verdict];
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    const text = `${getCardName(card)}: ${config.label} · ${netValue >= 0 ? "+" : ""}${formatCurrency(netValue)} net value`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const INDICATOR_COLOR = {
    keep: "#22c55e",
    cancel: "#ef4444",
    close_call: "#f59e0b",
  };

  const feeDate = card.annual_fee_date
    ? format(parseISO(card.annual_fee_date), "MMM d")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
    >
      {/* Verdict color indicator */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: INDICATOR_COLOR[verdict] }}
      />

      {/* Card color chip */}
      <div
        className="w-10 h-6 rounded-lg flex-shrink-0 shadow-sm"
        style={{ backgroundColor: getCardColor(card) }}
      />

      {/* Card name + fee · net value · due date */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{getCardName(card)}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{formatCurrency(annualFee)}/yr</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className={`text-xs font-semibold ${netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {netValue >= 0 ? "+" : ""}{formatCurrency(netValue)} net
          </span>
          {credits.length > 0 && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">{creditsUsed}/{credits.length} credits</span>
            </>
          )}
          {feeDate && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">Due {feeDate}</span>
            </>
          )}
        </div>
      </div>

      {/* Verdict badge + copy + chevron */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleCopy}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          title="Copy summary"
        >
          {copied
            ? <Check className="w-3.5 h-3.5 text-emerald-500" />
            : <Copy className="w-3.5 h-3.5" />}
        </button>
        <Badge variant="outline" className={`text-xs font-bold ${config.className}`}>
          {config.label}
        </Badge>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
