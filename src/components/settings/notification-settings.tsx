"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, BellRing, Mail, Smartphone, Check, Lock } from "lucide-react";
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

const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export function NotificationSettings({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSaved, setPhoneSaved] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      });
    }

    // Fetch premium status
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setIsPremium(data?.plan === "premium" && data?.status === "active");
      });

    // Fetch notification preferences
    supabase
      .from("notification_preferences")
      .select("email_enabled, sms_enabled, phone_number")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEmailEnabled(data.email_enabled);
          setSmsEnabled(data.sms_enabled);
          setPhoneNumber(data.phone_number ?? "");
          setPhoneSaved(data.phone_number ?? "");
        }
      });
  }, [userId, supabase]);

  const upsertPrefs = useCallback(
    async (updates: Record<string, boolean | string | null>) => {
      setSaving(true);
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, ...updates, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      setSaving(false);
      if (error) {
        toast.error("Failed to save notification preferences");
        return false;
      }
      return true;
    },
    [supabase, userId]
  );

  async function subscribePush() {
    setPushLoading(true);
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

      setPushSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      toast.error("Failed to enable notifications");
      console.error(err);
    } finally {
      setPushLoading(false);
    }
  }

  async function unsubscribePush() {
    setPushLoading(true);
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
      setPushSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (err) {
      toast.error("Failed to disable notifications");
      console.error(err);
    } finally {
      setPushLoading(false);
    }
  }

  async function toggleEmail() {
    const next = !emailEnabled;
    const ok = await upsertPrefs({ email_enabled: next });
    if (ok) {
      setEmailEnabled(next);
      toast.success(next ? "Email alerts enabled" : "Email alerts disabled");
    }
  }

  async function toggleSms() {
    const next = !smsEnabled;
    if (next && !phoneNumber) {
      toast.error("Enter a phone number first");
      return;
    }
    if (next && !PHONE_REGEX.test(phoneNumber)) {
      toast.error("Enter a valid phone number in E.164 format (e.g. +15551234567)");
      return;
    }
    const ok = await upsertPrefs({
      sms_enabled: next,
      phone_number: next ? phoneNumber : phoneNumber || null,
    });
    if (ok) {
      setSmsEnabled(next);
      toast.success(next ? "Text alerts enabled" : "Text alerts disabled");
    }
  }

  async function savePhone() {
    if (!phoneNumber) {
      const ok = await upsertPrefs({ phone_number: null, sms_enabled: false });
      if (ok) {
        setPhoneSaved("");
        setSmsEnabled(false);
        toast.success("Phone number removed");
      }
      return;
    }
    if (!PHONE_REGEX.test(phoneNumber)) {
      toast.error("Enter a valid phone number in E.164 format (e.g. +15551234567)");
      return;
    }
    const ok = await upsertPrefs({ phone_number: phoneNumber });
    if (ok) {
      setPhoneSaved(phoneNumber);
      toast.success("Phone number saved");
    }
  }

  const pushAlertTypes = [
    { label: "Annual fee reminders (30, 7, 1 day)", premium: false },
    { label: "Perk reset alerts", premium: false },
    { label: "Budget alerts", premium: false },
  ];

  if (!supported) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Smart Alerts</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-0">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Smart Alerts</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-7">
          Free push notifications for fees, perks, and budget. Email + SMS on Premium.
        </p>
      </div>

      {/* Push Notifications */}
      <div className="pb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            {pushSubscribed ? (
              <BellRing className="w-4 h-4 text-primary" />
            ) : (
              <Bell className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">Push Notifications</span>
          </div>
          <Button
            variant={pushSubscribed ? "outline" : "default"}
            size="sm"
            onClick={pushSubscribed ? unsubscribePush : subscribePush}
            disabled={pushLoading}
          >
            {pushLoading ? "..." : pushSubscribed ? "Disable" : "Enable"}
          </Button>
        </div>
        {pushSubscribed && (
          <div className="ml-6.5 space-y-1.5 mt-2">
            {pushAlertTypes.map(({ label, premium }) => {
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

      <div className="border-t border-border" />

      {/* Email Alerts */}
      <div className="py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className={`w-4 h-4 ${isPremium && emailEnabled ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Email Alerts</span>
                {!isPremium && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same alert types delivered to your inbox
              </p>
            </div>
          </div>
          {isPremium ? (
            <Button
              variant={emailEnabled ? "outline" : "default"}
              size="sm"
              onClick={toggleEmail}
              disabled={saving}
            >
              {emailEnabled ? "Disable" : "Enable"}
            </Button>
          ) : (
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* SMS/Text Alerts */}
      <div className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className={`w-4 h-4 ${isPremium && smsEnabled ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Text Alerts</span>
                {!isPremium && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same alerts via SMS
              </p>
            </div>
          </div>
          {isPremium ? (
            <Button
              variant={smsEnabled ? "outline" : "default"}
              size="sm"
              onClick={toggleSms}
              disabled={saving}
            >
              {smsEnabled ? "Disable" : "Enable"}
            </Button>
          ) : (
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>
        {isPremium && (
          <div className="mt-3 ml-6.5 flex items-center gap-2">
            <Input
              type="tel"
              placeholder="+15551234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="max-w-[200px] h-8 text-sm"
            />
            {phoneNumber !== phoneSaved && (
              <Button
                variant="outline"
                size="sm"
                onClick={savePhone}
                disabled={saving}
              >
                {saving ? "..." : "Save"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
