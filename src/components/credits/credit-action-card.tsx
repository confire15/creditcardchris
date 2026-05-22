"use client";

import { useState } from "react";
import { Clock, ExternalLink, Check, Loader2 } from "lucide-react";
import { differenceInDays, format, addYears, parseISO } from "date-fns";
import { toast } from "sonner";
import type { CardPerk, CardPerkAction, UserCard } from "@/lib/types/database";
import { getCardName, getCardColor } from "@/lib/utils/rewards";
import { formatCurrency } from "@/lib/utils/format";

type PerkWithActions = CardPerk & {
  user_card?: UserCard;
  actions: CardPerkAction[];
};

function getNextResetDate(perk: CardPerk): Date {
  const today = new Date();
  if (perk.reset_cadence === "monthly") {
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }
  const month = (perk.reset_month ?? 1) - 1;
  if (perk.reset_cadence === "calendar_year") {
    const thisYear = new Date(today.getFullYear(), month, 1);
    return today >= thisYear ? new Date(today.getFullYear() + 1, month, 1) : thisYear;
  }
  if (perk.last_reset_at) return addYears(parseISO(perk.last_reset_at), 1);
  const thisYear = new Date(today.getFullYear(), month, 1);
  return today >= thisYear ? new Date(today.getFullYear() + 1, month, 1) : thisYear;
}

export function CreditActionCard({
  perk,
  onClosed,
}: {
  perk: PerkWithActions;
  onClosed?: (perkId: string, amount: number) => void;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const card = perk.user_card;
  const cardName = card ? getCardName(card) : "Unknown Card";
  const cardColor = card ? getCardColor(card) : "#d4621a";
  const resetDate = getNextResetDate(perk);
  const daysLeft = Math.max(differenceInDays(resetDate, new Date()), 0);
  const total = perk.annual_value ?? 0;
  const used = perk.used_value ?? 0;
  const remaining = Math.max(total - used, 0);
  const urgent = daysLeft <= 7;

  async function handleAction(action: CardPerkAction) {
    if (submitting) return;
    setSubmitting(action.id);
    const amountCents = action.prefill_amount_cents ?? Math.round(remaining * 100);
    const url = action.deep_link_url || action.fallback_web_url;

    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    try {
      const res = await fetch("/api/credits/mark-claimed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perkId: perk.id,
          actionId: action.id,
          amountCents,
        }),
      });
      if (!res.ok) throw new Error("mark-claimed failed");
      setDone(true);
      onClosed?.(perk.id, amountCents / 100);
      toast.success(`Closed ${formatCurrency(amountCents / 100)} on ${perk.name}`);
    } catch {
      toast.error("Couldn't mark claimed — try again from the credits page");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div
      className={`relative bg-card border rounded-2xl p-5 flex flex-col gap-3 ${
        done
          ? "border-green-500/30 bg-green-500/5"
          : urgent
          ? "border-amber-500/30"
          : "border-overlay-subtle"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold leading-tight">{perk.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: cardColor }}
            />
            <p className="text-xs text-muted-foreground">{cardName}</p>
          </div>
        </div>
        <span className="text-2xl font-bold tracking-tight flex-shrink-0">
          {formatCurrency(remaining)}
        </span>
      </div>

      {perk.description && (
        <p className="text-sm text-muted-foreground leading-snug">{perk.description}</p>
      )}

      {perk.actions[0]?.instructions && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 leading-snug">
          {perk.actions[0].instructions}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-xs">
        <Clock className={`w-3 h-3 ${urgent ? "text-amber-400" : "text-muted-foreground"}`} />
        <span className={urgent ? "text-amber-400 font-medium" : "text-muted-foreground"}>
          {daysLeft === 0 ? "Resets today" : `${daysLeft} days left · resets ${format(resetDate, "MMM d")}`}
        </span>
      </div>

      {done ? (
        <div className="flex items-center gap-2 text-sm text-green-400 font-medium pt-1">
          <Check className="w-4 h-4" />
          Marked closed. Pay with {cardName} to apply the credit.
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {perk.actions.map((action, idx) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={submitting !== null}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                idx === 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card border border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              {submitting === action.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
