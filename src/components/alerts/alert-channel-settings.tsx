"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function AlertChannelSettings({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
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

    supabase
      .from("notification_preferences")
      .select("email_enabled, sms_enabled, phone_number")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setEmailEnabled(data.email_enabled);
        setSmsEnabled(data.sms_enabled);
        setPhoneNumber(data.phone_number ?? "");
        setPhoneSaved(data.phone_number ?? "");
      });
  }, [supabase, userId]);

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

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error ?? "Failed to enable notifications");
        return;
      }

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

  if (!supported) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {pushSubscribed ? (
            <BellRing className="w-4 h-4 text-primary" />
          ) : (
            <Bell className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Push notifications</span>
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

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Mail className={`w-4 h-4 ${emailEnabled ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium">Email alerts</span>
        </div>
        <Button
          variant={emailEnabled ? "outline" : "default"}
          size="sm"
          onClick={toggleEmail}
          disabled={saving}
        >
          {emailEnabled ? "Disable" : "Enable"}
        </Button>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className={`w-4 h-4 ${smsEnabled ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Text alerts</span>
          </div>
          <Button
            variant={smsEnabled ? "outline" : "default"}
            size="sm"
            onClick={toggleSms}
            disabled={saving}
          >
            {smsEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="tel"
            placeholder="+15551234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="max-w-[220px] h-8 text-sm"
          />
          {phoneNumber !== phoneSaved && (
            <Button variant="outline" size="sm" onClick={savePhone} disabled={saving}>
              {saving ? "..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
