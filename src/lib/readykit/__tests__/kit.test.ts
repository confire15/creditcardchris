import { describe, expect, it } from "vitest";
import { emergencyItems, petItems } from "@/data/emergency-items";
import { getAmazonSearchUrl } from "../amazon";
import {
  defaultKit,
  getQuantity,
  getSummary,
  isPacked,
  itemQuantity,
  parseSavedKit,
  progressLabel,
  type KitState,
} from "../kit";
const water = emergencyItems.find((i) => i.id === "water")!;
const food = emergencyItems.find((i) => i.id === "food")!;
const flashlight = emergencyItems.find((i) => i.id === "flashlight")!;

describe("household quantities and costs", () => {
  it.each([3, 7, 14])(
    "calculates water and food for 2 people for %i days",
    (days) => {
      expect(getQuantity(water, 2, days)).toBe(2 * days);
      expect(getQuantity(food, 2, days)).toBe(2 * days);
      expect(getQuantity(flashlight, 2, days)).toBe(2);
    },
  );
  it("rounds up fractional packs and keeps fixed supplies fixed", () => {
    expect(
      getQuantity(
        emergencyItems.find((i) => i.id === "wipes")!,
        2,
        7,
      ),
    ).toBe(5);
    expect(
      getQuantity(
        emergencyItems.find((i) => i.id === "first-aid")!,
        50,
        14,
      ),
    ).toBe(1);
  });
  it("removes only packed quantities from remaining costs", () => {
    const initial = getSummary({ ...defaultKit, people: 2 });
    const updated = getSummary({
      ...defaultKit,
      people: 2,
      completed: { water: 6, flashlight: 2 },
    });
    expect(updated.min).toBe(initial.min - 6 * 2 - 2 * 10);
    expect(updated.max).toBe(initial.max - 6 * 5 - 2 * 25);
    expect(updated.packed).toBe(2);
    expect(updated.missing.length).toBe(emergencyItems.length - 2);
  });
  it("flags previously packed supplies when requirements increase", () => {
    const state: KitState = {
      ...defaultKit,
      completed: { water: 3, flashlight: 1 },
    };
    expect(isPacked(water, state)).toBe(true);
    expect(isPacked(water, { ...state, days: 7 })).toBe(false);
    expect(isPacked(flashlight, { ...state, days: 7 })).toBe(true);
    expect(isPacked(flashlight, { ...state, people: 2 })).toBe(false);
  });
  it("includes pets only when selected and scales them independently", () => {
    const state: KitState = {
      ...defaultKit,
      people: 4,
      days: 7,
      pets: true,
      petCount: 2,
    };
    expect(getSummary(state).items.length).toBe(
      emergencyItems.length + petItems.length,
    );
    expect(
      itemQuantity(
        petItems.find((i) => i.id === "pet-food")!,
        state,
      ),
    ).toBe(14);
    expect(getSummary(state).water).toBe(28);
    expect(getSummary({ ...state, pets: false }).items.length).toBe(
      emergencyItems.length,
    );
  });
  it("does not count optional personal items, and handles a completed kit", () => {
    const completed = Object.fromEntries(
      emergencyItems.map((i) => [i.id, itemQuantity(i, defaultKit)]),
    );
    const summary = getSummary({
      ...defaultKit,
      completed: { ...completed, "personal-cash": 1 },
    });
    expect(summary.percent).toBe(100);
    expect(summary.min).toBe(0);
    expect(summary.max).toBe(0);
    expect(summary.missing).toEqual([]);
  });
  it.each([
    [0, "Getting started"],
    [25, "Getting started"],
    [26, "Making progress"],
    [50, "Making progress"],
    [51, "Almost ready"],
    [75, "Almost ready"],
    [76, "Nearly prepared"],
    [99, "Nearly prepared"],
    [100, "Go-bag ready"],
  ])("labels progress at %i percent", (percent, label) => {
    expect(progressLabel(percent as number)).toBe(label);
  });
});
describe("persistent state validation", () => {
  it("round-trips household, duration, pets, mode, and packed quantities", () => {
    const state: KitState = {
      people: 3,
      days: 14,
      pets: true,
      petCount: 2,
      mode: "stay-home",
      completed: { water: 42, "personal-cash": 1 },
    };
    expect(parseSavedKit(JSON.stringify(state))).toEqual(state);
  });
  it("sanitizes invalid values and unknown item ids", () => {
    expect(
      parseSavedKit(
        JSON.stringify({
          people: -2,
          days: 8,
          pets: "true",
          petCount: 100,
          mode: "bad",
          completed: { water: -1, unknown: 1, flashlight: 2, __proto__: 20 },
        }),
      ),
    ).toEqual({ ...defaultKit, completed: { flashlight: 2 } });
    expect(() => parseSavedKit("{bad json")).toThrow();
    expect(() => parseSavedKit("null")).toThrow();
    expect(() => parseSavedKit("[]")).toThrow();
  });
});
describe("outbound links and content integrity", () => {
  it("encodes search terms and supports optional affiliate tags", () => {
    const plain = new URL(getAmazonSearchUrl("water & food / USB-C", ""));
    expect(plain.origin + plain.pathname).toBe("https://www.amazon.com/s");
    expect(plain.searchParams.get("k")).toBe("water & food / USB-C");
    expect(plain.searchParams.has("tag")).toBe(false);
    expect(
      new URL(getAmazonSearchUrl("first aid", "readykit-20")).searchParams.get(
        "tag",
      ),
    ).toBe("readykit-20");
  });
  it("has unique ids, complete ranges, and official guidance URLs", () => {
    const items = [...emergencyItems, ...petItems];
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    items.forEach((i) => {
      if (i.readyGovUrl)
        expect(new URL(i.readyGovUrl).hostname).toBe("www.ready.gov");
      if (i.estimatedPriceMin !== undefined)
        expect(i.estimatedPriceMax).toBeGreaterThanOrEqual(i.estimatedPriceMin);
      if (i.searchTerm)
        expect(new URL(getAmazonSearchUrl(i.searchTerm)).pathname).toBe("/s");
    });
  });
});
