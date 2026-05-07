import {
  UserCard,
  SpendingCategory,
  StatementCredit,
  CardPerk,
  CardTemplate,
  CardDowngradePath,
  CardSub,
  LoyaltyAccount,
  UserCardOffer,
  CardRenewalReview,
  CardChangeEvent,
} from "@/lib/types/database";
import { getEffectiveCpp, getMultiplierForCategory, getRewardUnit } from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";
import { differenceInDays, parseISO } from "date-fns";

export type CardAnalysis = {
  card: UserCard;
  annualFee: number;
  creditsValue: number;
  credits: StatementCredit[];
  perks: CardPerk[];
  perksValue: number;
  benefitsValue: number;
  rewardsValue: number;
  totalValue: number;
  netValue: number;
  bestAlternative: AlternativeAnalysis | null;
  allAlternatives: AlternativeAnalysis[];
  downgradePaths: CardDowngradePath[];
  verdict: "keep" | "cancel" | "close_call";
};

export type AlternativeAnalysis = {
  template: CardTemplate;
  rewardsValue: number;
};

export type CardInsight = {
  card: UserCard;
  annualFee: number;
  plannedCreditsValue: number;
  usedCreditsValue: number;
  unusedCreditsValue: number;
  perksValue: number;
  rewardsValue: number;
  subValue: number;
  retentionValue: number;
  netValue: number;
  verdict: "keep" | "cancel" | "close_call";
  moneyLeaks: string[];
  renewalDaysUntil: number | null;
};

export type WalletInsightSummary = {
  totalAnnualFees: number;
  plannedCreditsValue: number;
  usedCreditsValue: number;
  unusedCreditsValue: number;
  perksValue: number;
  rewardsValue: number;
  subValue: number;
  retentionValue: number;
  netValue: number;
  creditCaptureRate: number;
  cancelCandidates: CardInsight[];
  renewalWarnings: CardInsight[];
  topMoneyLeaks: string[];
  loyaltyValue: number;
  expiringPointsValue: number;
  activeOffersValue: number;
  cardChangeImpact: number;
  cardInsights: CardInsight[];
};

export function getTemplateMultiplier(
  template: CardTemplate,
  categoryId: string
): number {
  const reward = template.rewards?.find((r) => r.category_id === categoryId);
  return reward?.multiplier ?? template.base_reward_rate;
}

export function computeRewardsValue(
  card:
    | UserCard
    | {
        card_template?: CardTemplate | null;
        rewards?: { category_id: string; multiplier: number }[];
        custom_base_reward_rate?: number | null;
      },
  cats: SpendingCategory[],
  spend: Record<string, number>,
  cpp: number
): number {
  let total = 0;
  for (const cat of cats) {
    const annual = spend[cat.id] ?? 0;
    if (annual === 0) continue;
    if ("user_id" in card) {
      const userCard = card as UserCard;
      const multiplier = getMultiplierForCategory(userCard, cat.id);
      const effectiveCpp = getEffectiveCpp(userCard, cpp);
      total += annual * multiplier * (effectiveCpp / 100);
      continue;
    }
    const multiplier = getTemplateMultiplier(card as CardTemplate, cat.id);
    total += annual * multiplier * (cpp / 100);
  }
  return Math.round(total * 100) / 100;
}

export function analyzeCard(
  card: UserCard,
  allCredits: StatementCredit[],
  allPerks: CardPerk[],
  categories: SpendingCategory[],
  categorySpend: Record<string, Record<string, number>>,
  freeTemplates: CardTemplate[],
  downgradePaths: CardDowngradePath[]
): CardAnalysis {
  const annualFee =
    card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
  const rewardUnit = getRewardUnit(card);
  const cpp = getDefaultCpp(rewardUnit);

  const cardCredits = allCredits.filter((c) => c.user_card_id === card.id);
  const creditsValue = cardCredits
    .filter((c) => c.will_use)
    .reduce((s, c) => s + c.annual_amount, 0);

  const cardPerks = allPerks.filter((p) => p.user_card_id === card.id);
  const perksValue = cardPerks.reduce(
    (s, p) => s + (p.annual_value ?? 0),
    0
  );

  const cardSpend = categorySpend[card.id] ?? {};
  const rewardsValue = computeRewardsValue(card, categories, cardSpend, cpp);

  const alternatives: AlternativeAnalysis[] = freeTemplates
    .map((template) => ({
      template,
      rewardsValue: computeRewardsValue(
        template,
        categories,
        cardSpend,
        getDefaultCpp(template.reward_unit)
      ),
    }))
    .sort((a, b) => b.rewardsValue - a.rewardsValue);

  const bestAlternative = alternatives[0] ?? null;

  const cardPaths = card.card_template_id
    ? downgradePaths.filter(
        (p) => p.from_template_id === card.card_template_id
      )
    : [];

  const benefitsValue = creditsValue + perksValue;
  const totalValue = benefitsValue + rewardsValue;
  const netValue = totalValue - annualFee;
  const altValue = bestAlternative?.rewardsValue ?? 0;
  const advantage = netValue - altValue;

  let verdict: "keep" | "cancel" | "close_call";
  if (advantage >= 50) verdict = "keep";
  else if (advantage <= -50) verdict = "cancel";
  else verdict = "close_call";

  return {
    card,
    annualFee,
    creditsValue,
    credits: cardCredits,
    perks: cardPerks,
    perksValue,
    benefitsValue,
    rewardsValue,
    totalValue,
    netValue,
    bestAlternative,
    allAlternatives: alternatives.slice(0, 3),
    downgradePaths: cardPaths,
    verdict,
  };
}

/** Simplified analysis for dashboard — no alternatives or downgrade paths needed */
export function analyzeCardSimple(
  card: UserCard,
  allCredits: StatementCredit[],
  allPerks: CardPerk[],
  categories: SpendingCategory[],
  globalSpend: Record<string, number>,
): { annualFee: number; creditsValue: number; perksValue: number; rewardsValue: number; netValue: number; verdict: "keep" | "cancel" | "close_call" } {
  const annualFee =
    card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
  const rewardUnit = getRewardUnit(card);
  const cpp = getDefaultCpp(rewardUnit);

  const creditsValue = allCredits
    .filter((c) => c.user_card_id === card.id && c.will_use)
    .reduce((s, c) => s + c.annual_amount, 0);

  const perksValue = allPerks
    .filter((p) => p.user_card_id === card.id)
    .reduce((s, p) => s + (p.annual_value ?? 0), 0);

  const rewardsValue = computeRewardsValue(card, categories, globalSpend, cpp);

  const totalValue = creditsValue + perksValue + rewardsValue;
  const netValue = totalValue - annualFee;

  let verdict: "keep" | "cancel" | "close_call";
  if (annualFee === 0) verdict = "keep";
  else if (netValue >= 50) verdict = "keep";
  else if (netValue <= -50) verdict = "cancel";
  else verdict = "close_call";

  return { annualFee, creditsValue, perksValue, rewardsValue, netValue, verdict };
}

export function buildWalletInsights({
  cards,
  credits,
  perks,
  categories,
  globalSpend,
  subs = [],
  loyaltyAccounts = [],
  offers = [],
  renewalReviews = [],
  cardChanges = [],
  now = new Date(),
}: {
  cards: UserCard[];
  credits: StatementCredit[];
  perks: CardPerk[];
  categories: SpendingCategory[];
  globalSpend: Record<string, number>;
  subs?: CardSub[];
  loyaltyAccounts?: LoyaltyAccount[];
  offers?: UserCardOffer[];
  renewalReviews?: CardRenewalReview[];
  cardChanges?: CardChangeEvent[];
  now?: Date;
}): WalletInsightSummary {
  const activeCards = cards.filter((card) => card.is_active !== false);
  const cardInsights = activeCards.map((card) => {
    const annualFee = card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0;
    const cardCredits = credits.filter((credit) => credit.user_card_id === card.id);
    const plannedCreditsValue = cardCredits
      .filter((credit) => credit.will_use)
      .reduce((sum, credit) => sum + Number(credit.annual_amount ?? 0), 0);
    const usedCreditsValue = cardCredits.reduce((sum, credit) => sum + Number(credit.used_amount ?? 0), 0);
    const unusedCreditsValue = cardCredits.reduce(
      (sum, credit) => sum + Math.max(Number(credit.annual_amount ?? 0) - Number(credit.used_amount ?? 0), 0),
      0,
    );
    const perksValue = perks
      .filter((perk) => perk.user_card_id === card.id)
      .reduce((sum, perk) => sum + Number(perk.annual_value ?? 0), 0);
    const rewardsValue = computeRewardsValue(card, categories, globalSpend, getDefaultCpp(getRewardUnit(card)));
    const subValue = subs
      .filter((sub) => sub.user_card_id === card.id && !sub.is_met)
      .reduce((sum, sub) => sum + Number(sub.reward_amount ?? 0) * (getDefaultCpp(sub.reward_unit) / 100), 0);
    const renewalReview = renewalReviews.find((review) => review.user_card_id === card.id);
    const retentionValue = Number(renewalReview?.retention_offer_value ?? 0);
    const netValue = plannedCreditsValue + perksValue + rewardsValue + subValue + retentionValue - annualFee;

    let verdict: "keep" | "cancel" | "close_call";
    if (annualFee === 0 || netValue >= 50) verdict = "keep";
    else if (netValue <= -50) verdict = "cancel";
    else verdict = "close_call";

    const moneyLeaks: string[] = [];
    if (annualFee > 0 && netValue < 0) moneyLeaks.push(`${card.nickname || card.card_template?.name || "Card"} is negative by $${Math.round(Math.abs(netValue)).toLocaleString()}`);
    if (unusedCreditsValue >= 25) moneyLeaks.push(`${card.nickname || card.card_template?.name || "Card"} has $${Math.round(unusedCreditsValue).toLocaleString()} unused credits`);

    const renewalDaysUntil = card.annual_fee_date ? differenceInDays(parseISO(card.annual_fee_date), now) : null;

    return {
      card,
      annualFee,
      plannedCreditsValue,
      usedCreditsValue,
      unusedCreditsValue,
      perksValue,
      rewardsValue,
      subValue,
      retentionValue,
      netValue,
      verdict,
      moneyLeaks,
      renewalDaysUntil,
    };
  });

  const totalAnnualFees = cardInsights.reduce((sum, insight) => sum + insight.annualFee, 0);
  const plannedCreditsValue = cardInsights.reduce((sum, insight) => sum + insight.plannedCreditsValue, 0);
  const usedCreditsValue = cardInsights.reduce((sum, insight) => sum + insight.usedCreditsValue, 0);
  const unusedCreditsValue = cardInsights.reduce((sum, insight) => sum + insight.unusedCreditsValue, 0);
  const perksValue = cardInsights.reduce((sum, insight) => sum + insight.perksValue, 0);
  const rewardsValue = cardInsights.reduce((sum, insight) => sum + insight.rewardsValue, 0);
  const subValue = cardInsights.reduce((sum, insight) => sum + insight.subValue, 0);
  const retentionValue = cardInsights.reduce((sum, insight) => sum + insight.retentionValue, 0);
  const netValue = plannedCreditsValue + perksValue + rewardsValue + subValue + retentionValue - totalAnnualFees;
  const creditPotential = credits.reduce((sum, credit) => sum + Number(credit.annual_amount ?? 0), 0);
  const creditCaptureRate = creditPotential > 0 ? Math.round((usedCreditsValue / creditPotential) * 100) : 0;

  const loyaltyValue = loyaltyAccounts
    .filter((account) => account.is_active)
    .reduce((sum, account) => sum + Number(account.balance ?? 0) * (Number(account.point_value_cpp ?? 0) / 100), 0);
  const expiringPointsValue = loyaltyAccounts
    .filter((account) => account.is_active && account.expiration_date)
    .filter((account) => differenceInDays(parseISO(account.expiration_date!), now) <= 90)
    .reduce((sum, account) => sum + Number(account.balance ?? 0) * (Number(account.point_value_cpp ?? 0) / 100), 0);
  const activeOffersValue = offers
    .filter((offer) => !offer.is_used)
    .reduce((sum, offer) => sum + Number(offer.value_amount ?? 0), 0);
  const cardChangeImpact = cardChanges.reduce((sum, event) => sum + Number(event.estimated_annual_impact ?? 0), 0);

  return {
    totalAnnualFees,
    plannedCreditsValue,
    usedCreditsValue,
    unusedCreditsValue,
    perksValue,
    rewardsValue,
    subValue,
    retentionValue,
    netValue,
    creditCaptureRate,
    cancelCandidates: cardInsights.filter((insight) => insight.verdict === "cancel"),
    renewalWarnings: cardInsights
      .filter((insight) => insight.renewalDaysUntil != null && insight.renewalDaysUntil >= 0 && insight.renewalDaysUntil <= 60)
      .sort((a, b) => (a.renewalDaysUntil ?? 999) - (b.renewalDaysUntil ?? 999)),
    topMoneyLeaks: cardInsights.flatMap((insight) => insight.moneyLeaks).slice(0, 4),
    loyaltyValue,
    expiringPointsValue,
    activeOffersValue,
    cardChangeImpact,
    cardInsights,
  };
}
