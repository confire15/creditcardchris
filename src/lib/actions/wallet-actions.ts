import { differenceInDays, format } from "date-fns";
import { generateWalletRecommendations } from "@/lib/agentic/wallet-copilot";
import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";
import type { AgentRecommendationInput } from "@/lib/agentic/schemas";
import { userActionInputSchema, type UserActionInput } from "@/lib/actions/schemas";
import { formatCurrency } from "@/lib/utils/format";
import { getNextResetDate, hasPerkRemainingValue } from "@/lib/utils/perks";
import { getCardName } from "@/lib/utils/rewards";

function compactText(value: string, max = 600) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function firstSourceId(recommendation: AgentRecommendationInput) {
  return recommendation.sourceRefs[0]?.id ?? recommendation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function fromRecommendation(recommendation: AgentRecommendationInput): UserActionInput {
  const valueEstimateCents = recommendation.proposedAction.payload?.valueEstimateCents;
  return userActionInputSchema.parse({
    sourceType: "wallet_copilot",
    actionType: recommendation.type,
    title: recommendation.title,
    rationale: recommendation.rationale,
    priority: recommendation.priority,
    confidence: recommendation.confidence,
    sourceRefs: recommendation.sourceRefs,
    proposedAction: recommendation.proposedAction,
    valueEstimateCents: typeof valueEstimateCents === "number" ? valueEstimateCents : null,
    recurrenceKey: `copilot:${recommendation.type}:${firstSourceId(recommendation)}`,
  });
}

function fromAlert(alert: WalletCopilotContext["alerts"][number]): UserActionInput {
  return userActionInputSchema.parse({
    sourceType: "smart_alert",
    actionType: "alert",
    title: alert.title,
    rationale: alert.body,
    priority: alert.daysUntil <= 1 ? 95 : alert.daysUntil <= 7 ? 86 : 68,
    confidence: 0.92,
    sourceRefs: [{ type: "upcoming_alert", id: alert.id, label: alert.title }],
    proposedAction: {
      type: "navigate",
      href: alert.linkHref,
      label: "Review",
      payload: { alertType: alert.type, alertId: alert.id },
    },
    dueAt: alert.eventDate,
    expiresAt: alert.eventDate,
    recurrenceKey: `alert:${alert.id}`,
  });
}

function addPerkCreditActions(context: WalletCopilotContext, now: Date, out: UserActionInput[]) {
  const actionsByTemplate = new Map<string, WalletCopilotContext["perkActions"]>();
  for (const action of context.perkActions) {
    const current = actionsByTemplate.get(action.card_perk_template_id) ?? [];
    current.push(action);
    actionsByTemplate.set(action.card_perk_template_id, current);
  }

  for (const perk of context.perks) {
    if (!perk.card_perk_template_id) continue;
    if (!hasPerkRemainingValue(perk)) continue;
    const actions = actionsByTemplate.get(perk.card_perk_template_id) ?? [];
    const primaryAction = actions[0];
    if (!primaryAction) continue;

    const resetDate = getNextResetDate(perk, now);
    const daysLeft = Math.max(differenceInDays(resetDate, now), 0);
    if (daysLeft > 30) continue;

    const card = context.cards.find((item) => item.id === perk.user_card_id);
    const cardName = card ? getCardName(card) : "your card";
    const remaining =
      perk.value_type === "dollar"
        ? Math.max((perk.annual_value ?? 0) - (perk.used_value ?? 0), 0)
        : Math.max((perk.annual_count ?? 0) - (perk.used_count ?? 0), 0);
    const amountCents =
      primaryAction.prefill_amount_cents ??
      (perk.value_type === "dollar" ? Math.max(Math.round(remaining * 100), 1) : 100);
    const href = primaryAction.deep_link_url || primaryAction.fallback_web_url;

    out.push(userActionInputSchema.parse({
      sourceType: "credit_action",
      actionType: "credit_action",
      title: `Close ${perk.name}`,
      rationale: compactText(
        `${cardName} has ${perk.value_type === "dollar" ? formatCurrency(remaining) : `${remaining} use${remaining === 1 ? "" : "s"}`} remaining before ${format(resetDate, "MMM d")}. ${primaryAction.instructions ?? "Open the merchant, use the card, then mark it done."}`,
      ),
      priority: daysLeft <= 7 ? 98 : 82,
      confidence: 0.9,
      sourceRefs: [
        { type: "card_perk", id: perk.id, label: perk.name },
        { type: "card_perk_action", id: primaryAction.id, label: primaryAction.label },
      ],
      proposedAction: {
        type: "deep_link",
        href,
        label: primaryAction.label,
        payload: {
          perkId: perk.id,
          actionId: primaryAction.id,
          amountCents,
          completionKind: "perk_claim",
          ...(perk.value_type === "dollar"
            ? {
                progressCurrentCents: Math.round((perk.used_value ?? 0) * 100),
                progressTargetCents: Math.round((perk.annual_value ?? 0) * 100),
              }
            : {}),
        },
      },
      valueEstimateCents: perk.value_type === "dollar" ? Math.round(remaining * 100) : null,
      dueAt: resetDate.toISOString(),
      expiresAt: resetDate.toISOString(),
      recurrenceKey: `credit-action:${perk.id}:${monthKey(resetDate)}`,
    }));
  }
}

export function generateWalletActions(context: WalletCopilotContext, now = new Date(context.generatedAt)): UserActionInput[] {
  const actions: UserActionInput[] = generateWalletRecommendations(context, now).map(fromRecommendation);

  for (const alert of context.alerts) {
    actions.push(fromAlert(alert));
  }

  addPerkCreditActions(context, now, actions);

  const seen = new Set<string>();
  return actions
    .filter((action) => {
      if (seen.has(action.recurrenceKey)) return false;
      seen.add(action.recurrenceKey);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 40);
}
