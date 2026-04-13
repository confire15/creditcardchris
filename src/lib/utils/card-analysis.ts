import {
  UserCard,
  SpendingCategory,
  StatementCredit,
  CardPerk,
  CardTemplate,
  CardDowngradePath,
} from "@/lib/types/database";
import { getMultiplierForCategory, getRewardUnit } from "@/lib/utils/rewards";
import { getDefaultCpp } from "@/lib/constants/default-spend";

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
    const multiplier =
      "user_id" in card
        ? getMultiplierForCategory(card as UserCard, cat.id)
        : getTemplateMultiplier(card as CardTemplate, cat.id);
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
