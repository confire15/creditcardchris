export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { addDays, format, parseISO, differenceInDays } from "date-fns";

// Send reminders at 30, 7, and 1 day before annual fee date
const REMIND_DAYS = [30, 7, 1];

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:hello@creditcardchris.com", publicKey, privateKey);

  const supabase = await createClient();
  const today = new Date();

  // Find cards with annual fee dates coming up
  const { data: cards } = await supabase
    .from("user_cards")
    .select("id, user_id, nickname, annual_fee_date, card_template:card_templates(name, annual_fee)")
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
      const annualFee = tmpl?.annual_fee ?? 0;

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
        url: "/wallet",
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
}
