"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Download,
  ExternalLink,
  Lock,
  Scale,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { goPremium } from "@/lib/utils/upgrade";
import {
  annualFeeDateLabel,
  annualFeeWorthLabel,
  formatAmount,
  type AnnualFeeEvent,
  type AnnualFeeWorthStatus,
} from "@/lib/utils/annual-fees";

type ReminderState = Record<string, { enabled: boolean; days: number[] }>;

const REMINDER_DAY_OPTIONS = [30, 7, 1];

const worthConfig: Record<AnnualFeeWorthStatus, { className: string; icon: typeof CheckCircle2 }> = {
  worth_it: { className: "border-success/30 bg-success/15 text-success", icon: CheckCircle2 },
  close_call: { className: "border-warning/30 bg-warning/15 text-warning", icon: TriangleAlert },
  not_worth_it: { className: "border-danger/30 bg-danger/15 text-danger", icon: TriangleAlert },
  needs_data: { className: "border-border bg-muted/50 text-muted-foreground", icon: Scale },
};

function formatDays(daysUntil: number | null) {
  if (daysUntil == null) return "Set date";
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `${daysUntil} days`;
}

function monthKey(event: AnnualFeeEvent) {
  return event.dueDate ? event.dueDate.slice(0, 7) : "missing";
}

function monthLabel(key: string) {
  if (key === "missing") return "Date needed";
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function AnnualFeeCalendarPage({
  isPremium,
  events,
  lockedCount,
  totalCount,
}: {
  userId: string;
  isPremium: boolean;
  events: AnnualFeeEvent[];
  lockedCount: number;
  totalCount: number;
}) {
  const [upgrading, setUpgrading] = useState(false);
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [reminderState, setReminderState] = useState<ReminderState>(() =>
    Object.fromEntries(
      events.map((event) => [
        event.userCardId,
        { enabled: event.remindersEnabled, days: event.reminderDays },
      ]),
    ),
  );

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, AnnualFeeEvent[]>();
    for (const event of events) {
      const key = monthKey(event);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()];
  }, [events]);

  const totals = useMemo(() => {
    const dated = events.filter((event) => event.dueDate);
    const next = dated[0] ?? null;
    const ninetyDayTotal = dated
      .filter((event) => event.daysUntil != null && event.daysUntil >= 0 && event.daysUntil <= 90)
      .reduce((sum, event) => sum + event.annualFee, 0);
    const weakCount = events.filter((event) => event.worthStatus === "not_worth_it").length;
    const totalFees = events.reduce((sum, event) => sum + event.annualFee, 0);
    return { next, ninetyDayTotal, weakCount, totalFees };
  }, [events]);

  async function startUpgrade() {
    setUpgrading(true);
    await goPremium({ successPath: "/wallet?tab=annual-fees&upgraded=true", cancelPath: "/wallet?tab=annual-fees" });
    setUpgrading(false);
  }

  async function saveReminderSettings(userCardId: string, nextState: { enabled: boolean; days: number[] }) {
    setReminderState((prev) => ({ ...prev, [userCardId]: nextState }));
    setSavingCardId(userCardId);
    try {
      const res = await fetch("/api/annual-fees/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCardId,
          enabled: nextState.enabled,
          reminderDays: nextState.days,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save reminder");
      toast.success("Annual fee reminders updated");
    } catch (err) {
      const original = events.find((event) => event.userCardId === userCardId);
      if (original) {
        setReminderState((prev) => ({
          ...prev,
          [userCardId]: { enabled: original.remindersEnabled, days: original.reminderDays },
        }));
      }
      toast.error(err instanceof Error ? err.message : "Failed to save reminder");
    } finally {
      setSavingCardId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-28">
      <PageHeader
        className="mb-0"
        title="Annual Fees"
        description="Upcoming card fees with a quick worth-it check."
        actions={
          isPremium && events.some((event) => event.dueDate) ? (
            <Button asChild variant="outline" className="gap-2">
              <a href="/api/annual-fees/calendar.ics">
                <Download className="w-4 h-4" />
                Export
              </a>
            </Button>
          ) : null
        }
      />

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CalendarClock className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-semibold">No annual-fee cards yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add a card with an annual fee to your wallet to start tracking renewal dates.
            </p>
            <Button asChild className="mt-5">
              <Link href="/wallet">Open Wallet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Next fee" value={totals.next ? `$${formatAmount(totals.next.annualFee)}` : "None"} detail={totals.next?.cardName ?? "No dated fees"} />
            <StatCard label="90 days" value={`$${formatAmount(totals.ninetyDayTotal)}`} detail="Upcoming fees" />
            <StatCard label="Annual total" value={`$${formatAmount(totals.totalFees)}`} detail={`${events.length}${lockedCount ? ` of ${totalCount}` : ""} shown`} />
            <StatCard label="Review" value={String(totals.weakCount)} detail="Not worth it" tone={totals.weakCount > 0 ? "red" : "green"} />
          </div>

          {!isPremium && (
            <Card className="border-primary/30 bg-primary/[0.04]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Full annual fee calendar
                </CardTitle>
                <CardDescription>
                  Free shows the next fee. Premium unlocks all upcoming fees, reminder controls, and calendar export.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={startUpgrade} disabled={upgrading} className="w-full sm:w-auto">
                  {upgrading ? "Redirecting..." : "Upgrade to Premium - $3.99/mo"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-5">
            {groupedEvents.map(([key, group]) => (
              <section key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">{monthLabel(key)}</h2>
                  <span className="text-xs text-muted-foreground">
                    {group.length} fee{group.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.map((event) => (
                    <AnnualFeeRow
                      key={event.userCardId}
                      event={event}
                      isPremium={isPremium}
                      reminderState={reminderState[event.userCardId] ?? { enabled: event.remindersEnabled, days: event.reminderDays }}
                      saving={savingCardId === event.userCardId}
                      onReminderChange={(nextState) => saveReminderSettings(event.userCardId, nextState)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {!isPremium && lockedCount > 0 && (
              <LockedPreviewRows lockedCount={lockedCount} onUpgrade={startUpgrade} upgrading={upgrading} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone = "muted",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "muted" | "red" | "green";
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card px-4 py-3",
      tone === "red" && "border-danger/25 bg-danger/[0.04]",
      tone === "green" && "border-success/25 bg-success/[0.04]",
    )}>
      <p className="text-2xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function AnnualFeeRow({
  event,
  isPremium,
  reminderState,
  saving,
  onReminderChange,
}: {
  event: AnnualFeeEvent;
  isPremium: boolean;
  reminderState: { enabled: boolean; days: number[] };
  saving: boolean;
  onReminderChange: (nextState: { enabled: boolean; days: number[] }) => void;
}) {
  const config = worthConfig[event.worthStatus];
  const WorthIcon = config.icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-semibold">{event.cardName}</h3>
            <Badge variant="outline" className={cn("gap-1", config.className)}>
              <WorthIcon className="h-3 w-3" />
              {annualFeeWorthLabel(event.worthStatus)}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{event.issuer || "Issuer not set"}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>${formatAmount(event.annualFee)} fee</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{annualFeeDateLabel(event)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="rounded-xl bg-muted/40 px-3 py-2 text-center sm:min-w-24">
            <p className="text-2xs font-semibold uppercase text-muted-foreground">Due in</p>
            <p className="text-sm font-bold">{formatDays(event.daysUntil)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2 text-center sm:min-w-24">
            <p className="text-2xs font-semibold uppercase text-muted-foreground">Net</p>
            <p className={cn("text-sm font-bold", event.netValue >= 0 ? "text-success" : "text-danger")}>
              {event.netValue >= 0 ? "+" : "-"}${formatAmount(Math.abs(event.netValue))}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {event.googleCalendarUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={event.googleCalendarUrl} target="_blank" rel="noreferrer">
                <CalendarPlus className="h-4 w-4" />
                Google Calendar
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href="/keep-or-cancel">
              <Scale className="h-4 w-4" />
              Review
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/wallet">
              <ExternalLink className="h-4 w-4" />
              Wallet
            </Link>
          </Button>
        </div>

        {isPremium ? (
          <ReminderControls
            disabled={!event.canManage || !event.dueDate || saving}
            state={reminderState}
            saving={saving}
            onChange={onReminderChange}
          />
        ) : (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Premium reminders
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderControls({
  disabled,
  state,
  saving,
  onChange,
}: {
  disabled: boolean;
  state: { enabled: boolean; days: number[] };
  saving: boolean;
  onChange: (nextState: { enabled: boolean; days: number[] }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...state, enabled: !state.enabled })}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors",
          state.enabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Bell className="h-3.5 w-3.5" />
        {saving ? "Saving" : state.enabled ? "Reminders on" : "Reminders off"}
      </button>
      {REMINDER_DAY_OPTIONS.map((day) => {
        const checked = state.days.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled || !state.enabled}
            onClick={() => {
              const nextDays = checked
                ? state.days.filter((value) => value !== day)
                : [...state.days, day].sort((a, b) => b - a);
              onChange({ ...state, days: nextDays.length ? nextDays : [day] });
            }}
            className={cn(
              "h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              checked && state.enabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground",
              (disabled || !state.enabled) && "cursor-not-allowed opacity-50",
            )}
          >
            {day}d
          </button>
        );
      })}
    </div>
  );
}

function LockedPreviewRows({
  lockedCount,
  upgrading,
  onUpgrade,
}: {
  lockedCount: number;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card p-4">
      <div className="space-y-3 opacity-35 blur-[1px]">
        {Array.from({ length: Math.min(lockedCount, 3) }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-4">
            <div>
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="mt-2 h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
        <div className="max-w-xs text-center">
          <Lock className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-semibold">{lockedCount} more annual fee{lockedCount === 1 ? "" : "s"} locked</p>
          <Button onClick={onUpgrade} disabled={upgrading} size="sm" className="mt-3">
            {upgrading ? "Redirecting..." : "Unlock full calendar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
