"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Clock,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  Mail,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { UpcomingAlert } from "@/lib/alerts/upcoming-alerts";
import { AlertChannelSettings } from "./alert-channel-settings";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

type AlertViewProps = {
  userId: string;
  isPremium: boolean;
  alerts: UpcomingAlert[];
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function formatDays(daysUntil: number): string {
  if (daysUntil <= 0) return "Now";
  if (daysUntil === 1) return "1 day";
  return `${daysUntil} days`;
}

function alertIcon(type: UpcomingAlert["type"]) {
  if (type === "annual_fee") return CreditCard;
  if (type === "perk_reset") return Gift;
  if (type === "sub_pace") return Clock;
  if (type === "challenge_milestone") return Sparkles;
  return AlertTriangle;
}

function sectionTitle(type: UpcomingAlert["type"]) {
  if (type === "annual_fee") return "Annual fee reminder";
  if (type === "perk_reset") return "Perk reset reminder";
  if (type === "sub_pace") return "SUB pace reminder";
  if (type === "challenge_milestone") return "Challenge milestone";
  return "Budget alert";
}

async function requestPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    toast.error("Notifications blocked. Enable them in browser settings.");
    return false;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    toast.error(payload.error ?? "Unable to enable push alerts");
    return false;
  }

  return true;
}

export function AlertsCenter({ userId, isPremium, alerts }: AlertViewProps) {
  const searchParams = useSearchParams();
  const [upgrading, setUpgrading] = useState(false);
  const [autoSubscribing, setAutoSubscribing] = useState(false);
  const hasUpcoming = alerts.length > 0;

  const upcomingCount = useMemo(
    () => alerts.filter((alert) => alert.daysUntil >= 0 && alert.daysUntil <= 30).length,
    [alerts]
  );

  useEffect(() => {
    if (!isPremium || searchParams.get("upgraded") !== "true") return;

    let active = true;
    (async () => {
      setAutoSubscribing(true);
      try {
        const ok = await requestPushSubscription();
        if (!active) return;
        if (ok) toast.success("Premium unlocked. Smart Alerts are now active.");
      } catch (err) {
        if (!active) return;
        toast.error("Premium unlocked. You can enable push alerts any time below.");
        console.error(err);
      } finally {
        if (active) setAutoSubscribing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isPremium, searchParams]);

  async function startCheckout() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successPath: "/alerts?upgraded=true",
          cancelPath: "/alerts",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpgrading(false);
    }
  }

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-primary/30 card-lift-shadow">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-heading tracking-tight flex items-center gap-3">
              <Bell className="w-7 h-7 text-primary" />
              Never miss an annual fee, expiring credit, or over-budget month.
            </CardTitle>
            <CardDescription className="text-base">
              Premium Smart Alerts include annual fee reminders, perk reset reminders, and over-budget alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button onClick={startCheckout} disabled={upgrading} className="w-full sm:w-auto gap-2">
              {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {upgrading ? "Redirecting..." : "Upgrade to Premium — $3.99/mo"}
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: BellRing, title: "Push", desc: "Instant reminders on your device." },
                { icon: Mail, title: "Email", desc: "A second channel so nothing gets missed." },
                { icon: Smartphone, title: "SMS", desc: "Urgent reminders by text when timing matters." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border bg-card/70 p-4">
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle>What you&apos;d be alerted about</CardTitle>
            <CardDescription>
              Preview of your next 30 days based on your current wallet, perks, and budgets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasUpcoming ? (
              <div className="relative">
                <div className="space-y-3 opacity-45 blur-[1.5px] pointer-events-none select-none">
                  {alerts.map((alert, index) => {
                    const Icon = alertIcon(alert.type);
                    return (
                      <div
                        key={alert.id}
                        className="rounded-xl border border-border bg-background/80 p-4 flex items-start gap-3 animate-[slide-up-fade_0.35s_ease_both]"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{sectionTitle(alert.type)}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-0 bg-background/35 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="rounded-2xl border border-primary/30 bg-card/90 px-6 py-4 text-center">
                    <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Unlock Smart Alerts with Premium</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Push, email, and SMS included.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No upcoming alerts right now</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add cards, perks, or budgets to generate preview alerts.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/30 card-lift-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BellRing className="w-5 h-5 text-primary" />
            Smart Alerts
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Upcoming alerts in the next 30 days:</span>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              <AnimatedNumber value={upcomingCount} /> total
            </Badge>
          </CardDescription>
        </CardHeader>
        {autoSubscribing && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Finishing alert setup...</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming alerts (next 30 days)</CardTitle>
          <CardDescription>
            Annual fees, expiring perks, and budget overruns in chronological order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasUpcoming ? (
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const Icon = alertIcon(alert.type);
                return (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 animate-[slide-up-fade_0.35s_ease_both]"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{sectionTitle(alert.type)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{alert.body}</p>
                      <Link href={alert.linkHref} className="text-xs text-primary hover:underline mt-2 inline-block">
                        Open related page
                      </Link>
                    </div>
                    <Badge variant="secondary">{formatDays(alert.daysUntil)}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No alerts coming up — you&apos;re all clear</p>
              <p className="text-sm text-muted-foreground mt-1">
                Keep your wallet and perk tracker updated to stay ahead.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery channels</CardTitle>
          <CardDescription>Manage push, email, and SMS delivery.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertChannelSettings userId={userId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert types</CardTitle>
          <CardDescription>Per-type controls are coming in a follow-up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Annual fee reminders (30/7/1 day)",
            "Perk reset reminders (30/7 day)",
            "Budget alerts (over-limit)",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card p-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-sm">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
