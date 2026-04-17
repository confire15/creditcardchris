"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { UtilizationModal } from "./utilization-modal";
import type { PremiumCardCredit } from "./premium-cards";
import { formatCurrency } from "@/lib/utils/format";

type CreditToggleProps = {
  credit: PremiumCardCredit;
  /** undefined = user hasn't touched this yet. */
  utilization: number | undefined;
  onChange: (value: number) => void;
};

function labelFor(util: number | undefined): {
  text: string;
  tone: "off" | "partial" | "full";
} {
  if (util === undefined) return { text: "Tap to set", tone: "off" };
  if (util === 0) return { text: "Skipping", tone: "off" };
  if (util < 1) return { text: `${Math.round(util * 100)}% used`, tone: "partial" };
  return { text: "Already using", tone: "full" };
}

export function CreditToggle({
  credit,
  utilization,
  onChange,
}: CreditToggleProps) {
  const [open, setOpen] = useState(false);
  const Icon = credit.icon;
  const label = labelFor(utilization);
  const applied = (utilization ?? 0) * credit.amount;
  const isActive = (utilization ?? 0) > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-pressed={isActive}
        className={cn(
          "w-full flex items-center gap-4 text-left rounded-2xl border p-4 transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "border-primary bg-primary/10"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            isActive
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm sm:text-base break-words">
            {credit.name}
          </div>
          <div className="text-xs font-mono tabular-nums text-muted-foreground mt-0.5">
            {formatCurrency(credit.amount)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {credit.copy}
          </div>
        </div>
        <div className="shrink-0 text-right w-[84px]">
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.14em] font-semibold",
              label.tone === "full" && "text-emerald-400",
              label.tone === "partial" && "text-primary",
              label.tone === "off" && "text-muted-foreground",
            )}
          >
            {label.text}
          </div>
          {applied > 0 && (
            <div className="text-xs font-mono tabular-nums text-emerald-400 mt-0.5">
              +{formatCurrency(applied)}
            </div>
          )}
        </div>
      </button>

      <UtilizationModal
        open={open}
        onOpenChange={setOpen}
        onResolve={onChange}
        creditName={credit.name}
      />
    </>
  );
}
