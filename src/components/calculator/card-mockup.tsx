"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PremiumCard } from "./premium-cards";

/**
 * Lightweight card visual for the calculator. The wallet's CreditCardVisual
 * expects a UserCard row from the DB, which we don't have here - this is
 * purely driven by a PremiumCard catalog entry.
 *
 * Gradient math ported from credit-card-visual.tsx.
 */

function shiftHex(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
const darkenHex = (hex: string, amt = 60) => shiftHex(hex, -Math.abs(amt));
const lightenHex = (hex: string, amt = 24) => shiftHex(hex, Math.abs(amt));

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<
  Size,
  {
    padding: string;
    radius: string;
    chip: string;
    name: string;
    meta: string;
    number: string;
    fee: string;
  }
> = {
  sm: {
    padding: "p-2.5",
    radius: "rounded-xl",
    chip: "h-3.5 w-5 rounded-[4px]",
    name: "text-[11px] leading-tight",
    meta: "text-[8px] leading-none",
    number: "text-[8px]",
    fee: "hidden",
  },
  md: {
    padding: "p-3.5",
    radius: "rounded-xl",
    chip: "h-[1.125rem] w-7 rounded-md",
    name: "text-sm leading-tight",
    meta: "text-[9px] leading-none",
    number: "text-[9px]",
    fee: "inline-flex",
  },
  lg: {
    padding: "p-5 sm:p-6",
    radius: "rounded-2xl",
    chip: "h-6 w-9 rounded-lg",
    name: "text-xl sm:text-2xl leading-tight",
    meta: "text-[10px] leading-none",
    number: "text-[10px]",
    fee: "inline-flex",
  },
};

export const CardMockup = memo(function CardMockup({
  card,
  size = "md",
  className,
}: {
  card: PremiumCard;
  size?: Size;
  className?: string;
}) {
  const color = card.color;
  const styles = sizeStyles[size];
  const deeper = darkenHex(color, 75);
  const deep = darkenHex(color, 35);
  const bright = lightenHex(color, 72);
  const lastFour = String(card.annualFee).padStart(4, "0").slice(-4);

  const mesh = [
    `radial-gradient(85% 70% at 15% 0%, ${bright}7a 0%, transparent 58%)`,
    `radial-gradient(70% 70% at 100% 100%, ${darkenHex(color, 95)}cc 0%, transparent 60%)`,
    `linear-gradient(135deg, ${deeper} 0%, ${color} 52%, ${deep} 100%)`,
  ].join(", ");

  return (
    <div
      className={cn(
        "relative aspect-[1.586/1] overflow-hidden border border-white/15 text-white",
        styles.radius,
        className,
      )}
      style={{
        background: mesh,
        boxShadow:
          "var(--card-shadow-ambient), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25)",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_38%,rgba(0,0,0,0.2)_100%)]" />
      <div className="absolute -right-[18%] -top-[30%] h-[82%] w-[68%] rounded-full bg-white/10 blur-sm" />
      <div className="absolute -bottom-[34%] left-[24%] h-[62%] w-[92%] -rotate-12 rounded-full bg-black/[0.18]" />

      <div className={cn("relative h-full flex flex-col justify-between", styles.padding)}>
        <div className="flex items-start justify-between gap-2">
          <div className={cn("relative shrink-0 overflow-hidden bg-amber-100/90 shadow-inner", styles.chip)}>
            <div className="absolute inset-y-0 left-1/2 w-px bg-amber-600/35" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-amber-600/35" />
          </div>

          <div
            className={cn(
              "items-center rounded-full border border-white/20 bg-black/20 px-2 py-1 font-mono text-white/85 backdrop-blur-sm",
              styles.fee,
              styles.meta,
            )}
          >
            AF ${card.annualFee}
          </div>
        </div>

        <div className="min-w-0">
          <div className={cn("font-semibold text-white drop-shadow-sm", styles.name)}>
            {card.shortName}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div
              className={cn(
                "font-mono tabular-nums text-white/75",
                styles.number,
              )}
            >
              **** {lastFour}
            </div>
            {size === "lg" && (
              <div className={cn("text-right font-medium text-white/70", styles.meta)}>
                {card.issuer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
