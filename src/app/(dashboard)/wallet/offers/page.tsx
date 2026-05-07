import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { OffersPage } from "@/components/offers/offers-page";

export const metadata: Metadata = {
  title: "Offer Matcher | Credit Card Chris",
};

export default async function WalletOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: sub } = await supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle();
  return <OffersPage userId={user.id} isPremium={isPremiumPlan(sub)} />;
}
