"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardChangeEvent } from "@/lib/types/database";
import { PremiumGate } from "@/components/premium/premium-gate";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function CardChangeWatchlist({ isPremium }: { isPremium: boolean }) {
  const supabase = createClient();
  const [events, setEvents] = useState<CardChangeEvent[]>([]);

  async function load() {
    if (!isPremium) return;
    const [{ data: cards }, { data: changes }, { data: dismissals }] = await Promise.all([
      supabase.from("user_cards").select("card_template_id, card_template:card_templates(issuer)").eq("is_active", true),
      supabase.from("card_change_events").select("*, card_template:card_templates(*)").order("effective_on", { ascending: true, nullsFirst: false }),
      supabase.from("user_card_change_dismissals").select("card_change_event_id"),
    ]);
    const dismissed = new Set((dismissals ?? []).map((row) => row.card_change_event_id));
    const walletCards = (cards ?? []).map((card) => {
      const template = Array.isArray(card.card_template) ? card.card_template[0] : card.card_template;
      return {
        cardTemplateId: card.card_template_id as string | null,
        issuer: template?.issuer as string | undefined,
      };
    });
    setEvents(
      ((changes ?? []) as CardChangeEvent[]).filter((event) => {
        if (dismissed.has(event.id)) return false;
        return walletCards.some((card) => card.cardTemplateId === event.card_template_id || card.issuer === event.issuer);
      }),
    );
  }

  useEffect(() => {
    void load();
  }, [isPremium]);

  async function dismiss(eventId: string) {
    await fetch("/api/card-changes/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    void load();
  }

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 text-primary" />
        Card Change Watchlist
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Curated fee, reward, and benefit changes that may affect your keep/cancel math.</p>
      <PremiumGate isPremium={isPremium} label="Unlock card-change impact alerts with Premium" preview={<div className="mt-3 h-20 rounded-xl bg-muted/30" />}>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No matching card changes right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.summary}</p>
                    {event.estimated_annual_impact != null && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Estimated impact: ${Number(event.estimated_annual_impact).toLocaleString()}/yr</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => dismiss(event.id)}>Dismiss</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PremiumGate>
    </div>
  );
}
