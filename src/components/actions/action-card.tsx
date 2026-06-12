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
import { Button } from "@/components/ui/button";
import { executeActionIntent } from "@/lib/actions/client-intents";
import type { UserActionRow } from "@/lib/actions/schemas";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

const actionMeta: Record<string, { label: string; icon: typeof Sparkles; text: string; bg: string }> = {
  credit_capture: { label: "Credit", icon: Gift, text: "text-emerald-500", bg: "bg-emerald-500/10" },
  credit_action: { label: "Close credit", icon: Gift, text: "text-emerald-500", bg: "bg-emerald-500/10" },
  renewal_rescue: { label: "Renewal", icon: CalendarClock, text: "text-amber-500", bg: "bg-amber-500/10" },
  offer_matcher: { label: "Offer", icon: Sparkles, text: "text-blue-500", bg: "bg-blue-500/10" },
  sub_pace: { label: "Bonus", icon: Target, text: "text-orange-500", bg: "bg-orange-500/10" },
  points_expiration: { label: "Points", icon: WalletCards, text: "text-violet-500", bg: "bg-violet-500/10" },
  purchase_rule: { label: "Rule", icon: BadgeCheck, text: "text-primary", bg: "bg-primary/10" },
  data_cleanup: { label: "Setup", icon: Sparkles, text: "text-muted-foreground", bg: "bg-muted" },
  alert: { label: "Alert", icon: Bell, text: "text-red-500", bg: "bg-red-500/10" },
};

function dueInfo(action: UserActionRow): { label: string; hot: boolean } | null {
  const stamp = action.due_at ?? action.expires_at;
  if (!stamp) return null;
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  const days = Math.ceil(diffMs / 86_400_000);
  if (days <= 0) return { label: "Due now", hot: true };
  if (days === 1) return { label: "1 day", hot: true };
  if (days <= 30) return { label: `${days} days`, hot: days <= 2 };
  return {
    label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
    hot: false,
  };
}

export function ActionCard({
  action,
  compact = false,
  urgent = false,
  onChanged,
}: {
  action: UserActionRow;
  compact?: boolean;
  urgent?: boolean;
  onChanged?: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"start" | "done" | "snooze" | "dismiss" | null>(null);
  const meta = actionMeta[action.action_type] ?? { label: "Action", icon: Sparkles, text: "text-primary", bg: "bg-primary/10" };
  const Icon = meta.icon;
  const due = dueInfo(action);

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
    <article
      className={cn(
        "rounded-2xl border border-overlay-subtle bg-card p-4 transition-colors hover:border-border",
        urgent && "border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.text, meta.bg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", meta.text)}>{meta.label}</span>
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold",
                  due.hot
                    ? "border-primary/35 bg-primary/[0.08] text-primary"
                    : "border-overlay-subtle text-muted-foreground",
                )}
              >
                <Clock3 className="h-3 w-3" />
                {due.label}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug">
            {action.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {action.rationale}
          </p>
        </div>
        {action.value_estimate_cents ? (
          <div className="shrink-0 text-right">
            <p className="font-heading text-lg font-bold leading-tight">
              {formatCurrency(action.value_estimate_cents / 100)}
            </p>
            <p className="text-[10px] text-muted-foreground">at stake</p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy !== null} onClick={start}>
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
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy !== null} onClick={complete}>
          {busy === "done" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span className={compact ? "sr-only" : ""}>Done</span>
        </Button>
        <span className="flex-1" aria-hidden="true" />
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy !== null} onClick={snooze}>
          {busy === "snooze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          <span className={compact ? "sr-only" : ""}>Snooze</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled={busy !== null} onClick={dismiss} aria-label="Not useful">
          {busy === "dismiss" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
    </article>
  );
}
