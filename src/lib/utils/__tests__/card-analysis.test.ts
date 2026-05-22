import { describe, expect, it } from "vitest";
import { buildWalletInsights, computeRewardsValue } from "../card-analysis";
import type {
  CardPerk,
  CardRenewalReview,
  CardSub,
  LoyaltyAccount,
  SpendingCategory,
  StatementCredit,
  UserCard,
  UserCardOffer,
} from "@/lib/types/database";

const dining: SpendingCategory = {
  id: "cat-dining",
  name: "dining",
  display_name: "Dining",
  icon: null,
  user_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

function makeCard(overrides: Partial<UserCard> = {}): UserCard {
  return {
    id: "card-1",
    user_id: "user-1",
    card_template_id: "template-1",
    nickname: "Sapphire",
    custom_name: null,
    custom_issuer: null,
    custom_network: null,
    custom_reward_type: null,
    custom_reward_unit: null,
    custom_base_reward_rate: null,
    custom_color: null,
    last_four: "1234",
    is_active: true,
    sort_order: 0,
    points_expiration_date: null,
    annual_fee_date: "2026-06-01",
    custom_annual_fee: null,
    custom_cpp: null,
    cpp_redemption_mode: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    card_template: {
      id: "template-1",
      name: "Chase Sapphire Preferred",
      issuer: "Chase",
      network: "Visa",
      annual_fee: 95,
      reward_type: "points",
      reward_unit: "Ultimate Rewards",
      base_reward_rate: 1,
      image_url: null,
      color: "#123456",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    rewards: [
      {
        id: "reward-1",
        user_card_id: "card-1",
        category_id: dining.id,
        multiplier: 3,
        cap_amount: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function makeCredit(overrides: Partial<StatementCredit> = {}): StatementCredit {
  return {
    id: "credit-1",
    user_id: "user-1",
    user_card_id: "card-1",
    name: "Hotel Credit",
    annual_amount: 50,
    used_amount: 20,
    reset_month: 12,
    will_use: true,
    cadence: "annual",
    period_amount: null,
    eligible_merchant_text: null,
    activation_hint: null,
    organic_value: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePerk(overrides: Partial<CardPerk> = {}): CardPerk {
  return {
    id: "perk-1",
    user_id: "user-1",
    user_card_id: "card-1",
    card_perk_template_id: null,
    name: "DashPass",
    description: null,
    perk_type: "other",
    value_type: "dollar",
    annual_value: 30,
    annual_count: null,
    used_value: 0,
    used_count: 0,
    is_redeemed: false,
    reset_cadence: "annual",
    reset_month: 12,
    last_reset_at: null,
    notify_before_reset: true,
    notify_days_before: 30,
    is_active: true,
    sort_order: 0,
    notes: null,
    closed_via_app_at: null,
    closed_via_action_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("premium wallet insight engine", () => {
  it("computes rewards value from category spend, multipliers, and default CPP", () => {
    const value = computeRewardsValue(makeCard(), [dining], { [dining.id]: 1200 }, 1.5);
    expect(value).toBe(54);
  });

  it("combines fees, planned credits, used credits, perks, rewards, SUBs, and retention value", () => {
    const summary = buildWalletInsights({
      cards: [makeCard()],
      credits: [makeCredit()],
      perks: [makePerk()],
      categories: [dining],
      globalSpend: { [dining.id]: 1200 },
      subs: [
        {
          id: "sub-1",
          user_id: "user-1",
          user_card_id: "card-1",
          reward_amount: 10000,
          reward_unit: "Ultimate Rewards",
          required_spend: 4000,
          current_spend: 1000,
          deadline: "2026-08-01",
          is_met: false,
          met_at: null,
          notes: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        } satisfies CardSub,
      ],
      renewalReviews: [
        {
          id: "review-1",
          user_id: "user-1",
          user_card_id: "card-1",
          annual_fee_posted_on: "2026-05-01",
          refund_deadline: "2026-05-31",
          retention_offer_value: 25,
          retention_offer_notes: null,
          decision: "undecided",
          notes: null,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        } satisfies CardRenewalReview,
      ],
      now: new Date("2026-05-01T00:00:00.000Z"),
    });

    expect(summary.totalAnnualFees).toBe(95);
    expect(summary.plannedCreditsValue).toBe(50);
    expect(summary.usedCreditsValue).toBe(20);
    expect(summary.unusedCreditsValue).toBe(30);
    expect(summary.perksValue).toBe(30);
    expect(summary.rewardsValue).toBe(54);
    expect(summary.subValue).toBe(150);
    expect(summary.retentionValue).toBe(25);
    expect(summary.netValue).toBe(214);
    expect(summary.creditCaptureRate).toBe(40);
    expect(summary.cardInsights[0].verdict).toBe("keep");
    expect(summary.renewalWarnings[0].renewalDaysUntil).toBe(31);
  });

  it("flags negative annual-fee cards and unused credits as money leaks", () => {
    const summary = buildWalletInsights({
      cards: [makeCard({ rewards: [], card_template: { ...makeCard().card_template!, annual_fee: 250 } })],
      credits: [makeCredit({ annual_amount: 100, used_amount: 0, will_use: true })],
      perks: [],
      categories: [dining],
      globalSpend: {},
      now: new Date("2026-05-01T00:00:00.000Z"),
    });

    expect(summary.cancelCandidates).toHaveLength(1);
    expect(summary.topMoneyLeaks).toEqual(
      expect.arrayContaining([
        expect.stringContaining("negative by $150"),
        expect.stringContaining("$100 unused credits"),
      ]),
    );
  });

  it("summarizes manual points, expiring points, active offer value, and card-change impact", () => {
    const summary = buildWalletInsights({
      cards: [],
      credits: [],
      perks: [],
      categories: [],
      globalSpend: {},
      loyaltyAccounts: [
        {
          id: "loyalty-1",
          user_id: "user-1",
          program_name: "United",
          program_type: "airline",
          balance: 50000,
          point_value_cpp: 1.3,
          expiration_date: "2026-06-15",
          notes: null,
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        } satisfies LoyaltyAccount,
      ],
      offers: [
        {
          id: "offer-1",
          user_id: "user-1",
          user_card_id: "card-1",
          merchant: "Dell",
          offer_type: "statement_credit",
          value_amount: 40,
          value_percent: null,
          minimum_spend: 200,
          expires_on: "2026-05-30",
          is_activated: true,
          is_used: false,
          notes: null,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        } satisfies UserCardOffer,
      ],
      cardChanges: [
        {
          id: "change-1",
          card_template_id: "template-1",
          issuer: "Chase",
          title: "Fee change",
          change_type: "fee",
          summary: "Annual fee changed.",
          effective_on: "2026-06-01",
          estimated_annual_impact: -95,
          source_url: null,
          created_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      now: new Date("2026-05-01T00:00:00.000Z"),
    });

    expect(summary.loyaltyValue).toBeCloseTo(650);
    expect(summary.expiringPointsValue).toBeCloseTo(650);
    expect(summary.activeOffersValue).toBe(40);
    expect(summary.cardChangeImpact).toBe(-95);
  });
});
