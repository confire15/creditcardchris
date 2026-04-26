import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { buildUpcomingAlerts } from "@/lib/alerts/upcoming-alerts";
import { AlertsCenter } from "@/components/alerts/alerts-center";

export const metadata: Metadata = {
  title: "Alerts | Credit Card Chris",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPremium = isPremiumPlan(subscription);

  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const [{ data: annualFeeCards }, { data: perks }, { data: budgets }, { data: transactions }, { data: subs }, { data: challenges }] =
    await Promise.all([
      supabase
        .from("user_cards")
        .select(
          "id, nickname, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)"
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .not("annual_fee_date", "is", null),
      supabase
        .from("card_perks")
        .select(
          "id, name, reset_cadence, reset_month, last_reset_at, value_type, annual_value, used_value, annual_count, used_count, is_redeemed"
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("notify_before_reset", true),
      supabase
        .from("spending_budgets")
        .select("category_id, monthly_limit, category:spending_categories(display_name)")
        .eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", user.id)
        .gte("transaction_date", monthStart),
      supabase
        .from("card_subs")
        .select("id, current_spend, required_spend, created_at, deadline, is_met, user_card:user_cards(nickname, custom_name, card_template:card_templates(name))")
        .eq("user_id", user.id),
      supabase
        .from("spend_challenges")
        .select("id, title, target_spend, current_spend, is_met")
        .eq("user_id", user.id),
    ]);

  const alerts = buildUpcomingAlerts({
    annualFeeCards: annualFeeCards ?? [],
    perks: perks ?? [],
    budgets: budgets ?? [],
    transactions: transactions ?? [],
    subPaceInputs: (subs ?? []).map((sub) => {
      const card = Array.isArray(sub.user_card) ? sub.user_card[0] : sub.user_card;
      const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
      return {
        id: sub.id,
        current_spend: Number(sub.current_spend),
        required_spend: Number(sub.required_spend),
        created_at: sub.created_at,
        deadline: sub.deadline,
        is_met: sub.is_met,
        card_name: card?.nickname || card?.custom_name || cardTemplate?.name || "Card",
      };
    }),
    challengeInputs: (challenges ?? []).map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      target_spend: Number(challenge.target_spend),
      current_spend: Number(challenge.current_spend),
      is_met: challenge.is_met,
    })),
  });

  return <AlertsCenter userId={user.id} isPremium={isPremium} alerts={alerts} />;
}
