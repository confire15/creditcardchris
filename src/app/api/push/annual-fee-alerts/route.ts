export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { serverEnv } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { parseISO, differenceInDays, format } from "date-fns";

// Send reminders at 30, 7, and 1 day before annual fee date
const REMIND_DAYS = [30, 7, 1];

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

const handler = withCron(async () => {
  const env = serverEnv();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:hello@creditcardchris.com", publicKey, privateKey);

  const supabase = createServiceClient();
  const today = new Date();

  // Find cards with annual fee dates coming up (service role bypasses RLS)
  const { data: cards } = await supabase
    .from("user_cards")
    .select("id, user_id, nickname, custom_annual_fee, annual_fee_date, card_template:card_templates(name, annual_fee)")
    .not("annual_fee_date", "is", null)
    .eq("is_active", true);

  if (!cards?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  await Promise.allSettled(
    cards.map(async (card) => {
      if (!card.annual_fee_date) return;

      const feeDate = parseISO(card.annual_fee_date);
      const daysUntil = differenceInDays(feeDate, today);

      if (!REMIND_DAYS.includes(daysUntil)) return;

      const tmpl = card.card_template as { name?: string; annual_fee?: number } | null;
      const cardName = card.nickname || tmpl?.name || "Your card";
      const annualFee = card.custom_annual_fee ?? tmpl?.annual_fee ?? 0;

      if (annualFee <= 0) return; // Don't alert for no-fee cards

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", card.user_id);

      if (!subs?.length) return;

      const body =
        daysUntil === 1
          ? `${cardName} annual fee of $${annualFee} is due tomorrow.`
          : `${cardName} annual fee of $${annualFee} is due in ${daysUntil} days (${format(feeDate, "MMM d")}).`;

      const payload = JSON.stringify({
        title: "Annual Fee Reminder",
        body,
        url: "/keep-or-cancel",
      });

      await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent++;
          } catch {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        })
      );
    })
  );

  return NextResponse.json({ sent });
});

// Vercel crons invoke via GET; also support POST for manual triggers
export const GET = handler;
export const POST = handler;
