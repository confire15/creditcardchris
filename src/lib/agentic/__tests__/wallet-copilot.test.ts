import { describe, expect, it } from "vitest";
import { agentRecommendationInputSchema } from "@/lib/agentic/schemas";
import { generateWalletRecommendations } from "@/lib/agentic/wallet-copilot";
import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";
import { generateWalletActions } from "@/lib/actions/wallet-actions";

function context(overrides: Partial<WalletCopilotContext> = {}): WalletCopilotContext {
  const card = {
    id: "card-1",
    user_id: "user-1",
    card_template_id: "template-1",
    nickname: "Gold",
    custom_name: null,
    custom_issuer: null,
    custom_network: null,
    custom_reward_type: null,
    custom_reward_unit: null,
    custom_base_reward_rate: null,
    custom_color: null,
    last_four: null,
    is_active: true,
    sort_order: 0,
    points_expiration_date: null,
    annual_fee_date: "2026-05-30",
    custom_annual_fee: null,
    custom_cpp: null,
    cpp_redemption_mode: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    card_template: {
      id: "template-1",
      name: "Amex Gold",
      issuer: "American Express",
      network: "Amex",
      annual_fee: 325,
      reward_type: "points",
      reward_unit: "Membership Rewards",
      base_reward_rate: 1,
      image_url: null,
      color: null,
      created_at: "2026-01-01T00:00:00.000Z",
      rewards: [],
    },
    rewards: [],
  };

  return {
    userId: "user-1",
    scopedUserIds: ["user-1"],
    generatedAt: "2026-05-11T12:00:00.000Z",
    cards: [card],
    categories: [],
    credits: [
      {
        id: "credit-1",
        user_id: "user-1",
        user_card_id: "card-1",
        name: "Dining credit",
        annual_amount: 120,
        used_amount: 40,
        reset_month: 5,
        will_use: true,
        cadence: "monthly",
        period_amount: 10,
        eligible_merchant_text: null,
        activation_hint: null,
        organic_value: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    perks: [],
    perkActions: [],
    offers: [],
    loyaltyAccounts: [],
    subs: [],
    challenges: [],
    renewalReviews: [],
    rotatingStatuses: [],
    cardChanges: [],
    globalSpend: {},
    alerts: [],
    insights: {
      totalAnnualFees: 325,
      plannedCreditsValue: 120,
      usedCreditsValue: 40,
      unusedCreditsValue: 80,
      perksValue: 0,
      rewardsValue: 0,
      subValue: 0,
      retentionValue: 0,
      netValue: -205,
      creditCaptureRate: 33,
      cancelCandidates: [],
      renewalWarnings: [],
      topMoneyLeaks: [],
      loyaltyValue: 0,
      expiringPointsValue: 0,
      activeOffersValue: 0,
      cardChangeImpact: 0,
      cardInsights: [
        {
          card,
          annualFee: 325,
          plannedCreditsValue: 120,
          usedCreditsValue: 40,
          unusedCreditsValue: 80,
          perksValue: 0,
          rewardsValue: 0,
          subValue: 0,
          retentionValue: 0,
          netValue: -205,
          verdict: "cancel",
          moneyLeaks: ["Gold is negative"],
          renewalDaysUntil: 19,
        },
      ],
    },
    summary: {
      activeCards: 1,
      annualFeeCards: 1,
      unusedCreditValue: 80,
      activeOffers: 0,
      expiringLoyaltyAccounts: 0,
      openSubs: 0,
      upcomingAlerts: 0,
    },
    ...overrides,
  } as WalletCopilotContext;
}

describe("wallet copilot recommendations", () => {
  it("creates source-backed credit and renewal recommendations", () => {
    const recommendations = generateWalletRecommendations(context());

    expect(recommendations.some((item) => item.type === "credit_capture")).toBe(true);
    expect(recommendations.some((item) => item.type === "renewal_rescue")).toBe(true);
    expect(recommendations.every((item) => item.sourceRefs.length > 0)).toBe(true);
  });

  it("rejects malformed recommendation actions", () => {
    expect(() =>
      agentRecommendationInputSchema.parse({
        type: "credit_capture",
        priority: 100,
        confidence: 0.9,
        title: "Bad recommendation",
        rationale: "No source refs should fail.",
        sourceRefs: [],
        proposedAction: { type: "mutate", href: "/wallet", label: "Do it" },
      }),
    ).toThrow();
  });

  it("creates deduped user actions from recommendations and alerts", () => {
    const actions = generateWalletActions(context({
      alerts: [
        {
          id: "fee-card-1-2026-05-30",
          type: "annual_fee",
          title: "Annual Fee Reminder",
          body: "Gold annual fee is due soon.",
          linkHref: "/annual-fees",
          daysUntil: 7,
          eventDate: "2026-05-30T00:00:00.000Z",
        },
        {
          id: "fee-card-1-2026-05-30",
          type: "annual_fee",
          title: "Annual Fee Reminder",
          body: "Gold annual fee is due soon.",
          linkHref: "/annual-fees",
          daysUntil: 7,
          eventDate: "2026-05-30T00:00:00.000Z",
        },
      ],
    }));

    expect(actions.some((item) => item.actionType === "credit_capture")).toBe(true);
    expect(actions.some((item) => item.actionType === "renewal_rescue")).toBe(true);
    expect(actions.filter((item) => item.recurrenceKey === "alert:fee-card-1-2026-05-30")).toHaveLength(1);
  });

  it("turns one-tap credit recipes into completable actions", () => {
    const actions = generateWalletActions(context({
      perks: [
        {
          id: "perk-1",
          user_id: "user-1",
          user_card_id: "card-1",
          card_perk_template_id: "perk-template-1",
          name: "Uber Cash",
          description: "Monthly Uber Cash",
          perk_type: "credit",
          value_type: "dollar",
          annual_value: 10,
          annual_count: null,
          used_value: 0,
          used_count: 0,
          is_redeemed: false,
          reset_cadence: "monthly",
          reset_month: 1,
          last_reset_at: null,
          notify_before_reset: true,
          notify_days_before: 7,
          is_active: true,
          sort_order: 0,
          notes: null,
          closed_via_app_at: null,
          closed_via_action_id: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      perkActions: [
        {
          id: "action-1",
          card_perk_template_id: "perk-template-1",
          label: "Order Uber Eats",
          action_type: "open_merchant",
          deep_link_url: "https://www.ubereats.com/",
          fallback_web_url: "https://www.ubereats.com/",
          prefill_amount_cents: 1000,
          instructions: "Use Gold at checkout.",
          sort_order: 0,
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));

    const creditAction = actions.find((item) => item.actionType === "credit_action");
    expect(creditAction?.proposedAction.type).toBe("deep_link");
    expect(creditAction?.proposedAction.payload?.completionKind).toBe("perk_claim");
  });
});
