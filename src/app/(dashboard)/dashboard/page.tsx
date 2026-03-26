import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecommendTool } from "@/components/recommend/recommend-tool";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Redirect to onboarding if user has no cards
  const { data: cards } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  if (!cards?.length) {
    redirect("/onboarding");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = sub?.plan === "premium" && sub?.status === "active";

  return <RecommendTool userId={user.id} isPremium={isPremium} />;
}
