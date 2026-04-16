"use client";

import { memo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { UserCard, UserCardReward } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { cn } from "@/lib/utils";

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

// Inline SVG noise texture — 3% opacity fBm. Data URL keeps this asset-free.
const NOISE_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")";

export type CardDensity = "stack" | "grid";

export const CreditCardVisual = memo(function CreditCardVisual({
  card,
  onClick,
  index = 0,
  density = "stack",
  className,
}: {
  card: UserCard;
  onClick?: () => void;
  index?: number;
  density?: CardDensity;
  className?: string;
}) {
  const name = getCardName(card);
  const color = getCardColor(card);
  const deeper = darkenHex(color, 75);
  const deep = darkenHex(color, 35);
  const bright = lightenHex(color, 20);

  // Badge: highest multiplier category above base, else base rate
  const rewards: UserCardReward[] = card.rewards ?? [];
  const topReward: UserCardReward | null =
    rewards.length > 0
      ? rewards.reduce<UserCardReward | null>(
          (best, r) => ((r.multiplier ?? 0) > (best?.multiplier ?? 0) ? r : best),
          null
        )
      : null;

  const template = card.card_template;
  let badgeLabel: string | null = null;
  if (topReward && topReward.multiplier > (template?.base_reward_rate ?? 0)) {
    badgeLabel = `${topReward.multiplier}x ${topReward.category?.display_name ?? ""}`;
  } else if (template?.base_reward_rate) {
    const isCash =
      template.reward_unit === "%" ||
      template.reward_type?.toLowerCase().includes("cash");
    badgeLabel = isCash
      ? `${template.base_reward_rate}% All`
      : `${template.base_reward_rate}x All`;
  }

  const issuer = template?.issuer ?? "";

  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt + cursor-following sheen — pointer-capable devices only
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: none)").matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = Math.max(-6, Math.min(6, (y - 0.5) * -12));
    const rotateY = Math.max(-6, Math.min(6, (x - 0.5) * 12));
    el.style.transition = "transform 0.05s ease-out";
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.012)`;
    el.style.setProperty("--sheen-x", `${x * 100}%`);
    el.style.setProperty("--sheen-y", `${y * 100}%`);
    el.style.setProperty("--sheen-opacity", "1");
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.transform = "";
    el.style.setProperty("--sheen-opacity", "0");
  }, []);

  // Mesh gradient: base 3-stop diagonal + top-left highlight + bottom-right lowlight
  const mesh = [
    `radial-gradient(60% 55% at 18% 12%, ${lightenHex(color, 50)}66 0%, transparent 65%)`,
    `radial-gradient(70% 60% at 88% 95%, ${darkenHex(color, 90)}99 0%, transparent 60%)`,
    `linear-gradient(135deg, ${deeper} 0%, ${color} 55%, ${deep} 100%)`,
  ].join(", ");

  const padding =
    density === "grid" ? "p-4 sm:p-5" : "p-3.5 sm:p-4";
  const nameSize =
    density === "grid"
      ? "text-[13px] sm:text-sm"
      : "text-[12px] sm:text-[13px]";

  return (
    <motion.button
      onClick={onClick}
      className={cn("w-full text-left group cursor-pointer", className)}
      type="button"
      initial={{ opacity: 0, y: 12, scale: 0.97, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 28, delay: index * 0.035 }}
      aria-label={`${name}${badgeLabel ? ` — ${badgeLabel}` : ""}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative w-full aspect-[1.586/1] rounded-2xl text-white overflow-hidden",
          "flex flex-col justify-between",
          padding
        )}
        style={{
          backgroundImage: mesh,
          backgroundColor: color,
          boxShadow:
            "var(--card-shadow-ambient), var(--card-shadow-close), var(--card-inner-highlight)",
          transformStyle: "preserve-3d",
          transition:
            "box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1), transform 0.05s ease-out",
          // Hover shadow via CSS var swap on hover
          ...({
            "--sheen-x": "50%",
            "--sheen-y": "0%",
            "--sheen-opacity": "0",
          } as React.CSSProperties),
        }}
      >
        {/* Cursor-following sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(420px circle at var(--sheen-x) var(--sheen-y), rgba(255,255,255,0.22), transparent 40%)",
            opacity: "var(--sheen-opacity)",
            transition: "opacity 0.3s ease",
            mixBlendMode: "soft-light",
          }}
        />

        {/* Static diagonal sheen (always present, very subtle) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent"
        />

        {/* Noise texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: NOISE_URL, backgroundSize: "140px 140px" }}
        />

        {/* Soft color bloom accent, upper-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-2xl opacity-40"
          style={{ background: bright }}
        />

        {/* Top row: card name + issuer */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <p
            className={cn(
              nameSize,
              "font-semibold tracking-tight leading-tight line-clamp-2 max-w-[70%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
            )}
          >
            {name}
          </p>
          {issuer && (
            <p className="text-[9px] font-semibold tracking-[0.18em] uppercase opacity-70 whitespace-nowrap pt-0.5">
              {issuer}
            </p>
          )}
        </div>

        {/* Bottom row: last four + multiplier badge */}
        <div className="flex items-end justify-between relative z-10 gap-2">
          <p className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] opacity-70">
            {card.last_four ? `•••• ${card.last_four}` : "•••• ••••"}
          </p>
          {badgeLabel && (
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                "backdrop-blur-md text-white",
                "leading-none truncate max-w-[55%]"
              )}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              {badgeLabel}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
});
