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
        className="relative w-full aspect-[1.586/1] rounded-2xl p-6 flex flex-col justify-between text-white overflow-hidden shadow-lg transition-all group-hover:scale-[1.02] group-hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 50%, ${color}99 100%)`,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{issuer}</p>
            <p className="text-base font-semibold mt-0.5 leading-tight">{name}</p>
          </div>
          <span className="text-xs font-bold opacity-70 uppercase">{network}</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            {card.last_four ? (
              <p className="text-sm font-mono tracking-widest opacity-90">
                •••• {card.last_four}
              </p>
            ) : (
              <p className="text-sm font-mono tracking-widest opacity-50">
                •••• ••••
              </p>
            )}
          </div>
          <div className="w-11 h-8 rounded-md bg-white/15 flex items-center justify-center">
            <div className="w-6 h-4 rounded-sm bg-white/25" />
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-12 w-20 h-20 rounded-full bg-white/5" />
      </div>
    </button>
  );
}
