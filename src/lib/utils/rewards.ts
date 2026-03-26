import { UserCard } from "@/lib/types/database";

export function getMultiplierForCategory(
  card: UserCard,
  categoryId: string,
  fallbackCategoryId?: string
): number {
  // Check user's custom reward rates first
  const customReward = card.rewards?.find((r) => r.category_id === categoryId);
  if (customReward) return customReward.multiplier;

  // Fall back to template rewards
  if (card.card_template?.rewards) {
    const templateReward = card.card_template.rewards.find(
      (r) => r.category_id === categoryId
    );
    if (templateReward) return templateReward.multiplier;
  }

  // If no specific rate, try fallback category (e.g. fast_food → dining)
  if (fallbackCategoryId) {
    return getMultiplierForCategory(card, fallbackCategoryId);
  }

  // Base rate
  return card.card_template?.base_reward_rate ?? card.custom_base_reward_rate ?? 1;
}

export function calculateRewards(
  amount: number,
  card: UserCard,
  categoryId: string
): number {
  const multiplier = getMultiplierForCategory(card, categoryId);
  return Math.round(amount * multiplier * 100) / 100;
}

export function rankCardsForCategory(
  userCards: UserCard[],
  categoryId: string,
  fallbackCategoryId?: string
): Array<{ card: UserCard; multiplier: number; rewardUnit: string }> {
  return userCards
    .filter((c) => c.is_active)
    .map((card) => {
      const multiplier = getMultiplierForCategory(card, categoryId, fallbackCategoryId);
      const rewardUnit =
        card.card_template?.reward_unit ?? card.custom_reward_unit ?? "points";
      return { card, multiplier, rewardUnit };
    })
    .sort((a, b) => b.multiplier - a.multiplier);
}

export function getCardName(card: UserCard): string {
  if (card.nickname) return card.nickname;
  if (card.card_template) return card.card_template.name;
  return card.custom_name ?? "Unknown Card";
}

export function getCardColor(card: UserCard): string {
  return card.card_template?.color ?? card.custom_color ?? "#d4621a";
}

export function getCardIssuer(card: UserCard): string {
  return card.card_template?.issuer ?? card.custom_issuer ?? "";
}

export function getCardNetwork(card: UserCard): string {
  return card.card_template?.network ?? card.custom_network ?? "";
}

export function getRewardUnit(card: UserCard): string {
  return card.card_template?.reward_unit ?? card.custom_reward_unit ?? "points";
}
