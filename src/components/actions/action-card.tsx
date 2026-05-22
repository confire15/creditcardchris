"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { executeActionIntent } from "@/lib/actions/client-intents";
import type { UserActionRow } from "@/lib/actions/schemas";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

const actionMeta: Record<string, { label: string; icon: typeof Sparkles; tone: string }> = {
  credit_capture: { label: "Credit", icon: Gift, tone: "text-emerald-500 bg-emerald-500/10" },
  credit_action: { label: "Close credit", icon: Gift, tone: "text-emerald-500 bg-emerald-500/10" },
  renewal_rescue: { label: "Renewal", icon: CalendarClock, tone: "text-amber-500 bg-amber-500/10" },
  offer_matcher: { label: "Offer", icon: Sparkles, tone: "text-blue-500 bg-blue-500/10" },
  sub_pace: { label: "Bonus", icon: Target, tone: "text-orange-500 bg-orange-500/10" },
  points_expiration: { label: "Points", icon: WalletCards, tone: "text-violet-500 bg-violet-500/10" },
  purchase_rule: { label: "Rule", icon: BadgeCheck, tone: "text-primary bg-primary/10" },
  data_cleanup: { label: "Setup", icon: Sparkles, tone: "text-muted-foreground bg-muted" },
  alert: { label: "Alert", icon: Bell, tone: "text-red-500 bg-red-500/10" },
};

function dueLabel(action: UserActionRow) {
  const stamp = action.due_at ?? action.expires_at;
  if (!stamp) return null;
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  const days = Math.ceil(diffMs / 86_400_000);
  if (days <= 0) return "Due now";
  if (days === 1) return "1 day";
  if (days <= 30) return `${days} days`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function ActionCard({
  action,
  compact = false,
  onChanged,
}: {
  action: UserActionRow;
  compact?: boolean;
  onChanged?: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"start" | "done" | "snooze" | "dismiss" | null>(null);
  const meta = actionMeta[action.action_type] ?? { label: "Action", icon: Sparkles, tone: "text-primary bg-primary/10" };
  const Icon = meta.icon;
  const label = dueLabel(action);

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Action update failed");
    return data;
  }

  async function recordStart() {
    await post(`/api/actions/${action.id}/start`);
  }

  async function start() {
    setBusy("start");
    try {
      await executeActionIntent(action.proposed_action, {
        navigate: (href) => router.push(href),
        openExternal: (href) => window.open(href, "_blank", "noopener,noreferrer"),
        assignLocation: (href) => window.location.assign(href),
        copyText: (text) => navigator.clipboard.writeText(text),
        start: recordStart,
        complete,
        onCopied: () => toast.success("Copied"),
        onStartError: () => toast.error("Action opened, but Chris could not update its status."),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action update failed");
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    setBusy("done");
    try {
      await post(`/api/actions/${action.id}/complete`);
      onChanged?.(action.id);
      toast.success("Marked done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete action");
    } finally {
      setBusy(null);
    }
  }

  async function snooze() {
    setBusy("snooze");
    try {
      await post(`/api/actions/${action.id}/snooze`, { days: 3 });
      onChanged?.(action.id);
      toast.success("Snoozed for 3 days");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not snooze action");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("dismiss");
    try {
      await post(`/api/actions/${action.id}/dismiss`);
      onChanged?.(action.id);
      toast.success("Dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss action");
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
            {label && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {label}
              </span>
            )}
            {action.value_estimate_cents ? (
              <span className="text-xs font-medium text-emerald-500">
                {formatCurrency(action.value_estimate_cents / 100)}
              </span>
            ) : null}
          </div>
          <h3 className={cn("mt-2 font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
            {action.title}
          </h3>
          <p className={cn("mt-1 text-muted-foreground", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {action.rationale}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" disabled={busy !== null} onClick={dismiss}>
          {busy === "dismiss" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          <span className={compact ? "sr-only" : ""}>Not useful</span>
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={busy !== null} onClick={snooze}>
          {busy === "snooze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          <span className={compact ? "sr-only" : ""}>Snooze</span>
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={busy !== null} onClick={complete}>
          {busy === "done" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span className={compact ? "sr-only" : ""}>Done</span>
        </Button>
        <Button type="button" size="sm" className="h-9 gap-1.5" disabled={busy !== null} onClick={start}>
          {busy === "start" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : action.proposed_action.type === "copy_text" ? (
            <Copy className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {action.proposed_action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
