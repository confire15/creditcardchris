export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { getPremiumUserIds } from "@/lib/api/get-premium-user-ids";
import { sendAlert } from "@/lib/notifications/send-alert";
import { addYears, differenceInDays, format, parseISO } from "date-fns";
import type { CardPerk } from "@/lib/types/database";

// Remind at 30 and 7 days before reset
const REMIND_DAYS = [30, 7];

function getNextResetDate(perk: CardPerk): Date {
  const today = new Date();
  const month = (perk.reset_month ?? 1) - 1;

  if (perk.reset_cadence === "monthly") {
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }
  if (perk.reset_cadence === "calendar_year") {
    const thisYear = new Date(today.getFullYear(), month, 1);
    return today >= thisYear
      ? new Date(today.getFullYear() + 1, month, 1)
      : thisYear;
  }
  // annual
  if (perk.last_reset_at) {
    return addYears(parseISO(perk.last_reset_at), 1);
  }
  const thisYear = new Date(today.getFullYear(), month, 1);
  return today >= thisYear
    ? new Date(today.getFullYear() + 1, month, 1)
    : thisYear;
}

export const POST = withCron(async () => {
  const env = serverEnv();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:hello@creditcardchris.com", publicKey, privateKey);

  const supabase = createServiceClient();
  const today = new Date();

  // Fetch all active perks with notifications enabled
  const { data: perks } = await supabase
    .from("card_perks")
    .select("*")
    .eq("is_active", true)
    .eq("notify_before_reset", true);

  if (!perks?.length) return NextResponse.json({ sent: 0 });

  // Group eligible perks by user_id
  const userAlerts: Record<string, { perk: CardPerk; daysLeft: number; resetDate: Date }[]> = {};

  for (const perk of perks as CardPerk[]) {
    const resetDate = getNextResetDate(perk);
    const daysLeft = differenceInDays(resetDate, today);

    if (!REMIND_DAYS.includes(daysLeft)) continue;
    if (daysLeft !== perk.notify_days_before && !REMIND_DAYS.includes(daysLeft)) continue;

    // Only alert if there's something left to use
    const hasValue =
      (perk.value_type === "dollar" && (perk.annual_value ?? 0) - (perk.used_value ?? 0) > 0) ||
      (perk.value_type === "count" && (perk.annual_count ?? 0) - (perk.used_count ?? 0) > 0) ||
      (perk.value_type === "boolean" && !perk.is_redeemed);

    if (!hasValue) continue;

    if (!userAlerts[perk.user_id]) userAlerts[perk.user_id] = [];
    userAlerts[perk.user_id].push({ perk, daysLeft, resetDate });
  }

  const userIds = Object.keys(userAlerts);
  const premiumUserIds = await getPremiumUserIds(supabase, userIds);

  // Batch-fetch user emails for email/SMS channels
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!])
  );

  let sent = 0;

  await Promise.allSettled(
    Object.entries(userAlerts).map(async ([userId, alerts]) => {
      if (!premiumUserIds.has(userId)) return;

      for (const { perk, daysLeft, resetDate } of alerts) {
        let remaining = "";
        if (perk.value_type === "dollar" && perk.annual_value) {
          const left = perk.annual_value - (perk.used_value ?? 0);
          remaining = `$${left.toFixed(0)} unused`;
        } else if (perk.value_type === "count" && perk.annual_count) {
          const left = perk.annual_count - (perk.used_count ?? 0);
          remaining = `${left} use${left !== 1 ? "s" : ""} remaining`;
        } else {
          remaining = "not yet redeemed";
        }

        const body =
          daysLeft <= 1
            ? `${perk.name}: ${remaining} — resets tomorrow!`
            : `${perk.name}: ${remaining} — resets ${format(resetDate, "MMM d")} (${daysLeft} days)`;

        const delivered = await sendAlert(
          supabase,
          userId,
          emailMap.get(userId),
          { title: "Perk Expiring Soon", body, url: "/perks" },
          true
        );
        sent += delivered;
      }
    })
  );

  return NextResponse.json({ sent });
});

export const GET = POST;
