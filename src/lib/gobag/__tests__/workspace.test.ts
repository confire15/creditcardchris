import { describe, it, expect } from "vitest";
import {
  defaultKit,
  parseSavedKit,
  getSummary,
  changeQuantity,
  setCombinedRadio,
  totalSpent,
} from "../kit";
import {
  initialLibrary,
  parseLibrary,
  parseBackup,
  exportBackup,
  appendLibrary,
} from "../library";
import { supplyList } from "../sharing";
import { reviewItems } from "../reminders";
const custom = {
  id: "custom-test",
  name: "Spare shoes",
  category: "Your additions",
  description: "Custom supply",
  why: "Personal fit",
  quantityType: "fixed" as const,
  baseQuantity: 2,
  unit: "pair",
  icon: "tools",
  estimatedPriceMin: 15,
  estimatedPriceMax: 15,
};
describe("multi-kit backups", () => {
  it("round trips multiple kits, private plans, dates, expenses, and custom inventory", () => {
    const state = parseSavedKit(
      JSON.stringify({
        ...defaultKit,
        customItems: [custom],
        owned: { "custom-test": 1 },
        locations: { "custom-test": "Blue bag" },
        spending: { "custom-test": 14.99 },
        budget: 100,
        plan: { emergencyContact: "Private contact" },
        maintenance: { checked: ["food"], lastCompleted: "2026-09-16" },
      }),
    );
    const library = {
      version: 2 as const,
      activeId: "car",
      kits: [
        { id: "home", name: "Home", state: defaultKit },
        { id: "car", name: "Car", state },
      ],
    };
    expect(parseBackup(exportBackup(library))).toEqual(library);
  });
  it("rejects foreign, empty, oversized, duplicate, or malformed backups", () => {
    expect(() => parseBackup("{}")).toThrow();
    expect(() => parseBackup("x".repeat(10000001))).toThrow();
    expect(() =>
      parseLibrary(JSON.stringify({ ...initialLibrary, kits: [] })),
    ).toThrow();
    expect(() =>
      parseLibrary(
        JSON.stringify({
          ...initialLibrary,
          kits: [...initialLibrary.kits, ...initialLibrary.kits],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseLibrary(
        JSON.stringify({
          ...initialLibrary,
          kits: [{ id: "bad", name: "Bad", state: {} }],
        }),
      ),
    ).toThrow();
  });
  it("appends as independent kits without changing existing state", () => {
    const next = appendLibrary(initialLibrary, initialLibrary);
    expect(next.kits).toHaveLength(2);
    expect(next.kits[0]).toEqual(initialLibrary.kits[0]);
    expect(next.kits[1].id).not.toBe(next.kits[0].id);
    const edited = changeQuantity(next.kits[1].state, custom, "owned", 1);
    expect(edited.owned["custom-test"]).toBe(1);
    expect(next.kits[0].state.owned["custom-test"]).toBeUndefined();
  });
});
describe("custom supplies and purchase overlap", () => {
  it("includes custom supplies in partial costs, reminders, and progress", () => {
    const base = getSummary(defaultKit);
    const state = {
      ...defaultKit,
      customItems: [custom],
      owned: { "custom-test": 1 },
    };
    expect(getSummary(state).min).toBe(base.min + 15);
    expect(getSummary(state).items.length).toBe(base.items.length + 1);
    expect(reviewItems(state)).toContainEqual(custom);
  });
  it("combines radios without doubling inventory, cost, or spending", () => {
    const state = {
      ...defaultKit,
      owned: { radio: 1, "noaa-radio": 1 },
      completed: { "noaa-radio": 1 },
      spending: { radio: 25, "noaa-radio": 30 },
      reviewDates: { radio: "2027-03-01", "noaa-radio": "2027-01-01" },
    };
    const combined = setCombinedRadio(state, true);
    expect(combined.owned.radio).toBe(1);
    expect(combined.completed.radio).toBe(1);
    expect(combined.owned["noaa-radio"]).toBe(0);
    expect(getSummary(combined).items.some((i) => i.id === "noaa-radio")).toBe(
      false,
    );
    expect(combined.reviewDates.radio).toBe("2027-01-01");
    expect(totalSpent(combined)).toBe(55);
    expect(
      getSummary(setCombinedRadio(combined, false)).missing.some(
        (i) => i.id === "noaa-radio",
      ),
    ).toBe(true);
  });
  it("sanitizes untrusted custom item links and inventory ids", () => {
    const state = parseSavedKit(
      JSON.stringify({
        ...defaultKit,
        customItems: [
          {
            ...custom,
            searchTerm: "medications",
            readyGovUrl: "https://evil.invalid",
          },
          custom,
        ],
        locations: { unknown: "x" },
        spending: { unknown: 10, water: -2 },
      }),
    );
    expect(state.customItems).toHaveLength(1);
    expect(state.customItems[0].searchTerm).toBeUndefined();
    expect(state.customItems[0].readyGovUrl).toBeUndefined();
    expect(state.spending).toEqual({});
    expect(state.locations).toEqual({});
  });
});
describe("family supply-list privacy", () => {
  it("excludes plans, locations and spending unless explicitly selected", () => {
    const state = {
      ...defaultKit,
      plan: { emergencyContact: "SECRET CONTACT" },
      locations: { water: "SECRET LOCATION" },
      spending: { water: 123.45 },
    };
    const safe = supplyList(state, "Home");
    expect(safe).not.toContain("SECRET");
    expect(safe).not.toContain("123.45");
    const included = supplyList(state, "Home", true, true);
    expect(included).toContain("SECRET CONTACT");
    expect(included).toContain("SECRET LOCATION");
    expect(included).not.toContain("123.45");
  });
});
