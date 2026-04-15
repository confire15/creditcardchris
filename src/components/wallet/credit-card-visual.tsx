"use client";

import { memo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { UserCard } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";

function darkenHex(hex: string, amount: number = -60): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const CreditCardVisual = memo(function CreditCardVisual({
  card,
  onClick,
  index = 0,
}: {
  card: UserCard;
  onClick?: () => void;
  index?: number;
}) {
  const name = getCardName(card);
  const color = getCardColor(card);
  const darker = darkenHex(color, -65);

  // Find top reward category badge
  const rewards = (card as any).rewards ?? [];
  const topReward =
    rewards.length > 0
      ? rewards.reduce(
          (best: any, r: any) =>
            (r.multiplier ?? 0) > (best?.multiplier ?? 0) ? r : best,
          null
        )
      : null;

  const template = (card as any).card_template;
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

  const cardRef = useRef<HTMLDivElement>(null);

  // Gate 3D tilt to pointer-capable devices only (not touch-primary)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: none)").matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Clamped to ±6° for a subtle, premium feel
    const rotateX = Math.max(-6, Math.min(6, (y - 0.5) * -12));
    const rotateY = Math.max(-6, Math.min(6, (x - 0.5) * 12));
    el.style.transition = "transform 0.05s ease-out";
    el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    // Spring-like settle: ease back to flat
    el.style.transition = "transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.transform = "";
  }, []);

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left group"
      type="button"
      initial={{ opacity: 0, y: 12, scale: 0.97, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 28, delay: index * 0.035 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full aspect-[2.4/1] rounded-2xl p-3 sm:p-4 flex flex-col justify-between text-white overflow-hidden shadow-xl transition-all duration-300 group-hover:shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${darker} 0%, ${color} 100%)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.07] to-white/0 pointer-events-none" />

        {/* Card name */}
        <div className="relative z-10">
          <p className="text-xs sm:text-sm font-bold leading-snug line-clamp-1">{name}</p>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between relative z-10">
          <p className="text-[10px] font-mono tracking-[0.14em] opacity-70">
            {card.last_four ? `•••• ${card.last_four}` : "•••• ••••"}
          </p>
          {badgeLabel && (
            <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90 leading-none truncate max-w-[55%]">
              {badgeLabel}
            </span>
          )}
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/[0.06]" />
        <div className="absolute -right-4 top-14 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-black/[0.10]" />
      </div>
    </motion.button>
  );
});
