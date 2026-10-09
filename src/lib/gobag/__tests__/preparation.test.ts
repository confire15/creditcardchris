import { describe, expect, it } from "vitest";
import { defaultKit, parseSavedKit, changeQuantity } from "../kit";
import {
  activeHomeActions,
  nextSteps,
  preparationProgress,
} from "../preparation";
import { homeActions, preparationGroups } from "@/data/gobag-preparation";
import { getActiveItems } from "../kit";
import { matchesPreparation, setPreparationApplicable } from "../preparation";
import { emergencyItems } from "@/data/emergency-items";

describe("guided household preparation", () => {
  it("migrates legacy progress without inferring location or concerns", () => {
    const state = parseSavedKit(
      JSON.stringify({
        people: 4,
        completed: { water: 5 },
        plan: { nearbyMeeting: "Library" },
      }),
    );
    expect(state.completed.water).toBe(5);
    expect(state.owned.water).toBe(5);
    expect(state.plan.nearbyMeeting).toBe("Library");
    expect(state.location).toBe("");
    expect(state.concerns).toEqual([]);
    expect(state.setupComplete).toBe(false);
  });
  it("round trips new fields, actions, and plan entries and rejects invalid concerns", () => {
    const state = {
      ...defaultKit,
      location: "Oakland",
      concerns: ["Flooding" as const],
      setupComplete: true,
      completed: { "home-routes": 1 },
      plan: {
        destination: "Family",
        documents: "Blue folder",
        alerts: "weather.gov",
      },
    };
    expect(parseSavedKit(JSON.stringify(state))).toEqual(state);
    const invalid = parseSavedKit(
      JSON.stringify({
        location: 5,
        concerns: ["Flooding", "imagined risk", "Flooding"],
        setupComplete: "true",
        completed: { "home-fake": 1 },
      }),
    );
    expect(invalid.concerns).toEqual(["Flooding"]);
    expect(invalid.completed).toEqual({});
    expect(invalid.setupComplete).toBe(false);
  });
  it("uses selected concerns only and preserves hidden task progress", () => {
    expect(
      activeHomeActions({ ...defaultKit, location: "Coastal city" }).some(
        (a) => a.id === "home-routes",
      ),
    ).toBe(false);
    const state = {
      ...defaultKit,
      concerns: ["Flooding" as const],
      completed: { "home-routes": 1 },
    };
    expect(activeHomeActions(state).some((a) => a.id === "home-routes")).toBe(
      true,
    );
    expect(nextSteps(state).some((a) => a.id === "home-routes")).toBe(false);
    expect(nextSteps({ ...state, completed: {} }).map((a) => a.id)).toEqual([
      "home-alerts",
      "home-gutters",
      "home-documents",
    ]);
    expect(
      parseSavedKit(JSON.stringify({ ...state, concerns: [] })).completed[
        "home-routes"
      ],
    ).toBe(1);
  });
  it("advances incomplete priorities and counts only packed full quantities", () => {
    const first = nextSteps(defaultKit);
    expect(first).toHaveLength(3);
    const state = {
      ...defaultKit,
      completed: Object.fromEntries(
        activeHomeActions(defaultKit).map((a) => [a.id, 1]),
      ),
    };
    expect(nextSteps(state)[0].id).toBe("water");
    const water = emergencyItems.find((i) => i.id === "water")!;
    const partial = changeQuantity(state, water, "completed", 2);
    expect(preparationProgress(partial).done).toBe(
      preparationProgress(state).done,
    );
    const full = changeQuantity(partial, water, "completed", 3);
    expect(preparationProgress(full).done).toBe(
      preparationProgress(state).done + 1,
    );
    expect(nextSteps(full).some((a) => a.id === "water")).toBe(false);
  });
});

describe("applicability and general preparedness", () => {
  it("loads legacy data and sanitizes applicability without losing completion", () => {
    expect(parseSavedKit('{}').notApplicable).toEqual([]);
    const state = parseSavedKit(JSON.stringify({ completed: { 'home-contacts': 1 }, notApplicable: ['home-contacts', 'home-contacts', 'water', 1, 'unknown'] }));
    expect(state.notApplicable).toEqual(['home-contacts']);
    expect(state.completed['home-contacts']).toBe(1);
    expect(parseSavedKit(JSON.stringify({ notApplicable: {} })).notApplicable).toEqual([]);
    expect(parseSavedKit(JSON.stringify(state))).toEqual(state);
  });
  it("excludes skipped tasks from numerator, denominator and next steps, and restores progress", () => {
    const initial = { ...defaultKit, completed: { 'home-alerts': 1 } };
    const skipped = setPreparationApplicable(initial, 'home-alerts', false);
    expect(preparationProgress(skipped)).toEqual({ done: 0, total: preparationProgress(initial).total - 1 });
    expect(setPreparationApplicable(skipped, 'home-alerts', true)).toEqual(initial);
    const skipAll = { ...defaultKit, notApplicable: activeHomeActions(defaultKit).map(a => a.id) };
    expect(nextSteps(skipAll)[0].group).toBe('Your supplies');
    expect(preparationProgress(skipAll).total).toBe(getActiveItems(defaultKit).length);
  });
  it("keeps general tasks visible without weather concerns and filters skipped separately", () => {
    for (const action of homeActions.filter(a => a.general)) expect(activeHomeActions(defaultKit)).toContain(action);
    const action = homeActions.find(a => a.id === 'car-pressure')!;
    const state = { ...defaultKit, completed: { [action.id]: 1 }, notApplicable: [action.id] };
    expect(matchesPreparation(action, state, 'COLD', 'All')).toBe(true);
    expect(matchesPreparation(action, state, 'transportation', 'Not applicable')).toBe(true);
    expect(matchesPreparation(action, state, '', 'Done')).toBe(false);
    expect(matchesPreparation(action, state, '', 'To do')).toBe(false);
    expect(matchesPreparation(action, state, 'unrelated', 'All')).toBe(false);
  });
  it("retains all legacy task ids and gives every task a group, supplies and source", () => {
    expect(new Set(homeActions.map(a => a.id)).size).toBe(homeActions.length);
    for (const action of homeActions) {
      expect(preparationGroups).toContain(action.group);
      expect(action.supplies.length).toBeGreaterThan(0);
      expect(action.source).toMatch(/^https:\/\//);
    }
    for (const id of ['alerts','alarms','lights','gutters','secure-outdoors','entry-drains','inventory','contacts','documents','routes','cooling','water']) expect(homeActions.some(a => a.id === `home-${id}`)).toBe(true);
  });
});
