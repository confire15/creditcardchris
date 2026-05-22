"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BadgePercent,
  CalendarClock,
  ChevronRight,
  CreditCard,
  DatabaseZap,
  Gift,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentRecommendationRow } from "@/lib/agentic/schemas";
import { cn } from "@/lib/utils";

const typeMeta: Record<string, { label: string; icon: typeof Sparkles; tone: string }> = {
  credit_capture: { label: "Credit", icon: Gift, tone: "text-emerald-500 bg-emerald-500/10" },
  renewal_rescue: { label: "Renewal", icon: CalendarClock, tone: "text-amber-500 bg-amber-500/10" },
  offer_matcher: { label: "Offer", icon: BadgePercent, tone: "text-blue-500 bg-blue-500/10" },
  sub_pace: { label: "Pace", icon: Target, tone: "text-orange-500 bg-orange-500/10" },
  points_expiration: { label: "Points", icon: WalletCards, tone: "text-violet-500 bg-violet-500/10" },
  purchase_rule: { label: "Rule", icon: CreditCard, tone: "text-primary bg-primary/10" },
  data_cleanup: { label: "Cleanup", icon: DatabaseZap, tone: "text-muted-foreground bg-muted" },
};

export function RecommendationCard({
  recommendation,
  compact = false,
  onChanged,
}: {
  recommendation: AgentRecommendationRow;
  compact?: boolean;
  onChanged?: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "dismiss" | null>(null);
  const meta = typeMeta[recommendation.type] ?? { label: "Action", icon: Sparkles, tone: "text-primary bg-primary/10" };
  const Icon = meta.icon;

  async function accept() {
    setBusy("accept");
    try {
      const res = await fetch(`/api/agentic/recommendations/${recommendation.id}/accept`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to accept recommendation");
      onChanged?.(recommendation.id);
      const href = data.action?.href;
      if (typeof href === "string") router.push(href);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept recommendation");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("dismiss");
    try {
      const res = await fetch(`/api/agentic/recommendations/${recommendation.id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Dismissed from Wallet Copilot" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to dismiss recommendation");
      onChanged?.(recommendation.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss recommendation");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-overlay-subtle bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{meta.label}</Badge>
            <span className="text-xs text-muted-foreground">{Math.round(recommendation.confidence * 100)}% confidence</span>
          </div>
          <h3 className={cn("mt-2 font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
            {recommendation.title}
          </h3>
          <p className={cn("mt-1 text-muted-foreground", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {recommendation.rationale}
          </p>
          {!compact && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recommendation.source_refs.slice(0, 4).map((ref) => (
                <Badge key={`${ref.type}-${ref.id}`} variant="secondary" className="max-w-full">
                  {ref.label ?? ref.type}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5"
          disabled={busy !== null}
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
          <span className={compact ? "sr-only" : ""}>Dismiss</span>
        </Button>
        <Button type="button" size="sm" className="h-9 gap-1.5" disabled={busy !== null} onClick={accept}>
          <BadgeCheck className="h-4 w-4" />
          {recommendation.proposed_action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
