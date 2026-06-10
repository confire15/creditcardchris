"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PremiumGate } from "@/components/premium/premium-gate";
import { Button } from "@/components/ui/button";
import { RotatingCategoryPeriod, UserCard, UserRotatingCategoryStatus } from "@/lib/types/database";
import { getCardName } from "@/lib/utils/rewards";
import { CheckCircle2, RotateCw } from "lucide-react";

export function RotatingCategoryTracker({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  const supabase = createClient();
  const [periods, setPeriods] = useState<RotatingCategoryPeriod[]>([]);
  const [statuses, setStatuses] = useState<UserRotatingCategoryStatus[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);

  async function load() {
    if (!isPremium) return;
    const [activationRes, cardsRes] = await Promise.all([
      fetch("/api/rotating-categories/activations"),
      supabase
        .from("user_cards")
        .select("*, card_template:card_templates(*)")
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);
    const payload = await activationRes.json().catch(() => ({}));
    if (activationRes.ok) {
      setPeriods(payload.periods ?? []);
      setStatuses(payload.statuses ?? []);
    }
    setCards((cardsRes.data as UserCard[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [isPremium]);

  async function activate(cardId: string, periodId: string) {
    await fetch("/api/rotating-categories/activations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCardId: cardId, periodId, isActivated: true }),
    });
    void load();
  }

  const rows = periods.flatMap((period) => {
    const matchingCards = cards.filter((card) => card.card_template_id === period.card_template_id || card.card_template?.issuer === period.issuer);
    return matchingCards.map((card) => ({ period, card, status: statuses.find((item) => item.user_card_id === card.id && item.rotating_category_period_id === period.id) }));
  });

  if (!isPremium && rows.length === 0) {
    return (
      <PremiumGate isPremium={isPremium} label="Unlock rotating category autopilot with Premium" preview={<div className="h-24 rounded-2xl bg-muted/30" />}>
        <div />
      </PremiumGate>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <RotateCw className="h-4 w-4 text-primary" />
        Rotating Category Autopilot
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Activation and cap status for quarterly 5% cards.</p>
      <PremiumGate isPremium={isPremium} label="Unlock rotating category autopilot with Premium" preview={<div className="mt-3 h-20 rounded-xl bg-muted/30" />}>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No curated rotating categories are active right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.slice(0, 4).map(({ period, card, status }) => (
              <div key={`${period.id}-${card.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{getCardName(card)}</p>
                  <p className="text-xs text-muted-foreground">{period.category_name} · {period.multiplier}x · cap ${period.cap_amount?.toLocaleString() ?? "varies"}</p>
                </div>
                {status?.is_activated ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </span>
                ) : (
                  <Button size="sm" className="h-8" onClick={() => activate(card.id, period.id)}>Activate</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </PremiumGate>
    </div>
  );
}
