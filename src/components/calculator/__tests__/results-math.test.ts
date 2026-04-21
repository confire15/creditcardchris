import { describe, it, expect } from "vitest";
import { computeEaf } from "../results-math";
import type { CalculatorState } from "../calculator-types";
import type { PremiumCard, PremiumCardCredit } from "../premium-cards";
import { CreditCard } from "lucide-react";

function makeState(overrides: Partial<CalculatorState> = {}): CalculatorState {
  return {
    step: 4,
    direction: 1,
    selectedCardId: "amex-plat",
    pointValuation: 0.02,
    monthlySpend: { dining: 500, travel: 300, groceries: 200 },
    spendMultiplier: 1,
    diningPicked: true,
    travelPicked: true,
    groceriesPicked: true,
    creditUtilization: {},
    ...overrides,
  };
}

function makeCredit(id: string, name: string, amount: number): PremiumCardCredit {
  return { id, name, amount, icon: CreditCard, copy: "" };
}

function makeCard(overrides: Partial<PremiumCard> = {}): PremiumCard {
  return {
    id: "amex-plat",
    name: "The Platinum Card",
    shortName: "Platinum",
    issuer: "Amex",
    annualFee: 895,
    rates: { dining: 5, travel: 5, groceries: 1 },
    credits: [
      makeCredit("travel-credit", "Travel Credit", 200),
      makeCredit("digital-credit", "Digital Credit", 240),
    ],
    rewardUnit: "Membership Rewards",
    color: "#6B7280",
    tagline: "The ultimate travel card",
    ...overrides,
  };
}

describe("computeEaf", () => {
  it("computes EAF correctly with no credits used and no rewards", () => {
    const state = makeState({
      monthlySpend: { dining: 0, travel: 0, groceries: 0 },
      creditUtilization: {},
    });
    const result = computeEaf(state, makeCard());
    expect(result.annualFee).toBe(895);
    expect(result.creditTotal).toBe(0);
    expect(result.rewardsValue).toBe(0);
    expect(result.eaf).toBe(895);
    expect(result.isProfit).toBe(false);
  });

  it("subtracts fully-utilized credits from annual fee", () => {
    const state = makeState({
      monthlySpend: { dining: 0, travel: 0, groceries: 0 },
      creditUtilization: { "travel-credit": 1, "digital-credit": 1 },
    });
    const result = computeEaf(state, makeCard());
    expect(result.creditTotal).toBe(440); // 200 + 240
    expect(result.eaf).toBe(895 - 440); // 455
  });

  it("applies partial credit utilization correctly", () => {
    const state = makeState({
      monthlySpend: { dining: 0, travel: 0, groceries: 0 },
      creditUtilization: { "travel-credit": 0.5 },
    });
    const result = computeEaf(state, makeCard());
    const travelLine = result.creditLines.find((l) => l.id === "travel-credit")!;
    expect(travelLine.applied).toBe(100); // 200 * 0.5
    expect(result.creditTotal).toBe(100);
  });

  it("computes rewards value based on monthly spend and CPP", () => {
    const state = makeState({
      monthlySpend: { dining: 100, travel: 0, groceries: 0 },
      creditUtilization: {},
      pointValuation: 0.02, // 2 cents per point
      spendMultiplier: 1,
    });
    const card = makeCard({ credits: [] as PremiumCardCredit[] });
    const result = computeEaf(state, card);
    // dining: 100 * 5 (rate) * 1 (mult) * 12 (months) * 0.02 (cpp) = 120
    expect(result.rewardsValue).toBeCloseTo(120);
  });

  it("marks isProfit true when EAF is negative", () => {
    // Large spend, full credits — make the card clearly profitable
    const state = makeState({
      monthlySpend: { dining: 2000, travel: 2000, groceries: 1000 },
      creditUtilization: { "travel-credit": 1, "digital-credit": 1 },
      pointValuation: 0.02,
      spendMultiplier: 1,
    });
    const result = computeEaf(state, makeCard());
    expect(result.isProfit).toBe(true);
    expect(result.eaf).toBeLessThan(0);
  });

  it("applies spendMultiplier to rewards value", () => {
    const base = makeState({ spendMultiplier: 1, creditUtilization: {} });
    const doubled = makeState({ spendMultiplier: 2, creditUtilization: {} });
    const card = makeCard({ credits: [] as PremiumCardCredit[] });
    const r1 = computeEaf(base, card);
    const r2 = computeEaf(doubled, card);
    expect(r2.rewardsValue).toBeCloseTo(r1.rewardsValue * 2);
  });
});
