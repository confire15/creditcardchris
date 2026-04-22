export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { getPremiumUserIds } from "@/lib/api/get-premium-user-ids";
import { sendAlert } from "@/lib/notifications/send-alert";
import { addYears, differenceInDays, endOfMonth, format, parseISO, startOfDay } from "date-fns";
import type { CardPerk } from "@/lib/types/database";

// Remind at 30 and 7 days before reset
const REMIND_DAYS = [30, 7];
const MONTHLY_CREDIT_IDLE_DAYS = 21;
const MONTHLY_CREDIT_NUDGE_WINDOW_DAYS = 7;

type MonthlyStatementCredit = {
  id: string;
  user_id: string;
  name: string;
  annual_amount: number;
  used_amount: number;
  updated_at: string;
};

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

function isMonthlyCreditName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("/mo") || n.includes("monthly") || n.includes("per month");
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
  const monthlyCreditAlerts: Record<
    string,
    { creditName: string; remaining: number; daysLeft: number; resetDate: Date }[]
  > = {};

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

  // Monthly statement-credit nudge:
  // if usage has been idle for 21+ days and month-end reset is within 7 days.
  const monthEnd = endOfMonth(today);
  const monthlyCreditDaysLeft = differenceInDays(monthEnd, today);
  if (monthlyCreditDaysLeft >= 0 && monthlyCreditDaysLeft <= MONTHLY_CREDIT_NUDGE_WINDOW_DAYS) {
    const { data: credits } = await supabase
      .from("statement_credits")
      .select("id, user_id, name, annual_amount, used_amount, updated_at");

    for (const credit of (credits ?? []) as MonthlyStatementCredit[]) {
      if (!isMonthlyCreditName(credit.name)) continue;
      const remaining = (credit.annual_amount ?? 0) - (credit.used_amount ?? 0);
      if (remaining <= 0) continue;

      const lastMovedDaysAgo = differenceInDays(today, startOfDay(parseISO(credit.updated_at)));
      if (lastMovedDaysAgo < MONTHLY_CREDIT_IDLE_DAYS) continue;

      if (!monthlyCreditAlerts[credit.user_id]) monthlyCreditAlerts[credit.user_id] = [];
      monthlyCreditAlerts[credit.user_id].push({
        creditName: credit.name,
        remaining,
        daysLeft: monthlyCreditDaysLeft,
        resetDate: monthEnd,
      });
    }
  }

  const alertUserIds = Array.from(
    new Set([...Object.keys(userAlerts), ...Object.keys(monthlyCreditAlerts)])
  );
  if (!alertUserIds.length) return NextResponse.json({ sent: 0 });

  // Batch-fetch user emails for email/SMS channels
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!])
  );

  const premiumUserIds = await getPremiumUserIds(supabase, alertUserIds);

  let sent = 0;

  await Promise.allSettled(
    alertUserIds.map(async (userId) => {
      const perkAlerts = userAlerts[userId] ?? [];
      const idleMonthlyCredits = monthlyCreditAlerts[userId] ?? [];

      for (const { perk, daysLeft, resetDate } of perkAlerts) {
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

      for (const credit of idleMonthlyCredits) {
        const body =
          credit.daysLeft <= 1
            ? `${credit.creditName}: $${credit.remaining.toFixed(0)} unused — resets tomorrow!`
            : `${credit.creditName}: $${credit.remaining.toFixed(0)} unused — resets ${format(
                credit.resetDate,
                "MMM d"
              )} (${credit.daysLeft} days)`;

        // sendAlert always sends push for all tiers; email/SMS remain premium-only.
        const delivered = await sendAlert(
          supabase,
          userId,
          emailMap.get(userId),
          { title: "Monthly Credit Check-In", body, url: "/benefits" },
          premiumUserIds.has(userId)
        );
        sent += delivered;
      }
    })
  );

  return NextResponse.json({ sent });
});

export const GET = POST;
