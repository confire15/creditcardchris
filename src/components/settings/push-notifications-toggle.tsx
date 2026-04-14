"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationsToggle({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }

    const supabase = createClient();
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setIsPremium(data?.plan === "premium" && data?.status === "active");
      });
  }, [userId]);

  async function subscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications blocked. Enable them in browser settings.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      toast.error("Failed to enable notifications");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (err) {
      toast.error("Failed to disable notifications");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const alertTypes = [
    { label: "30-day annual fee reminder", premium: false },
    { label: "7-day & 1-day fee reminders", premium: true },
    { label: "Perk reset alerts", premium: true },
    { label: "Budget alerts", premium: true },
  ];

  function getDescription() {
    if (subscribed) {
      return isPremium
        ? "You'll receive 30, 7, and 1-day annual fee reminders, perk reset alerts, and budget alerts."
        : "You'll receive 30-day annual fee reminders. Upgrade to Premium for 7-day & 1-day reminders, perk reset alerts, and budget alerts.";
    }
    return isPremium
      ? "Get annual fee reminders at 30, 7, and 1 day out, plus perk reset and budget alerts."
      : "Get 30-day annual fee reminders. Premium includes 7-day & 1-day reminders, perk reset alerts, and budget alerts.";
  }

  if (!supported) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Push Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {subscribed ? (
            <BellRing className="w-5 h-5 text-primary" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-base font-semibold">Push Notifications</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getDescription()}
            </p>
          </div>
        </div>
        <Button
          variant={subscribed ? "outline" : "default"}
          size="sm"
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          className="flex-shrink-0 ml-4"
        >
          {loading ? "..." : subscribed ? "Disable" : "Enable"}
        </Button>
      </div>

      {subscribed && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {alertTypes.map(({ label, premium }) => {
            const active = !premium || isPremium;
            return (
              <div key={label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {active ? (
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>
                    {label}
                  </span>
                </div>
                {!active && (
                  <Link
                    href="/settings"
                    className="text-xs text-primary hover:underline flex-shrink-0 ml-2"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
