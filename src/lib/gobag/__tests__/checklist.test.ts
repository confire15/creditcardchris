import { describe, expect, it } from "vitest";
import { emergencyItems } from "@/data/emergency-items";
import {
  changeQuantity,
  defaultKit,
  isPacked,
  itemQuantity,
  ownedQuantity,
} from "../kit";
import { completionSnapshot, supplyStatus, restoreCompletion } from "../checklist";

const water = emergencyItems.find((i) => i.id === "water")!;
const flashlight = emergencyItems.find((i) => i.id === "flashlight")!;
describe("checklist completion and undo", () => {
  it("moves a go-bag item from needed to ready to packed using quantities", () => {
    const initial = { ...defaultKit, people: 2 };
    expect(supplyStatus(flashlight, initial)).toBe("needs-supplies");
    const partial = changeQuantity(initial, flashlight, "owned", 1);
    expect(supplyStatus(flashlight, partial)).toBe("needs-supplies");
    const owned = changeQuantity(partial, flashlight, "owned", 2);
    expect(supplyStatus(flashlight, owned)).toBe("ready");
    const partiallyPacked = changeQuantity(owned, flashlight, "completed", 1);
    expect(supplyStatus(flashlight, partiallyPacked)).toBe("ready");
    const packed = changeQuantity(partiallyPacked, flashlight, "completed", 2);
    expect(supplyStatus(flashlight, packed)).toBe("complete");
    const unpacked = changeQuantity(packed, flashlight, "completed", 0);
    expect(supplyStatus(flashlight, unpacked)).toBe("ready");
    expect(ownedQuantity(flashlight, unpacked)).toBe(2);
    expect(restoreCompletion(unpacked, completionSnapshot(packed, flashlight.id)))
      .toEqual({ owned: { flashlight: 2 }, completed: { flashlight: 2 } });
    expect(supplyStatus(flashlight, { ...packed, people: 3 })).toBe("needs-supplies");
  });
  it("records full ownership without packing and can undo it", () => {
    const before = completionSnapshot(defaultKit, flashlight.id);
    const owned = changeQuantity(defaultKit, flashlight, "owned", 1);
    expect(supplyStatus(flashlight, owned)).toBe("ready");
    expect(owned.completed[flashlight.id]).toBe(0);
    expect(restoreCompletion(owned, before)).toEqual({ owned: {}, completed: {} });
  });
  it("moves home supplies from needed to ready to stored without losing ownership", () => {
    expect(supplyStatus(water, defaultKit)).toBe("needs-supplies");
    const partial = changeQuantity(defaultKit, water, "owned", 2);
    expect(supplyStatus(water, partial)).toBe("needs-supplies");
    const owned = changeQuantity(partial, water, "owned", 3);
    expect(supplyStatus(water, owned)).toBe("ready");
    const partlyStored = changeQuantity(owned, water, "completed", 1);
    expect(supplyStatus(water, partlyStored)).toBe("ready");
    const stored = changeQuantity(partlyStored, water, "completed", 3);
    expect(supplyStatus(water, stored)).toBe("complete");
    const removed = changeQuantity(stored, water, "completed", 0);
    expect(supplyStatus(water, removed)).toBe("ready");
    expect(ownedQuantity(water, removed)).toBe(3);
    expect(restoreCompletion(removed, completionSnapshot(stored, water.id)))
      .toEqual({ owned: { water: 3 }, completed: { water: 3 } });
    expect(supplyStatus(water, { ...stored, people: 2 })).toBe("needs-supplies");
  });
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

import { planChecklist } from "../checklist";
import { activeHomeActions, preparationProgress, setPreparationApplicable } from "../preparation";
import { getSummary, parseSavedKit } from "../kit";

describe("unified plan sections", () => {
  it("counts every active task exactly once and agrees with existing progress", () => {
    const state = { ...defaultKit, pets: true, concerns: ["Flooding" as const], combinedRadio: true };
    const plan = planChecklist(state);
    const ids = [...plan.safety, ...plan.household, ...getSummary(state).items].map(task => task.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(activeHomeActions(state).length + getSummary(state).items.length);
    expect(plan.progress).toEqual(preparationProgress(state));
    expect(plan.nextId).toBe("home-alerts");
    expect(plan.nextSection).toBe("safety");
  });
  it("recommends the section with unfinished tasks, preserving skipped progress", () => {
    const initial = planChecklist(defaultKit);
    const completed = Object.fromEntries(initial.safety.map(action => [action.id, 1]));
    const state = { ...defaultKit, completed };
    expect(planChecklist(state).nextSection).toBe("supplies");
    const stocked = getSummary(state).items.reduce((current, item) => changeQuantity(current, item, "completed", itemQuantity(item, current)), state);
    expect(planChecklist(stocked).nextSection).toBe("household");
    const excluded = setPreparationApplicable(stocked, initial.safety[0].id, false);
    expect(planChecklist(excluded).progress).toEqual(preparationProgress(excluded));
    expect(excluded.completed[initial.safety[0].id]).toBe(1);
  });
  it("keeps inventory, plan notes, preferences, and task completion on reload", () => {
    const state = { ...changeQuantity(defaultKit, water, "completed", 3), completed: { water: 3, "home-alerts": 1 }, plan: { nearbyMeeting: "Test meeting point" }, livingSituation: "rent" as const };
    const restored = parseSavedKit(JSON.stringify(state));
    expect(restored.plan).toEqual(state.plan);
    expect(restored.livingSituation).toBe("rent");
    expect(planChecklist(restored).progress).toEqual({ done: 2, total: 47 });
    expect(getSummary(restored).missing.some(item => item.id === "water")).toBe(false);
    expect(getSummary({ ...restored, people: 2 }).missing.some(item => item.id === "water")).toBe(true);
    expect(restored.owned.water).toBe(3);
  });
});
