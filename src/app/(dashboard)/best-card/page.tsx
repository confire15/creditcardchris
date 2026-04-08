import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecommendTool } from "@/components/recommend/recommend-tool";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Card Finder | Credit Card Chris",
  description: "Instantly find the best credit card for any purchase category.",
};

export default async function BestCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = sub?.plan === "premium" && sub?.status === "active";

  return <RecommendTool userId={user.id} isPremium={isPremium} />;
}
