import { describe, it, expect } from "vitest";
import {
  defaultKit,
  changeQuantity,
  getSummary,
  missingQuantity,
  isPacked,
  parseSavedKit,
  isDate,
} from "../kit";
import { emergencyItems } from "@/data/emergency-items";
import { dueReviews, reviewCalendar } from "../reminders";
const water = emergencyItems.find((i) => i.id === "water")!;
describe("partial ownership and packing", () => {
  it("budgets only unowned units and does not mark owned supplies packed", () => {
    const initial = { ...defaultKit, people: 2 };
    const state = changeQuantity(initial, water, "owned", 2);
    expect(missingQuantity(water, state)).toBe(4);
    expect(getSummary(state).min).toBe(getSummary(initial).min - 4);
    expect(isPacked(water, state)).toBe(false);
    const owned = changeQuantity(state, water, "owned", 6);
    expect(getSummary(owned).missing).not.toContain(water);
    expect(getSummary(owned).unpacked).toContain(water);
  });
  it("enforces packed <= owned and preserves owned quantities when unpacking", () => {
    const packed = changeQuantity(defaultKit, water, "completed", 3);
    expect(packed.owned.water).toBe(3);
    expect(changeQuantity(packed, water, "completed", 0).owned.water).toBe(3);
    expect(changeQuantity(packed, water, "owned", 1).completed.water).toBe(1);
  });
  it("recalculates only additional supplies after configuration changes", () => {
    const state = changeQuantity(defaultKit, water, "completed", 3);
    expect(missingQuantity(water, { ...state, days: 7 })).toBe(4);
    expect(missingQuantity(water, { ...state, people: 2 })).toBe(3);
    expect(missingQuantity(water, { ...state, mode: "stay-home" })).toBe(0);
  });
  it("clamps invalid inventory edits", () => {
    expect(changeQuantity(defaultKit, water, "owned", NaN).owned.water).toBe(0);
    expect(changeQuantity(defaultKit, water, "owned", -1).owned.water).toBe(0);
    expect(changeQuantity(defaultKit, water, "owned", 10001).owned.water).toBe(
      10000,
    );
  });
});
describe("saved plans and reminders", () => {
  it("migrates old checklists without losing packed quantities", () => {
    const saved = parseSavedKit(
      JSON.stringify({ people: 2, days: 7, completed: { water: 6 } }),
    );
    expect(saved.owned.water).toBe(6);
    expect(saved.completed.water).toBe(6);
    expect(missingQuantity(water, saved)).toBe(8);
  });
  it("validates new data and round trips an emergency plan", () => {
    const state = {
      ...defaultKit,
      owned: { water: 2 },
      needs: ["dietary" as const],
      reviewDates: { water: "2027-03-02" },
      plan: { nearbyMeeting: "Library" },
    };
    expect(parseSavedKit(JSON.stringify(state))).toEqual(state);
    const invalid = parseSavedKit(
      JSON.stringify({
        needs: ["bad", "dietary"],
        reviewDates: {
          water: "2027-02-30",
          food: "2027-03-02",
          fake: "2027-01-01",
        },
        owned: { water: -3, food: 1.5, fake: 3 },
        plan: { nearbyMeeting: "a".repeat(600) },
      }),
    );
    expect(invalid.needs).toEqual(["dietary"]);
    expect(invalid.reviewDates).toEqual({ food: "2027-03-02" });
    expect(invalid.owned).toEqual({});
    expect(invalid.plan.nearbyMeeting?.length).toBe(500);
  });
  it("exports all-day calendar events and includes overdue items", () => {
    const state = {
      ...defaultKit,
      reviewDates: {
        water: "2026-12-31",
        "personal-medications": "2026-09-16",
      },
    };
    expect(dueReviews(state, "2026-09-16").map((i) => i.id)).toEqual([
      "personal-medications",
    ]);
    const calendar = reviewCalendar(state);
    expect(calendar).toContain("DTEND;VALUE=DATE:20270101");
    expect(calendar).toContain("Review GoBag: Prescription medications");
    expect(calendar).toContain("TRIGGER:-P1D");
    expect(isDate("invalid")).toBe(false);
  });
});
