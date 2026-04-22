import { describe, it, expect } from "vitest";
import {
  breakEvenAnnualSpend,
  isBelowBreakEven,
} from "../recommend-math";

describe("breakEvenAnnualSpend", () => {
  it("returns the annual spend needed to offset a fee at a given multiplier", () => {
    // $95 AF at 3x over 1x baseline: $95 / 2% = $4,750
    expect(breakEvenAnnualSpend(95, 3)).toBe(4750);
  });

  it("returns 0 when there is no annual fee", () => {
    expect(breakEvenAnnualSpend(0, 3)).toBe(0);
  });

  it("returns 0 when the multiplier is not above baseline", () => {
    expect(breakEvenAnnualSpend(95, 1)).toBe(0);
    expect(breakEvenAnnualSpend(95, 0.5)).toBe(0);
  });

  it("rounds up so the threshold truly covers the fee", () => {
    // $100 AF at 2.5x: 100 / 1.5% = 6666.66... -> 6667
    expect(breakEvenAnnualSpend(100, 2.5)).toBe(6667);
  });
});

describe("isBelowBreakEven", () => {
  it("returns true when monthly spend x 12 is under break-even", () => {
    // $50/mo = $600/yr < $4,750 break-even for ($95 AF, 3x)
    expect(isBelowBreakEven(50, 95, 3)).toBe(true);
  });

  it("returns false when monthly spend clears break-even", () => {
    // $500/mo = $6,000/yr > $4,750
    expect(isBelowBreakEven(500, 95, 3)).toBe(false);
  });

  it("returns false when the card has no annual fee", () => {
    expect(isBelowBreakEven(100, 0, 3)).toBe(false);
  });

  it("returns false when the card has no uplift over baseline", () => {
    expect(isBelowBreakEven(100, 95, 1)).toBe(false);
  });

  it("returns false when the user has not entered a spend yet", () => {
    expect(isBelowBreakEven(0, 95, 3)).toBe(false);
  });

  it("is false at the exact break-even boundary", () => {
    // $4,750 break-even; $4,750/12 = 395.833... — use a monthly value that
    // annualizes to exactly 4750 (must be strictly less-than to warn)
    const monthlyAtBreakEven = 4750 / 12;
    expect(isBelowBreakEven(monthlyAtBreakEven, 95, 3)).toBe(false);
  });
});
