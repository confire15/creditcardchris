import { describe, expect, it } from "vitest";
import {
  annualFeeWorthLabel,
  buildAnnualFeeEvents,
  buildAnnualFeeIcs,
  getNextAnnualDate,
} from "../annual-fees";
import type { CardPerk, SpendingCategory, StatementCredit, UserCard } from "@/lib/types/database";

const dining: SpendingCategory = {
  id: "cat-dining",
  name: "dining",
  display_name: "Dining",
  icon: null,
  user_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

function card(overrides: Partial<UserCard> = {}): UserCard {
  return {
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
    annual_fee_date: "2026-04-15",
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
      color: "#b8860b",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    rewards: [
      {
        id: "reward-1",
        user_card_id: "card-1",
        category_id: dining.id,
        multiplier: 4,
        cap_amount: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function credit(overrides: Partial<StatementCredit> = {}): StatementCredit {
  return {
    id: "credit-1",
    user_id: "user-1",
    user_card_id: "card-1",
    name: "Dining credit",
    annual_amount: 120,
    used_amount: 0,
    reset_month: 1,
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

function perk(overrides: Partial<CardPerk> = {}): CardPerk {
  return {
    id: "perk-1",
    user_id: "user-1",
    user_card_id: "card-1",
    card_perk_template_id: null,
    name: "Hotel status",
    description: null,
    perk_type: "status",
    value_type: "dollar",
    annual_value: 150,
    annual_count: null,
    used_value: 0,
    used_count: 0,
    is_redeemed: false,
    reset_cadence: "annual",
    reset_month: 1,
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

describe("annual fee calendar utilities", () => {
  it("rolls saved annual fee dates into the next upcoming year", () => {
    expect(getNextAnnualDate("2026-04-15", new Date("2026-05-21T12:00:00.000Z"))).toBe("2027-04-15");
    expect(getNextAnnualDate("2026-06-15", new Date("2026-05-21T12:00:00.000Z"))).toBe("2026-06-15");
  });

  it("builds sorted fee events with worth status and Google Calendar links", () => {
    const events = buildAnnualFeeEvents({
      cards: [
        card(),
        card({
          id: "card-2",
          nickname: "Venture X",
          annual_fee_date: null,
          account_opened_on: "2026-06-01",
          card_template: { ...card().card_template!, annual_fee: 395, issuer: "Capital One", name: "Capital One Venture X" },
        }),
      ],
      credits: [credit()],
      perks: [perk()],
      categories: [dining],
      categorySpend: { "card-1": { [dining.id]: 1200 } },
      currentUserId: "user-1",
      now: new Date("2026-05-21T12:00:00.000Z"),
    });

    expect(events[0].cardName).toBe("Venture X");
    expect(events[0].dateSource).toBe("estimated_from_opened_on");
    expect(events[0].worthStatus).toBe("needs_data");
    expect(events[1].dueDate).toBe("2027-04-15");
    expect(annualFeeWorthLabel(events[1].worthStatus)).toBe("Close call");
    expect(events[1].googleCalendarUrl).toContain("calendar.google.com");
  });

  it("exports dated annual fees as yearly ICS events", () => {
    const [event] = buildAnnualFeeEvents({
      cards: [card({ annual_fee_date: "2026-06-15" })],
      credits: [credit()],
      perks: [],
      categories: [dining],
      categorySpend: {},
      currentUserId: "user-1",
      now: new Date("2026-05-21T12:00:00.000Z"),
    });

    const ics = buildAnnualFeeIcs([event], new Date("2026-05-21T12:00:00.000Z"));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Annual fee: Gold");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260615");
    expect(ics).toContain("RRULE:FREQ=YEARLY");
  });
});
