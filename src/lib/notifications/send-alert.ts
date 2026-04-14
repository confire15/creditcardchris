import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { sendEmailAlert } from "./send-email-alert";
import { sendSmsAlert } from "./send-sms-alert";

interface AlertPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Send an alert to a user across all their enabled channels.
 * Returns the number of successful deliveries.
 *
 * Push: gated by push_subscriptions existence (backwards-compatible).
 * Email & SMS: premium-only, gated by notification_preferences.
 */
export async function sendAlert(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  payload: AlertPayload,
  isPremium: boolean
): Promise<number> {
  let sent = 0;

  // Push: always attempt if user has push subscriptions
  const { data: pushSubs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (pushSubs?.length) {
    const pushPayload = JSON.stringify(payload);
    for (const sub of pushSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
        sent++;
      } catch {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  // Email & SMS: premium-only
  if (!isPremium) return sent;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_enabled, sms_enabled, phone_number")
    .eq("user_id", userId)
    .single();

  if (!prefs) return sent;

  if (prefs.email_enabled && userEmail) {
    const ok = await sendEmailAlert({
      to: userEmail,
      subject: `Credit Card Chris: ${payload.title}`,
      title: payload.title,
      body: payload.body,
      url: `https://creditcardchris.com${payload.url}`,
    });
    if (ok) sent++;
  }

  if (prefs.sms_enabled && prefs.phone_number) {
    const ok = await sendSmsAlert({
      to: prefs.phone_number,
      body: `[Credit Card Chris] ${payload.body}`,
    });
    if (ok) sent++;
  }

  return sent;
}
