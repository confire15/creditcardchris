import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard, UserCategorySpend } from "@/lib/types/database";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { buildAnnualFeeEvents, type AnnualFeeEvent } from "@/lib/utils/annual-fees";

export async function loadAnnualFeeEvents({
  supabase,
  userId,
  now = new Date(),
}: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<AnnualFeeEvent[]> {
  const memberIds = await getHouseholdMemberIds(supabase, userId);

  const [cardsRes, creditsRes, perksRes, categoriesRes, spendRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(200),
    supabase.from("statement_credits").select("*").in("user_id", memberIds).limit(1000),
    supabase.from("card_perks").select("*").in("user_id", memberIds).eq("is_active", true).limit(1000),
    supabase
      .from("spending_categories")
      .select("*")
      .order("user_id", { ascending: true, nullsFirst: true })
      .order("display_name")
      .limit(200),
    supabase.from("user_category_spend").select("*").in("user_id", memberIds).limit(1000),
  ]);

  const categorySpend: Record<string, Record<string, number>> = {};
  for (const row of (spendRes.data ?? []) as UserCategorySpend[]) {
    if (!row.user_card_id) continue;
    if (!categorySpend[row.user_card_id]) categorySpend[row.user_card_id] = {};
    categorySpend[row.user_card_id][row.category_id] = Number(row.monthly_amount);
  }

  return buildAnnualFeeEvents({
    cards: (cardsRes.data ?? []) as UserCard[],
    credits: (creditsRes.data ?? []) as StatementCredit[],
    perks: (perksRes.data ?? []) as CardPerk[],
    categories: (categoriesRes.data ?? []) as SpendingCategory[],
    categorySpend,
    currentUserId: userId,
    now,
  });
}
