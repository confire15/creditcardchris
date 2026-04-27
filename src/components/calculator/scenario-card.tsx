"use client";

import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

type ScenarioCardProps = {
  label: string;
  monthlyDelta: number;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  selected: boolean;
  onSelect: () => void;
};

export function ScenarioCard({
  label,
  monthlyDelta,
  icon: Icon,
  selected,
  onSelect,
}: ScenarioCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-start gap-3 w-full text-left",
        "rounded-2xl border p-4 sm:p-5 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary ring-inset animate-[pop-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          : "border-border bg-card hover:border-primary/40 hover:bg-overlay-hover hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      <div className="flex items-center gap-3 w-full">
        {Icon ? (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm sm:text-base break-words">{label}</div>
        </div>
        <div
          className={cn(
            "font-mono tabular-nums text-sm sm:text-base font-semibold shrink-0 whitespace-nowrap",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          +${monthlyDelta}
          <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
        </div>
      </div>
    </button>
  );
}
