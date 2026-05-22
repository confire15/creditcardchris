import { describe, expect, it } from "vitest";
import { buildUpcomingAlerts } from "../upcoming-alerts";

const now = new Date("2026-05-01T12:00:00.000Z");

describe("buildUpcomingAlerts", () => {
  it("builds premium alerts for points, offers, rotating categories, card changes, and refund windows", () => {
    const alerts = buildUpcomingAlerts({
      now,
      windowDays: 30,
      loyaltyExpirationInputs: [
        {
          id: "loyalty-1",
          program_name: "United MileagePlus",
          balance: 50000,
          point_value_cpp: 1.3,
          expiration_date: "2026-06-15",
        },
      ],
      offerExpirationInputs: [
        {
          id: "offer-1",
          merchant: "Dell",
          value_amount: 40,
          expires_on: "2026-05-08",
          is_used: false,
        },
      ],
      rotatingActivationInputs: [
        {
          id: "rotation-1",
          card_name: "Freedom Flex",
          category_name: "Amazon",
          is_activated: false,
          ends_on: "2026-05-31",
        },
      ],
      cardChangeInputs: [
        {
          id: "change-1",
          title: "Freedom categories active",
          summary: "Amazon and Whole Foods are active after activation.",
          effective_on: "2026-05-02",
        },
      ],
      renewalReviewInputs: [
        {
          id: "renewal-1",
          card_name: "Sapphire Reserve",
          refund_deadline: "2026-05-15",
          decision: "undecided",
        },
      ],
    });

    expect(alerts.map((alert) => alert.type)).toEqual([
      "card_change",
      "offer_expiration",
      "renewal_refund",
      "rotating_activation",
      "loyalty_expiration",
    ]);
    expect(alerts.find((alert) => alert.type === "loyalty_expiration")?.body).toContain("50,000 points");
    expect(alerts.find((alert) => alert.type === "offer_expiration")?.linkHref).toBe("/wallet?tab=offers");
    expect(alerts.find((alert) => alert.type === "rotating_activation")?.body).toContain("activate Amazon");
    expect(alerts.find((alert) => alert.type === "renewal_refund")?.linkHref).toBe("/keep-or-cancel");
  });

  it("does not alert for used offers, activated categories, decided renewals, or expired points", () => {
    const alerts = buildUpcomingAlerts({
      now,
      windowDays: 30,
      loyaltyExpirationInputs: [
        {
          id: "loyalty-1",
          program_name: "United",
          balance: 1000,
          point_value_cpp: 1,
          expiration_date: "2026-04-01",
        },
      ],
      offerExpirationInputs: [
        {
          id: "offer-1",
          merchant: "Dell",
          value_amount: 40,
          expires_on: "2026-05-08",
          is_used: true,
        },
      ],
      rotatingActivationInputs: [
        {
          id: "rotation-1",
          card_name: "Freedom Flex",
          category_name: "Amazon",
          is_activated: true,
          ends_on: "2026-05-31",
        },
      ],
      renewalReviewInputs: [
        {
          id: "renewal-1",
          card_name: "Sapphire Reserve",
          refund_deadline: "2026-05-15",
          decision: "keep",
        },
      ],
    });

    expect(alerts).toEqual([]);
  });

  it("keeps existing annual fee, perk, SUB, and challenge alerts working", () => {
    const alerts = buildUpcomingAlerts({
      now,
      annualFeeCards: [
        {
          id: "card-1",
          nickname: "Gold",
          annual_fee_date: "2026-05-31",
          custom_annual_fee: 325,
          card_template: { name: "Amex Gold", annual_fee: 325 },
        },
      ],
      perks: [
        {
          id: "perk-1",
          name: "Dining credit",
          reset_cadence: "monthly",
          reset_month: 5,
          last_reset_at: null,
          value_type: "dollar",
          annual_value: 10,
          used_value: 0,
          annual_count: null,
          used_count: 0,
          is_redeemed: false,
        },
      ],
      subPaceInputs: [
        {
          id: "sub-1",
          card_name: "Ink Preferred",
          current_spend: 100,
          required_spend: 8000,
          created_at: "2026-04-01T00:00:00.000Z",
          deadline: "2026-05-08",
          is_met: false,
        },
      ],
      challengeInputs: [
        {
          id: "challenge-1",
          title: "Spend $500 at gas",
          target_spend: 500,
          current_spend: 450,
          is_met: false,
        },
      ],
    });

    expect(alerts.map((alert) => alert.type)).toEqual(
      expect.arrayContaining(["annual_fee", "perk_reset", "sub_pace", "challenge_milestone"]),
    );
  });
});
