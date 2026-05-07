import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { PointsWalletPage } from "@/components/points/points-wallet-page";

export const metadata: Metadata = {
  title: "Points Wallet | Credit Card Chris",
};

export default async function PointsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: sub } = await supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle();
  return <PointsWalletPage isPremium={isPremiumPlan(sub)} />;
}
