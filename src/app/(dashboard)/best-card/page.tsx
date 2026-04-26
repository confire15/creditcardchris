import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecommendTool } from "@/components/recommend/recommend-tool";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import type { SpendingCategory, UserCard } from "@/lib/types/database";
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

  const memberIds = await getHouseholdMemberIds(supabase, user.id);

  const [subRes, cardsRes, categoriesRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("spending_categories").select("*").order("display_name"),
  ]);

  const sortedCategories = ((categoriesRes.data ?? []) as SpendingCategory[]).sort((a, b) => {
    if (!a.user_id && b.user_id) return -1;
    if (a.user_id && !b.user_id) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const categoryLoadError = categoriesRes.error
    ? "We couldn't load purchase categories. Please refresh and try again."
    : null;

  const isPremium = isPremiumPlan(subRes.data);

  return (
    <RecommendTool
      userId={user.id}
      isPremium={isPremium}
      initialCards={(cardsRes.data ?? []) as UserCard[]}
      initialCategories={sortedCategories}
      categoryLoadError={categoryLoadError}
    />
  );
}
