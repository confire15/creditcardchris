import { describe, expect, it } from "vitest";
import { changeQuantity, defaultKit, getSummary, itemQuantity, missingQuantity } from "../kit";
import { completionSnapshot, restoreCompletion } from "../checklist";
import { initialLibrary, parseLibrary } from "../library";

describe("shopping completion and independent receipts", () => {
  it("restores partial owned and packed quantities without reverting subsequent actions", () => {
    const [first, second] = getSummary(defaultKit).items;
    let state = changeQuantity(defaultKit, first, "owned", 1);
    state = changeQuantity(state, first, "completed", 1);
    const snapshot = completionSnapshot(state, first.id);
    state = changeQuantity(state, first, "owned", itemQuantity(first, state));
    state = changeQuantity(state, second, "owned", itemQuantity(second, state));
    state = { ...state, ...restoreCompletion(state, snapshot) };
    expect(state.owned[first.id]).toBe(1);
    expect(state.completed[first.id]).toBe(1);
    expect(missingQuantity(second, state)).toBe(0);
  });
  it("persists a completed list and returns the final supply on Undo", () => {
    let state = { ...defaultKit };
    const items = getSummary(state).items;
    for (const item of items.slice(0, -1)) state = changeQuantity(state, item, "owned", itemQuantity(item, state));
    const last = items[items.length - 1];
    const snapshot = completionSnapshot(state, last.id);
    expect(getSummary(state).missing).toHaveLength(1);
    state = changeQuantity(state, last, "owned", itemQuantity(last, state));
    const library = { ...initialLibrary, kits: [{ ...initialLibrary.kits[0], state }] };
    state = parseLibrary(JSON.stringify(library)).kits[0].state;
    expect(getSummary(state).missing).toHaveLength(0);
    state = { ...state, ...restoreCompletion(state, snapshot) };
    expect(getSummary(state).missing.map(item => item.id)).toEqual([last.id]);
    expect(state.owned[last.id]).toBeUndefined();
  });
});
