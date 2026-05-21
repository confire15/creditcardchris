import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { loadAnnualFeeEvents } from "@/lib/annual-fees/load-annual-fee-events";
import { AnnualFeeCalendarPage } from "@/components/annual-fees/annual-fee-calendar-page";

export const metadata: Metadata = {
  title: "Annual Fees | Credit Card Chris",
  description: "See upcoming credit card annual fees and whether each card is worth keeping.",
};

export default async function AnnualFeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/annual-fees");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPremium = isPremiumPlan(subscription);
  const allEvents = await loadAnnualFeeEvents({ supabase, userId: user.id });
  const visibleEvents = isPremium ? allEvents : allEvents.slice(0, 1);

  return (
    <AnnualFeeCalendarPage
      userId={user.id}
      isPremium={isPremium}
      events={visibleEvents}
      lockedCount={isPremium ? 0 : Math.max(allEvents.length - visibleEvents.length, 0)}
      totalCount={allEvents.length}
    />
  );
}
