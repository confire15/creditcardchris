import { startOfMonth } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUpcomingAlerts, type UpcomingAlert } from "@/lib/alerts/upcoming-alerts";
import { getHouseholdMemberIds } from "@/lib/utils/household";

/**
 * Loads every input that feeds buildUpcomingAlerts() and returns the
 * computed alert list. Shared by the /alerts page and /api/alerts/count
 * so the nav badge and the page always agree.
 */
export async function loadUpcomingAlerts({
  supabase,
  userId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>;
  userId: string;
}): Promise<UpcomingAlert[]> {
  const memberIds = await getHouseholdMemberIds(supabase, userId);
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const [
    { data: annualFeeCards },
    { data: perks },
    { data: budgets },
    { data: transactions },
    { data: subs },
    { data: challenges },
    { data: loyaltyAccounts },
    { data: offers },
    { data: rotatingStatuses },
    { data: cardChanges },
    { data: dismissals },
    { data: renewalReviews },
  ] =
    await Promise.all([
      supabase
        .from("user_cards")
        .select(
          "id, nickname, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)"
        )
        .in("user_id", memberIds)
        .eq("is_active", true)
        .not("annual_fee_date", "is", null),
      supabase
        .from("card_perks")
        .select(
          "id, name, reset_cadence, reset_month, last_reset_at, value_type, annual_value, used_value, annual_count, used_count, is_redeemed"
        )
        .in("user_id", memberIds)
        .eq("is_active", true)
        .eq("notify_before_reset", true),
      supabase
        .from("spending_budgets")
        .select("category_id, monthly_limit, category:spending_categories(display_name)")
        .eq("user_id", userId),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .gte("transaction_date", monthStart),
      supabase
        .from("card_subs")
        .select("id, current_spend, required_spend, created_at, deadline, is_met, user_card:user_cards(nickname, custom_name, card_template:card_templates(name))")
        .in("user_id", memberIds),
      supabase
        .from("spend_challenges")
        .select("id, title, target_spend, current_spend, is_met")
        .in("user_id", memberIds),
      supabase
        .from("loyalty_accounts")
        .select("id, program_name, balance, point_value_cpp, expiration_date")
        .in("user_id", memberIds)
        .eq("is_active", true),
      supabase
        .from("user_card_offers")
        .select("id, merchant, value_amount, expires_on, is_used")
        .in("user_id", memberIds),
      supabase
        .from("user_rotating_category_status")
        .select("id, is_activated, user_card:user_cards(nickname, custom_name, card_template:card_templates(name)), rotating_category_period:rotating_category_periods(category_name, ends_on)")
        .in("user_id", memberIds),
      supabase
        .from("card_change_events")
        .select("id, title, summary, effective_on, card_template_id"),
      supabase
        .from("user_card_change_dismissals")
        .select("card_change_event_id")
        .eq("user_id", userId),
      supabase
        .from("card_renewal_reviews")
        .select("id, refund_deadline, decision, user_card:user_cards(nickname, custom_name, card_template:card_templates(name))")
        .in("user_id", memberIds),
    ]);

  const dismissedChangeIds = new Set((dismissals ?? []).map((row) => row.card_change_event_id));

  return buildUpcomingAlerts({
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
    loyaltyExpirationInputs: (loyaltyAccounts ?? []).map((account) => ({
      id: account.id,
      program_name: account.program_name,
      balance: Number(account.balance),
      point_value_cpp: Number(account.point_value_cpp),
      expiration_date: account.expiration_date,
    })),
    offerExpirationInputs: (offers ?? []).map((offer) => ({
      id: offer.id,
      merchant: offer.merchant,
      value_amount: offer.value_amount == null ? null : Number(offer.value_amount),
      expires_on: offer.expires_on,
      is_used: offer.is_used,
    })),
    rotatingActivationInputs: (rotatingStatuses ?? []).map((status) => {
      const card = Array.isArray(status.user_card) ? status.user_card[0] : status.user_card;
      const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
      const period = Array.isArray(status.rotating_category_period) ? status.rotating_category_period[0] : status.rotating_category_period;
      return {
        id: status.id,
        card_name: card?.nickname || card?.custom_name || cardTemplate?.name || "Card",
        category_name: period?.category_name || "bonus category",
        is_activated: status.is_activated,
        ends_on: period?.ends_on || new Date().toISOString().slice(0, 10),
      };
    }),
    cardChangeInputs: (cardChanges ?? [])
      .filter((event) => !dismissedChangeIds.has(event.id))
      .map((event) => ({
        id: event.id,
        title: event.title,
        summary: event.summary,
        effective_on: event.effective_on,
      })),
    renewalReviewInputs: (renewalReviews ?? []).map((review) => {
      const card = Array.isArray(review.user_card) ? review.user_card[0] : review.user_card;
      const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
      return {
        id: review.id,
        card_name: card?.nickname || card?.custom_name || cardTemplate?.name || "Card",
        refund_deadline: review.refund_deadline,
        decision: review.decision,
      };
    }),
  });
}
