"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AgentRecommendationRow } from "@/lib/agentic/schemas";
import { RecommendationCard } from "./recommendation-card";

export function WalletCopilotHome({ isPremium }: { isPremium: boolean }) {
  const [recommendations, setRecommendations] = useState<AgentRecommendationRow[]>([]);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!isPremium) return;
    let cancelled = false;
    fetch("/api/agentic/recommendations?limit=3", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.recommendations) {
          setRecommendations(data.recommendations);
          setActiveCount(data.activeCount ?? data.recommendations.length);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  function removeRecommendation(id: string) {
    setRecommendations((current) => current.filter((recommendation) => recommendation.id !== id));
  }

  if (!isPremium) {
    return (
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Wallet Copilot</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Premium turns your wallet, offers, points, and renewals into reviewable next actions.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-9 shrink-0">
            <Link href="/settings">Upgrade</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section className="rounded-2xl border border-overlay-subtle bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Wallet Copilot is ready</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run it to generate next best actions from your current wallet.
            </p>
          </div>
          <Button asChild size="sm" className="h-9 shrink-0">
            <Link href="/wallet/copilot">Open</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Wallet Copilot</h2>
          <p className="text-xs text-muted-foreground">Top actions waiting for review</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{activeCount}</Badge>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href="/wallet/copilot">View all</Link>
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            compact
            onChanged={removeRecommendation}
          />
        ))}
      </div>
    </section>
  );
}
