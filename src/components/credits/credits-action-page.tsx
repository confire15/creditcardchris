"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CardPerk, CardPerkAction, UserCard } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils/format";
import { CreditActionCard } from "@/components/credits/credit-action-card";
import { Sparkles, Zap } from "lucide-react";
import { differenceInDays, parseISO, addYears } from "date-fns";

type PerkWithCard = CardPerk & { user_card?: UserCard };
type PerkWithActions = PerkWithCard & { actions: CardPerkAction[] };

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

function isFullyUsed(perk: CardPerk): boolean {
  if (perk.value_type === "dollar")
    return (perk.used_value ?? 0) >= (perk.annual_value ?? 0);
  if (perk.value_type === "count")
    return (perk.used_count ?? 0) >= (perk.annual_count ?? 0);
  return perk.is_redeemed ?? false;
}

export function CreditsActionPage({ userId }: { userId: string }) {
  const supabase = createClient();
  const [perks, setPerks] = useState<PerkWithActions[]>([]);
  const [closedYtd, setClosedYtd] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

    const [perksRes, closedRes] = await Promise.all([
      supabase
        .from("card_perks")
        .select(
          "*, user_card:user_cards(*, card_template:card_templates(*))"
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("card_perks")
        .select("used_value, closed_via_app_at")
        .eq("user_id", userId)
        .gte("closed_via_app_at", startOfYear),
    ]);

    const perkRows = (perksRes.data ?? []) as PerkWithCard[];
    const templateIds = perkRows
      .map((p) => p.card_perk_template_id)
      .filter((id): id is string => !!id);

    let actionsByTemplate: Record<string, CardPerkAction[]> = {};
    if (templateIds.length > 0) {
      const { data: actions } = await supabase
        .from("card_perk_actions")
        .select("*")
        .eq("is_active", true)
        .in("card_perk_template_id", templateIds)
        .order("sort_order");
      actionsByTemplate = (actions ?? []).reduce<Record<string, CardPerkAction[]>>(
        (acc, a) => {
          (acc[a.card_perk_template_id] ||= []).push(a);
          return acc;
        },
        {}
      );
    }

    const enriched: PerkWithActions[] = perkRows.map((p) => ({
      ...p,
      actions: p.card_perk_template_id
        ? actionsByTemplate[p.card_perk_template_id] ?? []
        : [],
    }));

    const ytd = (closedRes.data ?? []).reduce(
      (sum, r) => sum + (r.used_value ?? 0),
      0
    );

    setPerks(enriched);
    setClosedYtd(ytd);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleClosed(perkId: string, amount: number) {
    setClosedYtd((v) => v + amount);
    setPerks((prev) =>
      prev.map((p) =>
        p.id === perkId
          ? {
              ...p,
              used_value: Math.min(
                (p.used_value ?? 0) + amount,
                p.annual_value ?? amount
              ),
              closed_via_app_at: new Date().toISOString(),
            }
          : p
      )
    );
  }

  const actionable = perks.filter((p) => !isFullyUsed(p) && p.actions.length > 0);
  const today = new Date();
  const closingSoon = actionable
    .filter((p) => differenceInDays(getNextResetDate(p), today) <= 14)
    .sort(
      (a, b) =>
        differenceInDays(getNextResetDate(a), today) -
        differenceInDays(getNextResetDate(b), today)
    );
  const available = actionable.filter(
    (p) => differenceInDays(getNextResetDate(p), today) > 14
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-muted animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Closed by Chris this year
        </p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(closedYtd)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Credits we&apos;ve helped you burn before they expired.
        </p>
      </div>

      {closingSoon.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold">Closing soon</h2>
            <span className="text-xs text-muted-foreground">
              · {closingSoon.length} expiring within 14 days
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {closingSoon.map((perk) => (
              <CreditActionCard key={perk.id} perk={perk} onClosed={handleClosed} />
            ))}
          </div>
        </section>
      )}

      {available.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Available this period</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {available.map((perk) => (
              <CreditActionCard key={perk.id} perk={perk} onClosed={handleClosed} />
            ))}
          </div>
        </section>
      )}

      {actionable.length === 0 && (
        <div className="bg-card border border-overlay-subtle rounded-2xl p-12 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium mb-1">No one-tap credits available yet</p>
          <p className="text-xs text-muted-foreground">
            We&apos;re building action recipes for more cards. For now we cover Amex
            Gold&apos;s Uber Cash credit — add it from your Wallet to get started.
          </p>
        </div>
      )}
    </div>
  );
}
