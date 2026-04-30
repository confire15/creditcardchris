import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AskChrisTool } from "@/components/ask/ask-chris-tool";
import { createClient } from "@/lib/supabase/server";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard } from "@/lib/types/database";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { isPremiumPlan } from "@/lib/utils/subscription";

export const metadata: Metadata = {
  title: "Ask Chris",
  description: "One question before checkout.",
};

export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberIds = await getHouseholdMemberIds(supabase, user.id);

  const [subRes, cardsRes, categoriesRes, creditsRes, perksRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("spending_categories").select("*").order("display_name"),
    supabase.from("statement_credits").select("*").in("user_id", memberIds),
    supabase
      .from("card_perks")
      .select("*")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const sortedCategories = ((categoriesRes.data ?? []) as SpendingCategory[]).sort((a, b) => {
    if (!a.user_id && b.user_id) return -1;
    if (a.user_id && !b.user_id) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <AskChrisTool
      userId={user.id}
      isPremium={isPremiumPlan(subRes.data)}
      cards={(cardsRes.data ?? []) as UserCard[]}
      categories={sortedCategories}
      credits={(creditsRes.data ?? []) as StatementCredit[]}
      perks={(perksRes.data ?? []) as CardPerk[]}
    />
  );
}
