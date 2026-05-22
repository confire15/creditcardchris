"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ActionCard } from "@/components/actions/action-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { UserActionRow } from "@/lib/actions/schemas";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { formatCurrency } from "@/lib/utils/format";
import { Bell, CheckCircle2, CreditCard, Gift, Loader2, RefreshCw, Sparkles, Target, ChevronRight, BarChart2 } from "lucide-react";
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
  const sections = ["Do Now", "This Week", "Setup Needed", "Later"].filter((section) => grouped[section]?.length);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-3 animate-[fade-in_0.25s_ease_both]">
      <PageHeader
        className="mb-0"
        title="Today"
        description="Your next credit card moves, ranked by timing and value."
        actions={
          <Button className="h-10 w-full gap-2 sm:w-auto" onClick={() => loadActions({ refresh: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm shadow-black/10">
          <Gift className="mb-3 h-4 w-4 text-emerald-500" />
          <p className="text-xl font-bold">{formatCurrency(stats.creditsClosed)}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">credits closed</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm shadow-black/10">
          <CheckCircle2 className="mb-3 h-4 w-4 text-primary" />
          <p className="text-xl font-bold">{stats.actionsCompleted}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">moves done</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm shadow-black/10">
          <CreditCard className="mb-3 h-4 w-4 text-blue-500" />
          <p className="text-xl font-bold">{stats.activeCards}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">active cards</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm shadow-black/10">
          <Target className="mb-3 h-4 w-4 text-orange-500" />
          <p className="text-xl font-bold">{stats.openBonuses}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">bonus plans</p>
        </div>
      </div>

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

      {isPremium ? (
        <CopilotStatusBar onActionsRefreshed={() => loadActions({ refresh: false })} />
      ) : (
        <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Premium makes Today proactive</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AI analysis, email/SMS alerts, Keep or Cancel deep-dives, and advanced credit actions unlock with Premium.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="h-9 shrink-0">
              <Link href="/settings">Upgrade</Link>
            </Button>
          </div>
        </section>
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
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">{section}</h2>
                <p className="text-xs text-muted-foreground">
                  {grouped[section].length} action{grouped[section].length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-3">
                {grouped[section].map((action) => (
                  <div key={action.id} id={`action-${action.id}`} className="scroll-mt-24">
                    <ActionCard action={action} onChanged={removeAction} />
                  </div>
                ))}
              </div>
            </section>
          ))}
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
