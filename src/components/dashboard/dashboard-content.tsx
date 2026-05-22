"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ActionCard } from "@/components/actions/action-card";
import { Button } from "@/components/ui/button";
import type { UserActionRow } from "@/lib/actions/schemas";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { formatCurrency } from "@/lib/utils/format";
import { Bell, Loader2, RefreshCw, Sparkles, ChevronRight, BarChart2 } from "lucide-react";
import { CopilotStatusBar } from "@/components/dashboard/copilot-status-bar";

type OutcomeStats = {
  creditsClosed: number;
  actionsCompleted: number;
  activeCards: number;
  openBonuses: number;
};

function sectionFor(action: UserActionRow) {
  const due = action.due_at ?? action.expires_at;
  if (!due) return action.action_type === "data_cleanup" ? "Setup Needed" : "This Week";
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (days <= 2 || action.priority >= 90) return "Do Now";
  if (days <= 14) return "This Week";
  return action.action_type === "data_cleanup" ? "Setup Needed" : "Later";
}

export function DashboardContent({ userId, isPremium }: { userId: string; isPremium: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [actions, setActions] = useState<UserActionRow[]>([]);
  const [stats, setStats] = useState<OutcomeStats>({
    creditsClosed: 0,
    actionsCompleted: 0,
    activeCards: 0,
    openBonuses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const fetchStats = useCallback(async () => {
    const memberIds = await getHouseholdMemberIds(supabase, userId);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const [closedRes, completedRes, cardsRes, subsRes] = await Promise.all([
      supabase
        .from("card_perks")
        .select("used_value")
        .in("user_id", memberIds)
        .gte("closed_via_app_at", startOfYear),
      supabase
        .from("user_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
      supabase
        .from("user_cards")
        .select("*", { count: "exact", head: true })
        .in("user_id", memberIds)
        .eq("is_active", true),
      supabase
        .from("card_subs")
        .select("*", { count: "exact", head: true })
        .in("user_id", memberIds)
        .eq("is_met", false),
    ]);

    setStats({
      creditsClosed: (closedRes.data ?? []).reduce((sum, row) => sum + Number(row.used_value ?? 0), 0),
      actionsCompleted: completedRes.count ?? 0,
      activeCards: cardsRes.count ?? 0,
      openBonuses: subsRes.count ?? 0,
    });
  }, [supabase, userId]);

  const loadActions = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
    setRefreshing(refresh);
    try {
      const res = await fetch(refresh ? "/api/actions/refresh" : "/api/actions?limit=40", {
        method: refresh ? "POST" : "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not load actions");
      setActions(data.actions ?? []);
      if (!refresh && (!data.actions || data.actions.length === 0)) {
        const refreshRes = await fetch("/api/actions/refresh", { method: "POST" });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok) setActions(refreshData.actions ?? []);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadActions(), fetchStats()]);
  }, [fetchStats, loadActions]);

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get("action");
    if (!target || actions.length === 0) return;
    const match = actions.find(
      (action) =>
        action.recurrence_key === target ||
        action.recurrence_key === `alert:${target}` ||
        action.source_refs.some((ref) => ref.id === target),
    );
    if (!match) return;
    window.setTimeout(() => {
      document.getElementById(`action-${match.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 100);
  }, [actions]);

  function removeAction(id: string) {
    setActions((current) => current.filter((action) => action.id !== id));
    void fetchStats();
  }

  async function seedDemoActions() {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/actions/demo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not seed demo actions");
      await loadActions({ refresh: false });
    } finally {
      setSeedingDemo(false);
    }
  }

  const grouped = actions.reduce<Record<string, UserActionRow[]>>((acc, action) => {
    const key = sectionFor(action);
    if (!acc[key]) acc[key] = [];
    acc[key].push(action);
    return acc;
  }, {});
  const laterMerged: UserActionRow[] = [...(grouped["Setup Needed"] ?? []), ...(grouped["Later"] ?? [])];
  const visibleSections: Array<{ key: string; items: UserActionRow[] }> = [];
  if (grouped["Do Now"]?.length) visibleSections.push({ key: "Do Now", items: grouped["Do Now"] });
  if (grouped["This Week"]?.length) visibleSections.push({ key: "This Week", items: grouped["This Week"] });

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-3 animate-[fade-in_0.25s_ease_both]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Today</h1>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0"
          aria-label="Refresh"
          onClick={() => loadActions({ refresh: true })}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-semibold text-foreground">{formatCurrency(stats.creditsClosed)}</span> credits closed</span>
        <span aria-hidden>·</span>
        <span><span className="font-semibold text-foreground">{stats.actionsCompleted}</span> moves done</span>
        <span aria-hidden>·</span>
        <span><span className="font-semibold text-foreground">{stats.activeCards}</span> cards</span>
        <span aria-hidden>·</span>
        <span><span className="font-semibold text-foreground">{stats.openBonuses}</span> open bonuses</span>
      </p>

      {isPremium && (() => {
        const m = new Date().getMonth(); // 0-indexed; 11=Dec, 0=Jan
        const showRecap = m === 11 || m === 0;
        return showRecap ? (
          <Link
            href="/recap"
            className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 transition-colors hover:bg-primary/[0.10]"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Your {new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()} Year Recap is ready</p>
              <p className="mt-0.5 text-xs text-muted-foreground">See your card value, credits closed, and top categories.</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </Link>
        ) : null;
      })()}

      {isPremium && (
        <CopilotStatusBar onActionsRefreshed={() => loadActions({ refresh: false })} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No moves waiting right now.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add cards, benefits, bonuses, offers, or annual-fee dates to give Chris more to work with.
          </p>
          <Button className="mt-4 h-10 gap-2" onClick={() => loadActions({ refresh: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Find moves
          </Button>
          {process.env.NODE_ENV !== "production" && (
            <Button
              className="ml-0 mt-2 h-10 gap-2 sm:ml-2 sm:mt-4"
              variant="outline"
              onClick={seedDemoActions}
              disabled={seedingDemo}
            >
              {seedingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Seed demo moves
            </Button>
          )}
          {!isPremium && (
            <div className="mx-auto mt-6 flex max-w-sm items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3 text-left">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="flex-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Premium</span> adds AI analysis, email/SMS alerts, and Keep or Cancel deep-dives.{" "}
                <Link href="/settings" className="font-medium text-primary hover:underline">Upgrade</Link>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {visibleSections.map(({ key, items }) => (
            <section key={key} className="space-y-3">
              <h2 className="text-sm font-semibold">{key}</h2>
              <div className="space-y-3">
                {items.map((action) => (
                  <div key={action.id} id={`action-${action.id}`} className="scroll-mt-24">
                    <ActionCard action={action} onChanged={removeAction} />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {laterMerged.length > 0 && (
            <details className="group space-y-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                Later
                <span className="text-xs font-normal text-muted-foreground">({laterMerged.length})</span>
              </summary>
              <div className="mt-3 space-y-3">
                {laterMerged.map((action) => (
                  <div key={action.id} id={`action-${action.id}`} className="scroll-mt-24">
                    <ActionCard action={action} onChanged={removeAction} />
                  </div>
                ))}
              </div>
            </details>
          )}
          {!isPremium && (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="flex-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Premium</span> adds AI analysis, email/SMS alerts, and Keep or Cancel deep-dives.{" "}
                <Link href="/settings" className="font-medium text-primary hover:underline">Upgrade</Link>
              </p>
            </div>
          )}
          <Link
            href="/alerts"
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See all upcoming alerts
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
