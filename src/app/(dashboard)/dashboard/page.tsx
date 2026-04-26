import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Credit Card Chris",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const scopedIds = await getHouseholdMemberIds(supabase, user.id);

  const { data: cards } = await supabase
    .from("user_cards")
    .select("id")
    .in("user_id", scopedIds)
    .eq("is_active", true)
    .limit(1);

  if (!cards?.length) redirect("/onboarding");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = isPremiumPlan(sub);

  return <DashboardContent userId={user.id} isPremium={isPremium} />;
}
