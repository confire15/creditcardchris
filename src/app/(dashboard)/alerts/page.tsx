import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { loadUpcomingAlerts } from "@/lib/alerts/load-upcoming-alerts";
import { AlertsCenter } from "@/components/alerts/alerts-center";

export const metadata: Metadata = {
  title: "Alerts | Credit Card Chris",
  description: "Upcoming annual fees, expiring credits, and bonus deadlines for your cards.",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPremium = isPremiumPlan(subscription);

  const alerts = await loadUpcomingAlerts({ supabase, userId: user.id });

  return <AlertsCenter userId={user.id} isPremium={isPremium} alerts={alerts} />;
}
