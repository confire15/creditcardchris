import { describe, expect, it } from "vitest";
import { emergencyItems } from "@/data/emergency-items";
import {
  changeQuantity,
  defaultKit,
  isPacked,
  itemQuantity,
  ownedQuantity,
} from "../kit";
import { completionSnapshot, restoreCompletion } from "../checklist";

const water = emergencyItems.find((i) => i.id === "water")!;
describe("checklist completion and undo", () => {
  it("restores partial inventory exactly without overwriting other tasks", () => {
    const initial = {
      ...defaultKit,
      owned: { water: 2 },
      completed: { water: 1 },
    };
    const before = completionSnapshot(initial, water.id);
    const packed = changeQuantity(
      initial,
      water,
      "completed",
      itemQuantity(water, initial),
    );
    expect(isPacked(water, packed)).toBe(true);
    expect(ownedQuantity(water, packed)).toBe(3);
    const later = {
      ...packed,
      completed: { ...packed.completed, "home-alerts": 1 },
    };
    expect(restoreCompletion(later, before)).toEqual({
      owned: { water: 2 },
      completed: { water: 1, "home-alerts": 1 },
    });
  });
  it("restores absent legacy quantities instead of introducing zeros", () => {
    const before = completionSnapshot(defaultKit, water.id);
    const packed = changeQuantity(defaultKit, water, "completed", 3);
    expect(restoreCompletion(packed, before)).toEqual({
      owned: {},
      completed: {},
    });
  });
  it("removing a stored item preserves ownership; undo restores storage", () => {
    const initial = changeQuantity(defaultKit, water, "completed", 3);
    const removed = changeQuantity(initial, water, "completed", 0);
    expect(ownedQuantity(water, removed)).toBe(3);
    expect(isPacked(water, removed)).toBe(false);
    expect(
      restoreCompletion(removed, completionSnapshot(initial, water.id)),
    ).toEqual({ owned: { water: 3 }, completed: { water: 3 } });
  });
  it("a larger household updates the target without claiming more supplies", () => {
    const packed = changeQuantity(defaultKit, water, "completed", 3);
    const larger = { ...packed, people: 2, days: 7 as const };
    expect(itemQuantity(water, larger)).toBe(14);
    expect(isPacked(water, larger)).toBe(false);
    expect(ownedQuantity(water, larger)).toBe(3);
  });
});
