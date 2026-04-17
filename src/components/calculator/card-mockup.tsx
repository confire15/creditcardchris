"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PremiumCard } from "./premium-cards";

/**
 * Lightweight card visual for the calculator. The wallet's CreditCardVisual
 * expects a UserCard row from the DB, which we don't have here — this is
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
  const deeper = darkenHex(color, 75);
  const deep = darkenHex(color, 35);

  const mesh = [
    `radial-gradient(60% 55% at 18% 12%, ${lightenHex(color, 50)}66 0%, transparent 65%)`,
    `radial-gradient(70% 60% at 88% 95%, ${darkenHex(color, 90)}99 0%, transparent 60%)`,
    `linear-gradient(135deg, ${deeper} 0%, ${color} 55%, ${deep} 100%)`,
  ].join(", ");

  const padding =
    size === "sm" ? "p-2.5" : size === "lg" ? "p-5 sm:p-6" : "p-3.5 sm:p-4";
  const metaSize = size === "sm" ? "text-[8px]" : "text-[10px]";
  const nameSize =
    size === "sm"
      ? "text-[11px] leading-[1.15]"
      : size === "lg"
        ? "text-base sm:text-lg leading-tight"
        : "text-sm";
  const feeSize =
    size === "sm"
      ? "text-[12px]"
      : size === "lg"
        ? "text-2xl sm:text-3xl"
        : "text-lg";

  return (
    <div
      className={cn(
        "relative aspect-[1.586/1] rounded-xl overflow-hidden text-white",
        className,
      )}
      style={{
        background: mesh,
        boxShadow:
          "var(--card-shadow-ambient), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.15)",
      }}
    >
      <div className={cn("relative h-full flex flex-col justify-between", padding)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                "uppercase tracking-[0.18em] opacity-70 leading-none",
                metaSize,
              )}
            >
              {card.issuer}
            </div>
            <div className={cn("font-semibold mt-1.5", nameSize)}>{card.shortName}</div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={cn(
                "uppercase tracking-[0.18em] opacity-70 leading-none",
                metaSize,
              )}
            >
              Annual Fee
            </div>
            <div
              className={cn(
                "font-mono tabular-nums font-bold mt-1.5 leading-none",
                feeSize,
              )}
            >
              ${card.annualFee}
            </div>
          </div>
        </div>
        <div className={cn("font-mono tracking-[0.2em] opacity-70", metaSize)}>
          •••• •••• •••• ••••
        </div>
      </div>
    </div>
  );
});
