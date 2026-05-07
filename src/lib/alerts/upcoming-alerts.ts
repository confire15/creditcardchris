import { differenceInDays, format, parseISO } from "date-fns";
import { getNextResetDate, hasPerkRemainingValue } from "@/lib/utils/perks";

export type UpcomingAlertType =
  | "annual_fee"
  | "perk_reset"
  | "budget"
  | "sub_pace"
  | "challenge_milestone"
  | "loyalty_expiration"
  | "offer_expiration"
  | "rotating_activation"
  | "card_change"
  | "renewal_refund";

export type UpcomingAlert = {
  id: string;
  type: UpcomingAlertType;
  title: string;
  body: string;
  linkHref: string;
  daysUntil: number;
  eventDate: string;
};

type AnnualFeeCard = {
  id: string;
  nickname: string | null;
  annual_fee_date: string | null;
  custom_annual_fee: number | null;
  card_template: { name?: string; annual_fee?: number } | { name?: string; annual_fee?: number }[] | null;
};

type PerkAlert = {
  id: string;
  name: string;
  reset_cadence: "monthly" | "annual" | "calendar_year";
  reset_month: number;
  last_reset_at: string | null;
  value_type: "dollar" | "count" | "boolean";
  annual_value: number | null;
  used_value: number;
  annual_count: number | null;
  used_count: number;
  is_redeemed: boolean;
};

type Budget = {
  category_id: string;
  monthly_limit: number;
  category: { display_name?: string } | { display_name?: string }[] | null;
};

type Transaction = { category_id: string; amount: number };

type SubPaceInput = {
  id: string;
  card_name: string;
  current_spend: number;
  required_spend: number;
  created_at: string;
  deadline: string;
  is_met: boolean;
};

type ChallengeInput = {
  id: string;
  title: string;
  target_spend: number;
  current_spend: number;
  is_met: boolean;
};

type LoyaltyExpirationInput = {
  id: string;
  program_name: string;
  balance: number;
  point_value_cpp: number;
  expiration_date: string | null;
};

type OfferExpirationInput = {
  id: string;
  merchant: string;
  value_amount: number | null;
  expires_on: string | null;
  is_used: boolean;
};

type RotatingActivationInput = {
  id: string;
  card_name: string;
  category_name: string;
  is_activated: boolean;
  ends_on: string;
};

type CardChangeInput = {
  id: string;
  title: string;
  summary: string;
  effective_on: string | null;
};

type RenewalReviewInput = {
  id: string;
  card_name: string;
  refund_deadline: string | null;
  decision: string;
};

function formatMoney(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function buildUpcomingAlerts({
  now = new Date(),
  windowDays = 30,
  annualFeeCards = [],
  perks = [],
  budgets = [],
  transactions = [],
  subPaceInputs = [],
  challengeInputs = [],
  loyaltyExpirationInputs = [],
  offerExpirationInputs = [],
  rotatingActivationInputs = [],
  cardChangeInputs = [],
  renewalReviewInputs = [],
}: {
  now?: Date;
  windowDays?: number;
  annualFeeCards?: AnnualFeeCard[];
  perks?: PerkAlert[];
  budgets?: Budget[];
  transactions?: Transaction[];
  subPaceInputs?: SubPaceInput[];
  challengeInputs?: ChallengeInput[];
  loyaltyExpirationInputs?: LoyaltyExpirationInput[];
  offerExpirationInputs?: OfferExpirationInput[];
  rotatingActivationInputs?: RotatingActivationInput[];
  cardChangeInputs?: CardChangeInput[];
  renewalReviewInputs?: RenewalReviewInput[];
}): UpcomingAlert[] {
  const alerts: UpcomingAlert[] = [];

  for (const card of annualFeeCards) {
    if (!card.annual_fee_date) continue;
    const feeDate = parseISO(card.annual_fee_date);
    const daysUntil = differenceInDays(feeDate, now);
    if (daysUntil < 0 || daysUntil > windowDays) continue;

    const cardTemplate = Array.isArray(card.card_template) ? card.card_template[0] : card.card_template;
    const cardName = card.nickname || cardTemplate?.name || "Your card";
    const annualFee = card.custom_annual_fee ?? cardTemplate?.annual_fee ?? 0;
    if (annualFee <= 0) continue;

    const body =
      daysUntil === 1
        ? `${cardName} annual fee of $${formatMoney(annualFee)} is due tomorrow.`
        : `${cardName} annual fee of $${formatMoney(annualFee)} is due in ${daysUntil} days (${format(feeDate, "MMM d")}).`;

    alerts.push({
      id: `fee-${card.id}-${card.annual_fee_date}`,
      type: "annual_fee",
      title: "Annual Fee Reminder",
      body,
      linkHref: "/keep-or-cancel",
      daysUntil,
      eventDate: feeDate.toISOString(),
    });
  }

  for (const perk of perks) {
    const resetDate = getNextResetDate(perk, now);
    const daysUntil = differenceInDays(resetDate, now);
    if (daysUntil < 0 || daysUntil > windowDays) continue;
    if (!hasPerkRemainingValue(perk)) continue;

    let remaining = "";
    if (perk.value_type === "dollar" && perk.annual_value) {
      const left = perk.annual_value - (perk.used_value ?? 0);
      remaining = `$${left.toFixed(0)} unused`;
    } else if (perk.value_type === "count" && perk.annual_count) {
      const left = perk.annual_count - (perk.used_count ?? 0);
      remaining = `${left} use${left !== 1 ? "s" : ""} remaining`;
    } else {
      remaining = "not yet redeemed";
    }

    const body =
      daysUntil <= 1
        ? `${perk.name}: ${remaining} — resets tomorrow!`
        : `${perk.name}: ${remaining} — resets ${format(resetDate, "MMM d")} (${daysUntil} days)`;

    alerts.push({
      id: `perk-${perk.id}-${resetDate.toISOString()}`,
      type: "perk_reset",
      title: "Perk Expiring Soon",
      body,
      linkHref: "/benefits",
      daysUntil,
      eventDate: resetDate.toISOString(),
    });
  }

  const spentMap: Record<string, number> = {};
  for (const tx of transactions) {
    spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + tx.amount;
  }
  const overBudgetNames = budgets
    .filter((budget) => (spentMap[budget.category_id] ?? 0) > budget.monthly_limit)
    .map((budget) => {
      const category = Array.isArray(budget.category) ? budget.category[0] : budget.category;
      return category?.display_name ?? "a category";
    });

  if (overBudgetNames.length) {
    alerts.push({
      id: `budget-${now.toISOString().slice(0, 7)}`,
      type: "budget",
      title: "Budget Alert",
      body: `You're over budget in: ${overBudgetNames.join(", ")}`,
      linkHref: "/settings",
      daysUntil: 0,
      eventDate: now.toISOString(),
    });
  }

  for (const sub of subPaceInputs) {
    if (sub.is_met) continue;
    const createdAt = parseISO(sub.created_at);
    const deadline = parseISO(sub.deadline);
    const totalDays = Math.max(differenceInDays(deadline, createdAt), 1);
    const elapsedDays = Math.max(differenceInDays(now, createdAt), 0);
    const daysLeft = Math.max(differenceInDays(deadline, now), 0);
    const expectedRatio = Math.min(elapsedDays / totalDays, 1);
    const currentRatio = sub.current_spend / Math.max(sub.required_spend, 1);
    const behindPace = currentRatio < expectedRatio * 0.9;

    if (behindPace) {
      const needed = Math.max(sub.required_spend - sub.current_spend, 0);
      const perDay = daysLeft > 0 ? Math.ceil(needed / daysLeft) : Math.ceil(needed);
      alerts.push({
        id: `sub-pace-${sub.id}`,
        type: "sub_pace",
        title: "SUB Pace Alert",
        body: `${sub.card_name}: need $${perDay}/day to stay on pace.`,
        linkHref: "/wallet",
        daysUntil: daysLeft,
        eventDate: deadline.toISOString(),
      });
    }

    if ([7, 3, 1].includes(daysLeft)) {
      alerts.push({
        id: `sub-deadline-${sub.id}-${daysLeft}`,
        type: "sub_pace",
        title: "SUB Deadline Reminder",
        body: `${sub.card_name}: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to finish your SUB spend.`,
        linkHref: "/wallet",
        daysUntil: daysLeft,
        eventDate: deadline.toISOString(),
      });
    }
  }

  for (const challenge of challengeInputs) {
    if (challenge.is_met) {
      alerts.push({
        id: `challenge-100-${challenge.id}`,
        type: "challenge_milestone",
        title: "Challenge Complete",
        body: `${challenge.title} reached 100%.`,
        linkHref: "/wallet/challenges",
        daysUntil: 0,
        eventDate: now.toISOString(),
      });
      continue;
    }

    const ratio = challenge.current_spend / Math.max(challenge.target_spend, 1);
    const milestones = [0.9, 0.75, 0.5].filter((threshold) => ratio >= threshold);
    if (milestones.length === 0) continue;
    const top = milestones[0];
    alerts.push({
      id: `challenge-${Math.round(top * 100)}-${challenge.id}`,
      type: "challenge_milestone",
      title: "Challenge Milestone",
      body: `${challenge.title} hit ${Math.round(top * 100)}% progress.`,
      linkHref: "/wallet/challenges",
      daysUntil: 0,
      eventDate: now.toISOString(),
    });
  }

  for (const account of loyaltyExpirationInputs) {
    if (!account.expiration_date) continue;
    const expiration = parseISO(account.expiration_date);
    const daysUntil = differenceInDays(expiration, now);
    if (daysUntil < 0 || daysUntil > Math.max(windowDays, 90)) continue;
    const value = account.balance * ((account.point_value_cpp ?? 0) / 100);
    alerts.push({
      id: `points-${account.id}-${account.expiration_date}`,
      type: "loyalty_expiration",
      title: "Points Expiring",
      body: `${account.program_name}: ${Math.round(account.balance).toLocaleString()} points (~$${Math.round(value)}) expire ${format(expiration, "MMM d")}.`,
      linkHref: "/wallet/points",
      daysUntil,
      eventDate: expiration.toISOString(),
    });
  }

  for (const offer of offerExpirationInputs) {
    if (offer.is_used || !offer.expires_on) continue;
    const expires = parseISO(offer.expires_on);
    const daysUntil = differenceInDays(expires, now);
    if (daysUntil < 0 || daysUntil > windowDays) continue;
    alerts.push({
      id: `offer-${offer.id}-${offer.expires_on}`,
      type: "offer_expiration",
      title: "Offer Expiring",
      body: `${offer.merchant}${offer.value_amount ? `: $${formatMoney(offer.value_amount)} value` : ""} expires ${format(expires, "MMM d")}.`,
      linkHref: "/wallet/offers",
      daysUntil,
      eventDate: expires.toISOString(),
    });
  }

  for (const status of rotatingActivationInputs) {
    if (status.is_activated) continue;
    const ends = parseISO(status.ends_on);
    const daysUntil = differenceInDays(ends, now);
    if (daysUntil < 0 || daysUntil > windowDays) continue;
    alerts.push({
      id: `rotating-${status.id}`,
      type: "rotating_activation",
      title: "Rotating Category Activation",
      body: `${status.card_name}: activate ${status.category_name} before the quarter ends.`,
      linkHref: "/wallet",
      daysUntil,
      eventDate: ends.toISOString(),
    });
  }

  for (const event of cardChangeInputs) {
    const effective = event.effective_on ? parseISO(event.effective_on) : now;
    const daysUntil = Math.max(differenceInDays(effective, now), 0);
    if (daysUntil > windowDays) continue;
    alerts.push({
      id: `card-change-${event.id}`,
      type: "card_change",
      title: "Card Change Impact",
      body: `${event.title}: ${event.summary}`,
      linkHref: "/keep-or-cancel",
      daysUntil,
      eventDate: effective.toISOString(),
    });
  }

  for (const review of renewalReviewInputs) {
    if (!review.refund_deadline || review.decision !== "undecided") continue;
    const deadline = parseISO(review.refund_deadline);
    const daysUntil = differenceInDays(deadline, now);
    if (daysUntil < 0 || daysUntil > windowDays) continue;
    alerts.push({
      id: `renewal-refund-${review.id}`,
      type: "renewal_refund",
      title: "Refund Window Closing",
      body: `${review.card_name}: annual fee refund window closes ${format(deadline, "MMM d")}.`,
      linkHref: "/keep-or-cancel",
      daysUntil,
      eventDate: deadline.toISOString(),
    });
  }

  return alerts.sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
}
