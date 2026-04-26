import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BenefitsPage } from "@/components/benefits/benefits-page";
import { isPremiumPlan } from "@/lib/utils/subscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benefits | Credit Card Chris",
  description: "Track statement credits across all your cards.",
};

export default async function Benefits() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = isPremiumPlan(sub);

  return <BenefitsPage userId={user.id} isPremium={isPremium} />;
}
