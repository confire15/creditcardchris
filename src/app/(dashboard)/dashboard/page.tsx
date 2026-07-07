import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent, type TodaySummary } from "@/components/dashboard/dashboard-content";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { loadUpcomingAlerts } from "@/lib/alerts/load-upcoming-alerts";
import { getNextResetDate } from "@/lib/utils/perks";
import { differenceInDays } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | Credit Card Chris",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const scopedIds = await getHouseholdMemberIds(supabase, user.id);

  const now = new Date();
  const [{ data: cards }, { data: sub }, { data: perks }, { data: feeCards }, upcomingAlerts] = await Promise.all([
    supabase.from("user_cards").select("id").in("user_id", scopedIds).eq("is_active", true).limit(1),
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single(),
    supabase
      .from("card_perks")
      .select(
        "reset_cadence, reset_month, last_reset_at, value_type, annual_value, used_value, annual_count, used_count, is_redeemed"
      )
      .in("user_id", scopedIds)
      .eq("is_active", true)
      .eq("value_type", "dollar"),
    supabase
      .from("user_cards")
      .select("nickname, custom_name, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)")
      .in("user_id", scopedIds)
      .eq("is_active", true)
      .not("annual_fee_date", "is", null)
      .gte("annual_fee_date", now.toISOString().slice(0, 10))
      .order("annual_fee_date", { ascending: true })
      .limit(1),
    loadUpcomingAlerts({ supabase, userId: user.id }),
  ]);

  if (!cards?.length) redirect("/onboarding");

  const isPremium = isPremiumPlan(sub);

  let monthlyCreditTotal = 0;
  let monthlyCreditUsed = 0;
  let expiringSoonValue = 0;
  let expiringSoonCount = 0;
  for (const perk of perks ?? []) {
    const total = Number(perk.annual_value ?? 0);
    const used = Math.min(Number(perk.used_value ?? 0), total);
    const remaining = total - used;
    if (perk.reset_cadence === "monthly") {
      monthlyCreditTotal += total;
      monthlyCreditUsed += used;
    }
    if (remaining > 0 && differenceInDays(getNextResetDate(perk), now) <= 30) {
      expiringSoonValue += remaining;
      expiringSoonCount += 1;
    }
  }

  const feeCard = feeCards?.[0];
  const feeTemplate = Array.isArray(feeCard?.card_template) ? feeCard?.card_template[0] : feeCard?.card_template;
  const feeAmount = feeCard ? Number(feeCard.custom_annual_fee ?? feeTemplate?.annual_fee ?? 0) : 0;
  const nextFee =
    feeCard && feeCard.annual_fee_date && feeAmount > 0
      ? {
          cardName: feeCard.nickname || feeTemplate?.name || feeCard.custom_name || "Unknown Card",
          amount: feeAmount,
          date: feeCard.annual_fee_date,
        }
      : null;

  const firstName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.split(" ")[0]) || null;

  const summary: TodaySummary = {
    firstName,
    monthlyCreditTotal,
    monthlyCreditUsed,
    expiringSoonValue,
    expiringSoonCount,
    nextFee,
    upcomingAlerts: upcomingAlerts.slice(0, 3).map((alert) => ({
      id: alert.id,
      title: alert.title,
      body: alert.body,
      linkHref: alert.linkHref,
      eventDate: alert.eventDate,
    })),
  };

  return <DashboardContent userId={user.id} isPremium={isPremium} summary={summary} />;
}
