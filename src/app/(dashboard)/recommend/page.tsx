import { createClient } from "@/lib/supabase/server";
import { RecommendTool } from "@/components/recommend/recommend-tool";

export default async function RecommendPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user!.id)
    .single();
  const isPremium = sub?.plan === "premium" && sub?.status === "active";

  return <RecommendTool userId={user!.id} isPremium={isPremium} />;
}
