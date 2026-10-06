import { describe, expect, it } from "vitest";
import { defaultKit, parseSavedKit, changeQuantity } from "../kit";
import {
  activeHomeActions,
  nextSteps,
  preparationProgress,
} from "../preparation";
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
      "home-documents",
      "home-routes",
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
