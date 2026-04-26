import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { ChallengesList } from "@/components/challenges/challenges-list";

export default async function WalletChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sub }, { data: cards }, { data: categories }] = await Promise.all([
    supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single(),
    supabase.from("user_cards").select("*, card_template:card_templates(*)").eq("user_id", user.id).eq("is_active", true).order("sort_order"),
    supabase.from("spending_categories").select("*").order("display_name"),
  ]);

  return <ChallengesList isPremium={isPremiumPlan(sub)} cards={cards ?? []} categories={categories ?? []} />;
}
