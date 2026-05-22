import { differenceInDays, endOfMonth, format, parseISO } from "date-fns";
import { agentRecommendationInputSchema, type AgentRecommendationInput } from "@/lib/agentic/schemas";
import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";
import { formatCurrency } from "@/lib/utils/format";
import { getCardName, rankCardsForCategory } from "@/lib/utils/rewards";

function compactText(value: string, max = 480) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function makeRecommendation(input: AgentRecommendationInput): AgentRecommendationInput {
  return agentRecommendationInputSchema.parse({
    ...input,
    rationale: compactText(input.rationale),
  });
}

function cardNameById(context: WalletCopilotContext, cardId: string) {
  const card = context.cards.find((item) => item.id === cardId);
  return card ? getCardName(card) : "Your card";
}

function isThisMonth(resetMonth: number | null | undefined, now: Date) {
  return Number(resetMonth) === now.getMonth() + 1;
}

function maybeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addCreditCapture(context: WalletCopilotContext, now: Date, out: AgentRecommendationInput[]) {
  const daysLeft = differenceInDays(endOfMonth(now), now) + 1;
  const credits = context.credits
    .map((credit) => ({
      credit,
      remaining: Math.max(Number(credit.annual_amount ?? 0) - Number(credit.used_amount ?? 0), 0),
      cardName: cardNameById(context, credit.user_card_id),
    }))
    .filter(({ credit, remaining }) => remaining > 0 && (isThisMonth(credit.reset_month, now) || remaining >= 25))
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 3);

  for (const { credit, remaining, cardName } of credits) {
    const due = isThisMonth(credit.reset_month, now) ? ` before this month resets in ${daysLeft} days` : "";
    out.push(makeRecommendation({
      type: "credit_capture",
      priority: isThisMonth(credit.reset_month, now) ? 96 : 76,
      confidence: 0.9,
      title: `Capture ${formatCurrency(remaining)} from ${credit.name}`,
      rationale: `${cardName} still has ${formatCurrency(remaining)} unused on ${credit.name}${due}. Review it now, then log usage or mark it as not planned if it is not realistic.`,
      sourceRefs: [
        { type: "statement_credit", id: credit.id, label: credit.name },
        { type: "user_card", id: credit.user_card_id, label: cardName },
      ],
      proposedAction: {
        type: "navigate",
        href: "/wallet?tab=credits-benefits",
        label: "Review benefit",
        payload: { creditId: credit.id, userCardId: credit.user_card_id },
      },
    }));
  }
}

function addRenewalRescue(context: WalletCopilotContext, out: AgentRecommendationInput[]) {
  const candidates = context.insights.cardInsights
    .filter((insight) => insight.annualFee > 0)
    .filter((insight) => insight.verdict === "cancel" || insight.verdict === "close_call" || (insight.renewalDaysUntil != null && insight.renewalDaysUntil <= 60 && insight.renewalDaysUntil >= 0))
    .sort((a, b) => {
      const aDays = a.renewalDaysUntil ?? 999;
      const bDays = b.renewalDaysUntil ?? 999;
      if (aDays !== bDays) return aDays - bDays;
      return a.netValue - b.netValue;
    })
    .slice(0, 3);

  for (const insight of candidates) {
    const cardName = getCardName(insight.card);
    const renewalCopy =
      insight.renewalDaysUntil == null
        ? "No renewal date is saved yet."
        : insight.renewalDaysUntil >= 0
          ? `Renewal is in ${insight.renewalDaysUntil} days.`
          : `Renewal was ${Math.abs(insight.renewalDaysUntil)} days ago.`;
    out.push(makeRecommendation({
      type: "renewal_rescue",
      priority: insight.verdict === "cancel" ? 92 : 84,
      confidence: 0.86,
      title: `Review ${cardName} before the next fee`,
      rationale: `${renewalCopy} Current value math says ${insight.verdict.replace("_", " ")} with estimated net value of ${formatCurrency(insight.netValue)} after fees, credits, rewards, SUBs, and retention value.`,
      sourceRefs: [{ type: "user_card", id: insight.card.id, label: cardName }],
      proposedAction: {
        type: "navigate",
        href: "/keep-or-cancel",
        label: "Run review",
        payload: { userCardId: insight.card.id, verdict: insight.verdict },
      },
    }));
  }
}

function addOfferMatcher(context: WalletCopilotContext, now: Date, out: AgentRecommendationInput[]) {
  const offers = context.offers
    .filter((offer) => !offer.is_used)
    .map((offer) => {
      const expires = maybeDate(offer.expires_on);
      const daysUntil = expires ? differenceInDays(expires, now) : 999;
      return { offer, daysUntil };
    })
    .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 45)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  for (const { offer, daysUntil } of offers) {
    const value =
      offer.value_amount != null
        ? formatCurrency(Number(offer.value_amount))
        : offer.value_percent != null
          ? `${Number(offer.value_percent)}%`
          : "value";
    const cardName = offer.user_card_id ? cardNameById(context, offer.user_card_id) : "a tracked card";
    out.push(makeRecommendation({
      type: "offer_matcher",
      priority: daysUntil <= 7 ? 88 : 72,
      confidence: 0.78,
      title: `Use the ${offer.merchant} offer${daysUntil <= 45 ? ` in ${daysUntil}d` : ""}`,
      rationale: `${offer.merchant} has ${value} available on ${cardName}. Review the minimum spend and activation status before it expires.`,
      sourceRefs: [
        { type: "user_card_offer", id: offer.id, label: offer.merchant },
        ...(offer.user_card_id ? [{ type: "user_card", id: offer.user_card_id, label: cardName }] : []),
      ],
      proposedAction: {
        type: "navigate",
        href: "/wallet?tab=offers",
        label: "Review offer",
        payload: { offerId: offer.id },
      },
    }));
  }
}

function addSubPace(context: WalletCopilotContext, now: Date, out: AgentRecommendationInput[]) {
  const subs = context.subs
    .map((sub) => {
      const deadline = maybeDate(sub.deadline);
      const daysLeft = deadline ? Math.max(differenceInDays(deadline, now), 0) : 0;
      const needed = Math.max(Number(sub.required_spend ?? 0) - Number(sub.current_spend ?? 0), 0);
      const perDay = daysLeft > 0 ? Math.ceil(needed / daysLeft) : Math.ceil(needed);
      return { sub, daysLeft, needed, perDay };
    })
    .filter(({ needed }) => needed > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  for (const { sub, daysLeft, needed, perDay } of subs) {
    const cardName = cardNameById(context, sub.user_card_id);
    out.push(makeRecommendation({
      type: "sub_pace",
      priority: daysLeft <= 14 ? 90 : 74,
      confidence: 0.88,
      title: `${formatCurrency(needed)} left for ${cardName} bonus`,
      rationale: `${cardName} needs ${formatCurrency(needed)} more by ${format(parseISO(sub.deadline), "MMM d")}. That is about ${formatCurrency(perDay)} per day from here.`,
      sourceRefs: [
        { type: "card_sub", id: sub.id, label: cardName },
        { type: "user_card", id: sub.user_card_id, label: cardName },
      ],
      proposedAction: {
        type: "navigate",
        href: "/wallet?tab=challenges",
        label: "Review spend pace",
        payload: { subId: sub.id, userCardId: sub.user_card_id },
      },
    }));
  }
}

function addPointsExpiration(context: WalletCopilotContext, now: Date, out: AgentRecommendationInput[]) {
  const accounts = context.loyaltyAccounts
    .map((account) => {
      const expires = maybeDate(account.expiration_date);
      const daysUntil = expires ? differenceInDays(expires, now) : 999;
      const value = Number(account.balance ?? 0) * (Number(account.point_value_cpp ?? 0) / 100);
      return { account, daysUntil, value };
    })
    .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 2);

  for (const { account, daysUntil, value } of accounts) {
    out.push(makeRecommendation({
      type: "points_expiration",
      priority: daysUntil <= 30 ? 86 : 66,
      confidence: 0.82,
      title: `${account.program_name} points expire in ${daysUntil}d`,
      rationale: `${account.program_name} has ${Number(account.balance).toLocaleString("en-US")} points tracked, worth about ${formatCurrency(value)} at your saved CPP. Review the account before expiration.`,
      sourceRefs: [{ type: "loyalty_account", id: account.id, label: account.program_name }],
      proposedAction: {
        type: "navigate",
        href: "/wallet?tab=points",
        label: "Review points",
        payload: { loyaltyAccountId: account.id },
      },
    }));
  }
}

function addPurchaseRules(context: WalletCopilotContext, out: AgentRecommendationInput[]) {
  const desired = ["dining", "groceries", "grocery", "gas", "travel"];
  const rules = context.categories
    .filter((category) => desired.some((name) => category.name.toLowerCase().includes(name)))
    .map((category) => {
      const ranked = rankCardsForCategory(context.cards, category.id);
      const best = ranked[0];
      if (!best) return null;
      return {
        category,
        card: best.card,
        multiplier: best.multiplier,
        rewardUnit: best.rewardUnit,
      };
    })
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    .slice(0, 4);

  if (rules.length === 0) return;

  out.push(makeRecommendation({
    type: "purchase_rule",
    priority: 58,
    confidence: 0.84,
    title: "Set your default swipe rules",
    rationale: rules
      .map((rule) => `${rule.category.display_name}: ${getCardName(rule.card)} at ${rule.multiplier}x ${rule.rewardUnit}`)
      .join("; "),
    sourceRefs: rules.map((rule) => ({
      type: "spending_category",
      id: rule.category.id,
      label: rule.category.display_name,
    })),
    proposedAction: {
      type: "navigate",
      href: "/ask",
      label: "Review best cards",
      payload: { categoryIds: rules.map((rule) => rule.category.id) },
    },
  }));
}

function addDataCleanup(context: WalletCopilotContext, out: AgentRecommendationInput[]) {
  const missingFeeDates = context.cards.filter((card) => {
    const fee = Number(card.custom_annual_fee ?? card.card_template?.annual_fee ?? 0);
    return fee > 0 && !card.annual_fee_date;
  });
  const emptySpend = Object.values(context.globalSpend).every((amount) => Number(amount) <= 0);

  if (missingFeeDates.length > 0) {
    const card = missingFeeDates[0];
    out.push(makeRecommendation({
      type: "data_cleanup",
      priority: 70,
      confidence: 0.92,
      title: `Add renewal date for ${getCardName(card)}`,
      rationale: "Wallet Copilot can time renewal rescue and refund-window recommendations better once annual-fee dates are explicit.",
      sourceRefs: [{ type: "user_card", id: card.id, label: getCardName(card) }],
      proposedAction: {
        type: "navigate",
        href: "/wallet",
        label: "Add fee date",
        payload: { userCardId: card.id, field: "annual_fee_date" },
      },
    }));
  }

  if (emptySpend && context.cards.length > 0) {
    out.push(makeRecommendation({
      type: "data_cleanup",
      priority: 54,
      confidence: 0.8,
      title: "Add spend assumptions",
      rationale: "Keep or Cancel and Wallet Copilot are more accurate when annual category spend is saved instead of inferred from defaults.",
      sourceRefs: [{ type: "wallet", id: context.userId, label: "Wallet" }],
      proposedAction: {
        type: "navigate",
        href: "/keep-or-cancel",
        label: "Add spend",
        payload: { field: "category_spend" },
      },
    }));
  }
}

export function generateWalletRecommendations(
  context: WalletCopilotContext,
  now = new Date(context.generatedAt),
): AgentRecommendationInput[] {
  const recommendations: AgentRecommendationInput[] = [];

  addCreditCapture(context, now, recommendations);
  addRenewalRescue(context, recommendations);
  addOfferMatcher(context, now, recommendations);
  addSubPace(context, now, recommendations);
  addPointsExpiration(context, now, recommendations);
  addPurchaseRules(context, recommendations);
  addDataCleanup(context, recommendations);

  const seen = new Set<string>();
  return recommendations
    .filter((recommendation) => {
      const key = `${recommendation.type}:${recommendation.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 12);
}
