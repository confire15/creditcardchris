"use client";

import type { PointValuation } from "./calculator-types";
import { Coins, Plane, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: PointValuation;
  icon: typeof Coins;
  subtitle: string;
};

const OPTIONS: Option[] = [
  {
    label: "Cash-back only",
    subtitle: "1¢ per point. Simple.",
    value: 0.01,
    icon: Coins,
  },
  {
    label: "Mostly travel cards",
    subtitle: "1.5¢ per point. Airline & hotel portals.",
    value: 0.015,
    icon: Plane,
  },
  {
    label: "Transfer partners pro",
    subtitle: "2¢ per point. Sweet-spot redemptions.",
    value: 0.02,
    icon: Gem,
  },
];

type StepSorterProps = {
  selected: PointValuation | null;
  onSelect: (value: PointValuation) => void;
};

export function StepSorter({ selected, onSelect }: StepSorterProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary font-semibold">
          Step 2 · The sorter
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading leading-tight">
          How do you value your rewards?
        </h2>
        <p className="text-sm text-muted-foreground">
          We use this to price your points accurately.
        </p>
      </header>

      <div role="radiogroup" aria-label="Points valuation persona" className="space-y-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(opt.value)}
              className={cn(
                "w-full flex items-center gap-4 text-left rounded-2xl border p-4 sm:p-5 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary ring-inset"
                  : "border-border bg-card hover:border-primary/40 hover:bg-overlay-hover hover:-translate-y-0.5",
              )}
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">{opt.label}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {opt.subtitle}
                </div>
              </div>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums shrink-0 px-2 py-1 rounded-md",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                {(opt.value * 100).toFixed(opt.value === 0.015 ? 1 : 0)}¢ / pt
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
