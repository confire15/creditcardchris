import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";

type Overrides = Partial<WalletCopilotContext>;

function baseCard(id = "card-1", overrides: Record<string, unknown> = {}) {
  return {
    id,
    user_id: "user-1",
    card_template_id: `template-${id}`,
    nickname: "Card",
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
      id: `template-${id}`,
      name: "Test Card",
      issuer: "Test Bank",
      network: "Visa",
      annual_fee: 95,
      reward_type: "cashback",
      reward_unit: "cashback",
      base_reward_rate: 1,
      image_url: null,
      color: null,
      created_at: "2026-01-01T00:00:00.000Z",
      rewards: [],
    },
    rewards: [],
    ...overrides,
  };
}

function emptyInsights(card: ReturnType<typeof baseCard>) {
  return {
    totalAnnualFees: 0,
    plannedCreditsValue: 0,
    usedCreditsValue: 0,
    unusedCreditsValue: 0,
    perksValue: 0,
    rewardsValue: 0,
    subValue: 0,
    retentionValue: 0,
    netValue: 0,
    creditCaptureRate: 0,
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
        annualFee: 0,
        plannedCreditsValue: 0,
        usedCreditsValue: 0,
        unusedCreditsValue: 0,
        perksValue: 0,
        rewardsValue: 0,
        subValue: 0,
        retentionValue: 0,
        netValue: 0,
        verdict: "keep" as const,
        moneyLeaks: [],
        renewalDaysUntil: null,
      },
    ],
  };
}

function makeContext(overrides: Overrides = {}): WalletCopilotContext {
  const card = baseCard();
  return {
    userId: "user-1",
    scopedUserIds: ["user-1"],
    generatedAt: "2026-05-20T12:00:00.000Z",
    cards: [card],
    categories: [],
    credits: [],
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
    insights: emptyInsights(card),
    summary: {
      activeCards: 1,
      annualFeeCards: 0,
      unusedCreditValue: 0,
      activeOffers: 0,
      expiringLoyaltyAccounts: 0,
      openSubs: 0,
      upcomingAlerts: 0,
    },
    ...overrides,
  } as WalletCopilotContext;
}

export type EvalFixture = {
  name: string;
  description: string;
  context: WalletCopilotContext;
  expect: {
    minRecommendations: number;
    requiredTypes?: string[];
    forbiddenTypes?: string[];
  };
};

export const evalFixtures: EvalFixture[] = [
  {
    name: "empty-wallet",
    description: "User just signed up — one card, no data",
    context: makeContext(),
    expect: { minRecommendations: 0 },
  },
  {
    name: "unused-credit-this-month",
    description: "Has unused dining credit resetting this month",
    context: makeContext({
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
      ] as unknown as WalletCopilotContext["credits"],
    }),
    expect: { minRecommendations: 1, requiredTypes: ["credit_capture"] },
  },
  {
    name: "cancel-verdict-near-renewal",
    description: "Card with negative net value, renewal in 19 days",
    context: (() => {
      const card = baseCard("card-2", { nickname: "Gold", card_template_id: "amex-gold" });
      const ctx = makeContext({ cards: [card] });
      ctx.insights = {
        ...ctx.insights,
        totalAnnualFees: 325,
        netValue: -205,
        cardInsights: [
          {
            card,
            annualFee: 325,
            plannedCreditsValue: 0,
            usedCreditsValue: 0,
            unusedCreditsValue: 0,
            perksValue: 0,
            rewardsValue: 0,
            subValue: 0,
            retentionValue: 0,
            netValue: -205,
            verdict: "cancel" as const,
            moneyLeaks: ["Gold is negative"],
            renewalDaysUntil: 19,
          },
        ],
      };
      return ctx;
    })(),
    expect: { minRecommendations: 1, requiredTypes: ["renewal_rescue"] },
  },
  {
    name: "expiring-offer",
    description: "Amex offer expiring in 5 days",
    context: makeContext({
      offers: [
        {
          id: "offer-1",
          user_id: "user-1",
          user_card_id: "card-1",
          merchant: "Whole Foods",
          value_amount: 15,
          value_percent: null,
          min_spend: 50,
          expires_on: "2026-05-25",
          is_used: false,
          activated_at: null,
          notes: null,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      ] as unknown as WalletCopilotContext["offers"],
    }),
    expect: { minRecommendations: 1, requiredTypes: ["offer_matcher"] },
  },
  {
    name: "sub-pace-tight",
    description: "Card SUB needs $3000 more with 12 days left",
    context: makeContext({
      subs: [
        {
          id: "sub-1",
          user_id: "user-1",
          user_card_id: "card-1",
          required_spend: 4000,
          current_spend: 1000,
          deadline: "2026-06-01",
          bonus_amount: 60000,
          bonus_unit: "points",
          is_met: false,
          notes: null,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      ] as unknown as WalletCopilotContext["subs"],
    }),
    expect: { minRecommendations: 1, requiredTypes: ["sub_pace"] },
  },
  {
    name: "points-expiring",
    description: "Loyalty points expire in 25 days",
    context: makeContext({
      loyaltyAccounts: [
        {
          id: "loy-1",
          user_id: "user-1",
          program_name: "Hilton Honors",
          balance: 50000,
          point_value_cpp: 0.5,
          expiration_date: "2026-06-14",
          is_active: true,
          notes: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ] as unknown as WalletCopilotContext["loyaltyAccounts"],
    }),
    expect: { minRecommendations: 1, requiredTypes: ["points_expiration"] },
  },
  {
    name: "missing-fee-date",
    description: "Card has annual fee but no annual_fee_date",
    context: (() => {
      const card = baseCard("card-3", {
        annual_fee_date: null,
        custom_annual_fee: 95,
      });
      return makeContext({ cards: [card] });
    })(),
    expect: { minRecommendations: 1, requiredTypes: ["data_cleanup"] },
  },
  {
    name: "dense-wallet",
    description: "Multi-card, multi-signal: credits, offers, SUB, points all active",
    context: makeContext({
      credits: [
        {
          id: "credit-2",
          user_id: "user-1",
          user_card_id: "card-1",
          name: "Uber credit",
          annual_amount: 200,
          used_amount: 50,
          reset_month: 12,
          will_use: true,
          cadence: "monthly",
          period_amount: 17,
          eligible_merchant_text: null,
          activation_hint: null,
          organic_value: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ] as unknown as WalletCopilotContext["credits"],
      offers: [
        {
          id: "offer-2",
          user_id: "user-1",
          user_card_id: "card-1",
          merchant: "Best Buy",
          value_amount: 30,
          value_percent: null,
          min_spend: 100,
          expires_on: "2026-06-10",
          is_used: false,
          activated_at: null,
          notes: null,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      ] as unknown as WalletCopilotContext["offers"],
    }),
    expect: { minRecommendations: 2 },
  },
];
