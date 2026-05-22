"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, Clock3, DatabaseZap, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { PremiumGate } from "@/components/premium/premium-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AgentRecommendationRow, AgentRunSummary } from "@/lib/agentic/schemas";
import { RecommendationCard } from "./recommendation-card";

const GROUP_LABELS: Record<string, string> = {
  credit_capture: "Capture Value",
  renewal_rescue: "Renewals",
  offer_matcher: "Offers",
  sub_pace: "Spend Pace",
  points_expiration: "Points",
  purchase_rule: "Swipe Rules",
  data_cleanup: "Data Cleanup",
};

function PreviewList() {
  return (
    <div className="space-y-3">
      {["Capture unused credits", "Review annual-fee cards", "Set default swipe rules"].map((title) => (
        <div key={title} className="rounded-2xl border border-overlay-subtle bg-card p-4">
          <div className="mb-3 h-4 w-32 rounded bg-muted" />
          <div className="h-5 w-56 rounded bg-muted" />
          <div className="mt-2 h-3 w-full rounded bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

function formatRunTime(run: AgentRunSummary | null) {
  if (!run) return "Not run yet";
  const stamp = run.completed_at ?? run.started_at ?? run.created_at;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(stamp));
}

function RunStatusStrip({
  lastRun,
  activeCount,
  running,
  message,
}: {
  lastRun: AgentRunSummary | null;
  activeCount: number;
  running: boolean;
  message?: string | null;
}) {
  const failed = lastRun?.status === "failed";
  return (
    <div className="rounded-2xl border border-overlay-subtle bg-card p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={failed ? "text-destructive" : "text-muted-foreground"}>
          {failed ? <AlertCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
        <span className="font-medium">{running ? "Wallet Copilot is running" : `Last run: ${formatRunTime(lastRun)}`}</span>
        <Badge variant={failed ? "destructive" : "secondary"}>
          {activeCount} active
        </Badge>
        {lastRun && (
          <Badge variant="outline">
            {lastRun.recommendation_count} generated
          </Badge>
        )}
        {lastRun?.model_provider && (
          <Badge variant="outline">
            {lastRun.model_provider}
          </Badge>
        )}
      </div>
      {failed && lastRun?.error && (
        <p className="mt-2 text-xs text-destructive">{lastRun.error}</p>
      )}
      {message && !failed && (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

function SparseWalletGuidance({ lastRun }: { lastRun: AgentRunSummary | null }) {
  const summary = lastRun?.compact_input_summary ?? {};
  const activeCards = Number(summary.activeCards ?? 0);
  const annualFeeCards = Number(summary.annualFeeCards ?? 0);
  const activeOffers = Number(summary.activeOffers ?? 0);
  const openSubs = Number(summary.openSubs ?? 0);

  const tips = [
    activeCards === 0 ? { label: "Add cards", href: "/wallet", body: "Copilot needs a wallet before it can prioritize actions." } : null,
    annualFeeCards === 0 ? { label: "Add fee dates", href: "/wallet", body: "Renewal rescue gets stronger when annual-fee cards have renewal dates." } : null,
    activeOffers === 0 ? { label: "Track offers", href: "/wallet/offers", body: "Offer Matcher can prioritize expiring merchant offers once they are saved." } : null,
    openSubs === 0 ? { label: "Track bonuses", href: "/wallet/challenges", body: "SUB and spend-challenge pacing appears when deadlines and targets are saved." } : null,
  ].filter((tip): tip is { label: string; href: string; body: string } => Boolean(tip));

  return (
    <div className="rounded-2xl border border-dashed border-border p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <DatabaseZap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">Copilot needs more wallet signal.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The run completed, but there was not enough actionable data to create recommendations.
          </p>
        </div>
      </div>
      {tips.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {tips.map((tip) => (
            <a key={tip.href} href={tip.href} className="rounded-xl border border-overlay-subtle bg-card p-3 transition-colors hover:bg-muted/40">
              <p className="text-sm font-semibold">{tip.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tip.body}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function WalletCopilotPanel({ isPremium }: { isPremium: boolean }) {
  const [recommendations, setRecommendations] = useState<AgentRecommendationRow[]>([]);
  const [lastRun, setLastRun] = useState<AgentRunSummary | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(isPremium);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [refreshDisabledUntil, setRefreshDisabledUntil] = useState<number | null>(null);
  const autoRunAttempted = useRef(false);
  const refreshDisabled = running || (refreshDisabledUntil != null && Date.now() < refreshDisabledUntil);

  const runCopilot = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    setRunning(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/agentic/wallet-copilot/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) setRefreshDisabledUntil(Date.now() + 60_000);
        setLastRun(data.lastRun ?? null);
        throw new Error(data.error ?? "Wallet Copilot could not run");
      }
      setRecommendations(data.recommendations ?? []);
      setActiveCount(data.activeCount ?? data.recommendations?.length ?? 0);
      setLastRun(data.lastRun ?? null);
      if (!silent) toast.success("Wallet Copilot refreshed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet Copilot could not run";
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    if (!isPremium) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agentic/recommendations?limit=24", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load Wallet Copilot");
      const loadedRecommendations = data.recommendations ?? [];
      setRecommendations(loadedRecommendations);
      setActiveCount(data.activeCount ?? loadedRecommendations.length);
      setLastRun(data.lastRun ?? null);
      if (loadedRecommendations.length === 0 && !autoRunAttempted.current) {
        autoRunAttempted.current = true;
        await runCopilot({ silent: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Wallet Copilot");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [isPremium, runCopilot]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  useEffect(() => {
    if (!refreshDisabledUntil) return;
    const delay = Math.max(refreshDisabledUntil - Date.now(), 0);
    const timer = window.setTimeout(() => setRefreshDisabledUntil(null), delay);
    return () => window.clearTimeout(timer);
  }, [refreshDisabledUntil]);

  const grouped = useMemo(() => {
    return recommendations.reduce<Record<string, AgentRecommendationRow[]>>((acc, recommendation) => {
      const key = recommendation.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(recommendation);
      return acc;
    }, {});
  }, [recommendations]);

  function removeRecommendation(id: string) {
    setRecommendations((current) => current.filter((recommendation) => recommendation.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4">
      <PageHeader
        className="mb-0"
        title="Wallet Copilot"
        description="Next best actions from your cards, benefits, offers, points, renewals, and alerts."
        actions={
          isPremium ? (
            <Button className="h-10 w-full gap-2 sm:w-auto" onClick={() => runCopilot()} disabled={refreshDisabled}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          ) : null
        }
      />

      {isPremium && (
        <RunStatusStrip lastRun={lastRun} activeCount={activeCount} running={running} message={statusMessage} />
      )}

      {!isPremium ? (
        <PremiumGate isPremium={false} label="Unlock Wallet Copilot with Premium" preview={<PreviewList />}>
          <PreviewList />
        </PremiumGate>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        lastRun?.status === "completed" ? (
          <SparseWalletGuidance lastRun={lastRun} />
        ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No active copilot actions yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Run Wallet Copilot to turn your current wallet state into reviewable next actions.
          </p>
          <Button className="mt-4 h-10 gap-2" onClick={() => runCopilot()} disabled={refreshDisabled}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run Wallet Copilot
          </Button>
        </div>
        )
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => (
            <section key={type} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">{GROUP_LABELS[type] ?? "Recommended Actions"}</h2>
                <p className="text-xs text-muted-foreground">{items.length} action{items.length === 1 ? "" : "s"}</p>
              </div>
              <div className="space-y-3">
                {items.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onChanged={removeRecommendation}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
