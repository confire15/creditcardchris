"use client";

import { useState } from "react";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Copy, Check, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { type CardAnalysis } from "@/lib/utils/card-analysis";

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
  const { card, annualFee, netValue, verdict, credits, benefitsValue, rewardsValue } = analysis;
  const totalValue = benefitsValue + rewardsValue;
  const verdictReason = verdict === "keep"
    ? `$${Math.round(totalValue).toLocaleString()} in value vs $${Math.round(annualFee).toLocaleString()} fee`
    : verdict === "cancel"
    ? `Only extracting $${Math.round(totalValue).toLocaleString()} from a $${Math.round(annualFee).toLocaleString()} fee`
    : netValue >= 0
    ? `Barely worth it — $${Math.round(netValue).toLocaleString()} ahead`
    : `Close — $${Math.abs(Math.round(netValue)).toLocaleString()} short of breaking even`;
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
  const daysUntilFee = card.annual_fee_date
    ? differenceInDays(parseISO(card.annual_fee_date), new Date())
    : null;
  const isUrgent = daysUntilFee !== null && daysUntilFee <= 30;
  const isCritical = daysUntilFee !== null && daysUntilFee <= 7;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      className="w-full flex gap-3 px-4 sm:px-5 py-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
    >
      {/* Verdict color indicator */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: INDICATOR_COLOR[verdict] }}
      />

      {/* Card color chip */}
      <div
        className="w-10 h-6 rounded-lg flex-shrink-0 shadow-sm mt-0.5"
        style={{ backgroundColor: getCardColor(card) }}
      />

      {/* Content: name row + detail row */}
      <div className="flex-1 min-w-0">
        {/* Row 1: card name + verdict badge + copy + chevron */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm leading-snug flex-1 min-w-0">{getCardName(card)}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={`text-xs font-bold ${config.className}`}>
              {config.label}
            </Badge>
            <button
              onClick={handleCopy}
              className="hidden sm:flex p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title="Copy summary"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Verdict reason */}
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic leading-tight">{verdictReason}</p>

        {/* Row 2: fee · net · credits · date — single line, truncates cleanly */}
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span>${Math.round(annualFee).toLocaleString()}/yr</span>
          <span className="text-muted-foreground/40">·</span>
          <span className={`font-semibold ${netValue >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {netValue >= 0 ? "+" : "-"}${Math.abs(Math.round(netValue)).toLocaleString()} net
          </span>
          {credits.length > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{creditsUsed}/{credits.length} cr</span>
            </>
          )}
          {feeDate && (
            <>
              <span className="text-muted-foreground/40">·</span>
              {isUrgent ? (
                <span className={`inline-flex items-center gap-0.5 font-semibold ${isCritical ? "text-red-400" : "text-amber-400"}`}>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {daysUntilFee! <= 0 ? "Due today" : `Due in ${daysUntilFee}d`}
                </span>
              ) : (
                <span>Due {feeDate}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
