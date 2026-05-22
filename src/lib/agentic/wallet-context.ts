import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CardChangeEvent,
  type CardPerk,
  type CardPerkAction,
  type CardRenewalReview,
  type CardSub,
  type LoyaltyAccount,
  type SpendingCategory,
  type SpendChallenge,
  type StatementCredit,
  type UserCard,
  type UserCardOffer,
  type UserCategorySpend,
  type UserRotatingCategoryStatus,
} from "@/lib/types/database";
import { buildUpcomingAlerts, type UpcomingAlert } from "@/lib/alerts/upcoming-alerts";
import { buildWalletInsights, type WalletInsightSummary } from "@/lib/utils/card-analysis";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { getCardName } from "@/lib/utils/rewards";

export type WalletCopilotContext = {
  userId: string;
  scopedUserIds: string[];
  generatedAt: string;
  cards: UserCard[];
  categories: SpendingCategory[];
  credits: StatementCredit[];
  perks: CardPerk[];
  perkActions: CardPerkAction[];
  offers: UserCardOffer[];
  loyaltyAccounts: LoyaltyAccount[];
  subs: CardSub[];
  challenges: SpendChallenge[];
  renewalReviews: CardRenewalReview[];
  rotatingStatuses: UserRotatingCategoryStatus[];
  cardChanges: CardChangeEvent[];
  globalSpend: Record<string, number>;
  alerts: UpcomingAlert[];
  insights: WalletInsightSummary;
  summary: {
    activeCards: number;
    annualFeeCards: number;
    unusedCreditValue: number;
    activeOffers: number;
    expiringLoyaltyAccounts: number;
    openSubs: number;
    upcomingAlerts: number;
  };
};

function cardLabel(card: UserCard) {
  return getCardName(card);
}

function buildSpendMap(rows: UserCategorySpend[]) {
  const spend: Record<string, number> = {};
  for (const row of rows) {
    spend[row.category_id] = Math.max(spend[row.category_id] ?? 0, Number(row.monthly_amount ?? 0));
  }
  return spend;
}

export async function buildWalletContext(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<WalletCopilotContext> {
  const scopedUserIds = await getHouseholdMemberIds(supabase, userId);

  const [
    cardsRes,
    categoriesRes,
    creditsRes,
    perksRes,
    offersRes,
    loyaltyRes,
    subsRes,
    challengesRes,
    renewalReviewsRes,
    rotatingRes,
    cardChangesRes,
    spendRes,
  ] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*, rewards:card_template_rewards(*)), rewards:user_card_rewards(*)")
      .in("user_id", scopedUserIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("spending_categories")
      .select("*")
      .order("user_id", { ascending: true, nullsFirst: true })
      .order("display_name"),
    supabase.from("statement_credits").select("*").in("user_id", scopedUserIds),
    supabase.from("card_perks").select("*").in("user_id", scopedUserIds).eq("is_active", true),
    supabase
      .from("user_card_offers")
      .select("*, user_card:user_cards(id, nickname, custom_name, card_template:card_templates(name, issuer, color))")
      .in("user_id", scopedUserIds)
      .order("expires_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("loyalty_accounts")
      .select("*")
      .in("user_id", scopedUserIds)
      .eq("is_active", true)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase.from("card_subs").select("*").in("user_id", scopedUserIds).eq("is_met", false),
    supabase.from("spend_challenges").select("*").in("user_id", scopedUserIds).eq("is_met", false),
    supabase.from("card_renewal_reviews").select("*").in("user_id", scopedUserIds),
    supabase
      .from("user_rotating_category_status")
      .select("*, rotating_category_period:rotating_category_periods(*), user_card:user_cards(id, nickname, custom_name, card_template:card_templates(name))")
      .in("user_id", scopedUserIds),
    supabase.from("card_change_events").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("user_category_spend").select("*").in("user_id", scopedUserIds),
  ]);

  const cards = (cardsRes.data ?? []) as UserCard[];
  const categories = (categoriesRes.data ?? []) as SpendingCategory[];
  const credits = (creditsRes.data ?? []) as StatementCredit[];
  const perks = (perksRes.data ?? []) as CardPerk[];
  const offers = (offersRes.data ?? []) as UserCardOffer[];
  const loyaltyAccounts = (loyaltyRes.data ?? []) as LoyaltyAccount[];
  const subs = (subsRes.data ?? []) as CardSub[];
  const challenges = (challengesRes.data ?? []) as SpendChallenge[];
  const renewalReviews = (renewalReviewsRes.data ?? []) as CardRenewalReview[];
  const rotatingStatuses = (rotatingRes.data ?? []) as UserRotatingCategoryStatus[];
  const cardChanges = (cardChangesRes.data ?? []) as CardChangeEvent[];
  const globalSpend = buildSpendMap((spendRes.data ?? []) as UserCategorySpend[]);
  const perkTemplateIds = perks
    .map((perk) => perk.card_perk_template_id)
    .filter((id): id is string => Boolean(id));
  const { data: perkActionsData } = perkTemplateIds.length
    ? await supabase
        .from("card_perk_actions")
        .select("*")
        .eq("is_active", true)
        .in("card_perk_template_id", perkTemplateIds)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const perkActions = (perkActionsData ?? []) as CardPerkAction[];

  const cardTemplateIds = new Set(cards.map((card) => card.card_template_id).filter(Boolean));
  const cardIssuers = new Set(
    cards
      .map((card) => card.card_template?.issuer ?? card.custom_issuer)
      .filter((issuer): issuer is string => Boolean(issuer)),
  );
  const relevantCardChanges = cardChanges.filter((event) => {
    if (event.card_template_id && cardTemplateIds.has(event.card_template_id)) return true;
    return cardIssuers.has(event.issuer);
  });

  const subCardNames = new Map(cards.map((card) => [card.id, cardLabel(card)]));
  const alerts = buildUpcomingAlerts({
    now,
    windowDays: 30,
    annualFeeCards: cards.map((card) => ({
      id: card.id,
      nickname: card.nickname,
      annual_fee_date: card.annual_fee_date,
      custom_annual_fee: card.custom_annual_fee,
      card_template: card.card_template ?? null,
    })),
    perks,
    subPaceInputs: subs.map((sub) => ({
      id: sub.id,
      card_name: subCardNames.get(sub.user_card_id) ?? "Your card",
      current_spend: Number(sub.current_spend ?? 0),
      required_spend: Number(sub.required_spend ?? 0),
      created_at: sub.created_at,
      deadline: sub.deadline,
      is_met: sub.is_met,
    })),
    challengeInputs: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      target_spend: Number(challenge.target_spend ?? 0),
      current_spend: Number(challenge.current_spend ?? 0),
      is_met: challenge.is_met,
    })),
    loyaltyExpirationInputs: loyaltyAccounts,
    offerExpirationInputs: offers,
    rotatingActivationInputs: rotatingStatuses.map((status) => ({
      id: status.id,
      card_name: status.user_card ? cardLabel(status.user_card) : "Your card",
      category_name: status.rotating_category_period?.category_name ?? "rotating category",
      is_activated: status.is_activated,
      ends_on: status.rotating_category_period?.ends_on ?? now.toISOString(),
    })),
    cardChangeInputs: relevantCardChanges.map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      effective_on: event.effective_on,
    })),
    renewalReviewInputs: renewalReviews.map((review) => ({
      id: review.id,
      card_name: subCardNames.get(review.user_card_id) ?? "Your card",
      refund_deadline: review.refund_deadline,
      decision: review.decision,
    })),
  });

  const insights = buildWalletInsights({
    cards,
    credits,
    perks,
    categories,
    globalSpend,
    subs,
    loyaltyAccounts,
    offers,
    renewalReviews,
    cardChanges: relevantCardChanges,
    now,
  });

  return {
    userId,
    scopedUserIds,
    generatedAt: now.toISOString(),
    cards,
    categories,
    credits,
    perks,
    perkActions,
    offers,
    loyaltyAccounts,
    subs,
    challenges,
    renewalReviews,
    rotatingStatuses,
    cardChanges: relevantCardChanges,
    globalSpend,
    alerts,
    insights,
    summary: {
      activeCards: cards.length,
      annualFeeCards: cards.filter((card) => Number(card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0) > 0).length,
      unusedCreditValue: insights.unusedCreditsValue,
      activeOffers: offers.filter((offer) => !offer.is_used).length,
      expiringLoyaltyAccounts: loyaltyAccounts.filter((account) => account.expiration_date).length,
      openSubs: subs.length,
      upcomingAlerts: alerts.length,
    },
  };
}
