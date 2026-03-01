"use client";

import { UserCard } from "@/lib/types/database";
import { getCardName, getCardColor, getCardIssuer, getCardNetwork } from "@/lib/utils/rewards";

export function CreditCardVisual({
  card,
  onClick,
}: {
  card: UserCard;
  onClick?: () => void;
}) {
  const name = getCardName(card);
  const color = getCardColor(card);
  const issuer = getCardIssuer(card);
  const network = getCardNetwork(card);

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      type="button"
    >
      <div
        className="relative w-full aspect-[1.586/1] rounded-2xl p-6 flex flex-col justify-between text-white overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 50%, ${color}99 100%)`,
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.07] to-white/0 pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">{issuer}</p>
            <p className="text-base font-bold mt-1 leading-tight">{name}</p>
          </div>
          <span className="text-xs font-bold opacity-60 uppercase tracking-widest">{network}</span>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div>
            {card.last_four ? (
              <p className="text-sm font-mono tracking-[0.2em] opacity-90">
                •••• •••• •••• {card.last_four}
              </p>
            ) : (
              <p className="text-sm font-mono tracking-[0.2em] opacity-40">
                •••• •••• •••• ••••
              </p>
            )}
          </div>
          <div className="w-12 h-9 rounded-lg bg-white/15 flex items-center justify-center border border-white/10">
            <div className="w-7 h-5 rounded-sm bg-white/20" />
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/[0.06]" />
        <div className="absolute -right-4 top-14 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-black/[0.08]" />
      </div>
    </button>
  );
}
