"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ActionCard } from "@/components/actions/action-card";
import { Button } from "@/components/ui/button";
import type { UserActionRow } from "@/lib/actions/schemas";
import { cn } from "@/lib/utils";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateShort } from "@/lib/utils/format";
import { ArrowUpRight, Bell, Loader2, MessageCircleQuestion, RefreshCw, Sparkles, ChevronRight } from "lucide-react";
import { CopilotStatusBar } from "@/components/dashboard/copilot-status-bar";

export type TodaySummary = {
  firstName: string | null;
  monthlyCreditTotal: number;
  monthlyCreditUsed: number;
  expiringSoonValue: number;
  expiringSoonCount: number;
  nextFee: { cardName: string; amount: number; date: string } | null;
  upcomingAlerts: Array<{
    id: string;
    title: string;
    body: string;
    linkHref: string;
    eventDate: string;
  }>;
};

type OutcomeStats = {
  creditsClosed: number;
  creditsClosedThisMonth: number;
  creditsClosedLastMonth: number;
};

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function sectionFor(action: UserActionRow) {
  const due = action.due_at ?? action.expires_at;
  if (!due) return action.action_type === "data_cleanup" ? "Setup Needed" : "This Week";
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (days <= 2 || action.priority >= 90) return "Do Now";
  if (days <= 14) return "This Week";
  return action.action_type === "data_cleanup" ? "Setup Needed" : "Later";
}

export function DashboardContent({
  userId,
  isPremium,
  summary,
  initialActions = [],
}: {
  userId: string;
  isPremium: boolean;
  summary: TodaySummary;
  initialActions?: UserActionRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [actions, setActions] = useState<UserActionRow[]>(initialActions);
  const [stats, setStats] = useState<OutcomeStats>({
    creditsClosed: 0,
    creditsClosedThisMonth: 0,
    creditsClosedLastMonth: 0,
  });
  const [loading, setLoading] = useState(initialActions.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const fetchStats = useCallback(async () => {
    const memberIds = await getHouseholdMemberIds(supabase, userId);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const [closedRes, closedThisMonthRes, closedLastMonthRes] = await Promise.all([
      supabase
        .from("card_perks")
        .select("used_value")
        .in("user_id", memberIds)
        .gte("closed_via_app_at", startOfYear),
      supabase
        .from("card_perks")
        .select("used_value")
        .in("user_id", memberIds)
        .gte("closed_via_app_at", startOfMonth),
      supabase
        .from("card_perks")
        .select("used_value")
        .in("user_id", memberIds)
        .gte("closed_via_app_at", startOfLastMonth)
        .lt("closed_via_app_at", startOfMonth),
    ]);

    setStats({
      creditsClosed: (closedRes.data ?? []).reduce((sum, row) => sum + Number(row.used_value ?? 0), 0),
      creditsClosedThisMonth: (closedThisMonthRes.data ?? []).reduce((sum, row) => sum + Number(row.used_value ?? 0), 0),
      creditsClosedLastMonth: (closedLastMonthRes.data ?? []).reduce((sum, row) => sum + Number(row.used_value ?? 0), 0),
    });
  }, [supabase, userId]);

  const loadActions = useCallback(async ({ refresh = false }: { refresh?: boolean } = {}) => {
    setRefreshing(refresh);
    setLoadError(false);
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
    } catch {
      setLoadError(true);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Actions render server-side on first paint; only fetch client-side when
    // the server sent none (empty wallet edge cases trigger a refresh).
    void Promise.all([...(initialActions.length === 0 ? [loadActions()] : []), fetchStats()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const monthlyCreditLeft = Math.max(0, summary.monthlyCreditTotal - summary.monthlyCreditUsed);
  const monthDelta = stats.creditsClosedThisMonth - stats.creditsClosedLastMonth;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-3 animate-[fade-in_0.25s_ease_both]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-section-label">
            {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
          </p>
          <h1 className="text-page-title mt-1">
            {greetingFor(new Date().getHours())}
            {summary.firstName ? `, ${summary.firstName}` : ""}.
          </h1>
          {monthlyCreditLeft > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(monthlyCreditLeft)} in credits still on the table this month.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="h-9 shrink-0 gap-2 px-3"
          aria-label="Refresh"
          onClick={() => loadActions({ refresh: true })}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-overlay-subtle bg-card px-4 py-3">
          <p className="text-section-label min-h-[2.6em]">Credits used this month</p>
          <p className="text-stat mt-1">{formatCurrency(stats.creditsClosedThisMonth)}</p>
          <p className="text-caption mt-1 min-h-[1.4em]">
            {monthDelta > 0 ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-500">
                <ArrowUpRight className="h-3 w-3" />
                +{formatCurrency(monthDelta)} vs last month
              </span>
            ) : summary.monthlyCreditTotal > 0 ? (
              `${formatCurrency(summary.monthlyCreditUsed)} of ${formatCurrency(summary.monthlyCreditTotal)} monthly`
            ) : (
              " "
            )}
          </p>
          {summary.monthlyCreditTotal > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.round((summary.monthlyCreditUsed / summary.monthlyCreditTotal) * 100))}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col rounded-xl border border-overlay-subtle bg-card px-4 py-3">
          <p className="text-section-label min-h-[2.6em]">Expiring in 30 days</p>
          <p className={cn("text-stat mt-1", summary.expiringSoonValue > 0 && "text-amber-500")}>
            {formatCurrency(summary.expiringSoonValue)}
          </p>
          <p className="text-caption mt-1 min-h-[1.4em]">
            {summary.expiringSoonCount === 1 ? "1 credit" : `${summary.expiringSoonCount} credits`} at risk
          </p>
        </div>
        <div className="flex flex-col rounded-xl border border-overlay-subtle bg-card px-4 py-3">
          <p className="text-section-label min-h-[2.6em]">Next annual fee</p>
          {summary.nextFee ? (
            <>
              <p className="text-stat mt-1">{formatCurrency(summary.nextFee.amount)}</p>
              <p className="text-caption mt-1 min-h-[1.4em] truncate">
                {summary.nextFee.cardName} · posts {formatDateShort(summary.nextFee.date)}
              </p>
            </>
          ) : (
            <>
              <p className="text-stat mt-1">—</p>
              <p className="text-caption mt-1 min-h-[1.4em]">No fee dates on file</p>
            </>
          )}
        </div>
        <div className="flex flex-col rounded-xl border border-overlay-subtle bg-card px-4 py-3">
          <p className="text-section-label min-h-[2.6em]">Credits used this year</p>
          <p className="text-stat mt-1">{formatCurrency(stats.creditsClosed)}</p>
          <p className="text-caption mt-1 min-h-[1.4em]">across all cards</p>
        </div>
      </div>

      <Link
        href="/ask"
        className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4 transition-colors hover:border-primary/50"
      >
        <MessageCircleQuestion className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1 text-sm text-muted-foreground">Buying something? Ask which card to use…</span>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Ask</span>
      </Link>

      {summary.upcomingAlerts.length > 0 && (
        <div className="rounded-2xl border border-overlay-subtle bg-card p-4">
          <h2 className="text-base font-bold">Coming up</h2>
          <div>
            {summary.upcomingAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.linkHref}
                className="flex items-center gap-3 border-t border-overlay-subtle py-3 first:border-t-0 first:pt-3 hover:bg-overlay-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{alert.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{alert.body}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {formatDateShort(alert.eventDate)}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/alerts" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
            All alerts →
          </Link>
        </div>
      )}

      {isPremium && (
        <CopilotStatusBar onActionsRefreshed={() => loadActions({ refresh: false })} />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">We couldn&apos;t load your tasks.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Check your connection and try again — your data is safe.
          </p>
          <Button className="mt-4 h-10 gap-2" onClick={() => loadActions()} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Try again
          </Button>
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">You&apos;re all caught up.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            This page lists card tasks worth doing — credits to use, fees coming up, bonuses to finish.
            Add cards and benefits in your Wallet to give Chris more to work with.
          </p>
          <Button className="mt-4 h-10 gap-2" onClick={() => loadActions({ refresh: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Check again
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
                <Link href="/settings#subscription" className="font-medium text-primary hover:underline">Upgrade</Link>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {visibleSections.map(({ key, items }) => (
            <section key={key} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <h2 className={cn("text-sm font-semibold", key === "Do Now" && "text-primary")}>{key}</h2>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold",
                    key === "Do Now"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-overlay-subtle bg-overlay-hover text-muted-foreground",
                  )}
                >
                  {items.length}
                </span>
                <span className="h-px flex-1 bg-overlay-subtle" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {items.map((action) => (
                  <div key={action.id} id={`action-${action.id}`} className="scroll-mt-24">
                    <ActionCard action={action} urgent={key === "Do Now"} onChanged={removeAction} />
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
                <Link href="/settings#subscription" className="font-medium text-primary hover:underline">Upgrade</Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
