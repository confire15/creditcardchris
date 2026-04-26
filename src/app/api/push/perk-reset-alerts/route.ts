export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { getPremiumUserIds } from "@/lib/api/get-premium-user-ids";
import { sendAlert } from "@/lib/notifications/send-alert";
import { differenceInDays, format } from "date-fns";
import type { CardPerk } from "@/lib/types/database";
import { getNextResetDate, hasPerkRemainingValue } from "@/lib/utils/perks";

// Remind at 30 and 7 days before reset
const REMIND_DAYS = [30, 7];

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

    if (!hasPerkRemainingValue(perk)) continue;

    if (!userAlerts[perk.user_id]) userAlerts[perk.user_id] = [];
    userAlerts[perk.user_id].push({ perk, daysLeft, resetDate });
  }

  // Batch-fetch user emails for email/SMS channels
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!])
  );

  const premiumUserIds = await getPremiumUserIds(supabase, Object.keys(userAlerts));

  let sent = 0;

  await Promise.allSettled(
    Object.entries(userAlerts).map(async ([userId, alerts]) => {
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
          premiumUserIds.has(userId)
        );
        sent += delivered;
      }
    })
  );

  return NextResponse.json({ sent });
});

export const GET = POST;
