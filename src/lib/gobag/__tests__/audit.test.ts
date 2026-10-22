import { describe, expect, it, vi, afterEach } from "vitest";
import { defaultKit, parseSavedKit, changeQuantity } from "../kit";
import { applicablePersonal, preparationProgress, nextSteps, suggestedExclusions } from "../preparation";
import { planChecklist } from "../checklist";
import { dueReviews } from "../reminders";
import { plannerURL, readPlannerLocation, settingsSections } from "../navigation";
import { createSaveQueue } from "../persistence";
import { exportBackup, initialLibrary, parseBackup } from "../library";
import { emergencyItems } from "@/data/emergency-items";

describe("Prepare audit migrations and applicability", () => {
  it("migrates legacy personal completion into applicability without losing data", () => {
    const state = parseSavedKit(JSON.stringify({ completed: { "personal-medications": 1, water: 3 }, reviewDates: { "personal-medications": "2026-10-01" }, plan: { emergencyContact: "Paper card" } }));
    expect(state.personalApplicable).toEqual(["personal-medications"]);
    expect(state.completed).toEqual({ "personal-medications": 1, water: 3 });
    expect(state.reviewDates["personal-medications"]).toBe("2026-10-01");
    expect(state.plan.emergencyContact).toBe("Paper card");
    expect(planChecklist(state).progress).toEqual(preparationProgress(state));
  });
  it("preserves explicit non-applicability and completion through backups", () => {
    const state = { ...defaultKit, personalApplicable: [], completed: { "personal-glasses": 1 }, carAccess: "no" as const, planElsewhere: ["emergencyContact" as const] };
    const restored = parseBackup(exportBackup({ ...initialLibrary, kits: [{ ...initialLibrary.kits[0], state }] })).kits[0].state;
    expect(restored.personalApplicable).toEqual([]);
    expect(restored.completed["personal-glasses"]).toBe(1);
    expect(restored.carAccess).toBe("no");
    expect(restored.planElsewhere).toEqual(["emergencyContact"]);
  });
  it("counts applicable unfinished essentials and support reminders", () => {
    const state = { ...defaultKit, personalApplicable: ["personal-medications"], needs: ["accessibility" as const] };
    expect(applicablePersonal(state)).toHaveLength(3);
    expect(preparationProgress(state).total).toBe(preparationProgress(defaultKit).total + 3);
    expect(nextSteps(state).some(s => s.id === "personal-medications")).toBe(true);
    expect(preparationProgress({ ...state, completed: { "personal-medications": 1 } }).done).toBe(1);
  });
  it("suggests reversible car and exterior exclusions without discarding progress", () => {
    const state = { ...defaultKit, carAccess: "no" as const, homeResponsibilities: "no" as const, completed: { "car-tires": 1 } };
    expect(suggestedExclusions(state)).toContain("car-tires");
    expect(suggestedExclusions(state)).toContain("home-entry-drains");
    expect(state.completed["car-tires"]).toBe(1);
    expect(suggestedExclusions(state)).not.toContain("car-backup");
    expect(suggestedExclusions({ ...defaultKit, pets: true })).toEqual([]);
  });
  it("balances suggestions and prioritizes reviews without changing inventory", () => {
    const water = emergencyItems.find(i => i.id === "water")!;
    const state = { ...changeQuantity(defaultKit, water, "owned", 2), reviewDates: { water: "2020-01-01" } };
    expect(nextSteps(state).map(s => s.group)).toEqual(["review", "safety", "supplies", "household"]);
    expect(dueReviews(state)).toContainEqual(water);
    expect(state.owned.water).toBe(2);
    expect(state.completed.water).toBe(0);
    expect(dueReviews(state, "2019-12-31")).toEqual([]);
  });
});
describe("URL navigation", () => {
  it.each(["https://prepare.creditcardchris.com/", "http://localhost:3100/go-bag"])("round trips all views and subsections at %s", base => {
    for (const tool of settingsSections) {
      const next = new URL(plannerURL(base, "Settings", tool), base);
      expect(readPlannerLocation(next)).toMatchObject({ page: "Settings", tool });
    }
    expect(readPlannerLocation(new URL(plannerURL(base, "Shopping list"), base)).page).toBe("Shopping list");
    expect(readPlannerLocation(new URL(plannerURL(base, "Household plan"), base)).editor).toBe(true);
  });
  it("preserves useful legacy links", () => {
    expect(readPlannerLocation(new URL("http://localhost/go-bag?view=settings#plan-title"))).toMatchObject({ page: "Home", editor: true });
    expect(readPlannerLocation(new URL("http://localhost/go-bag#maintenance"))).toMatchObject({ page: "Settings", tool: "Review & reminders" });
  });
});
describe("coalesced persistence", () => {
  afterEach(() => vi.useRealTimers());
  it("writes only the latest complete library after rapid edits and switches", () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const queue = createSaveQueue();
    queue.schedule(() => write("first edit"));
    queue.schedule(() => write("second edit"));
    queue.schedule(() => write("both kits including edit before switch"));
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(write).toHaveBeenCalledExactlyOnceWith("both kits including edit before switch");
  });
  it("flushes once before leaving, hiding, or unmounting the page", () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const queue = createSaveQueue();
    queue.schedule(write);
    queue.flush();
    queue.flush();
    vi.runAllTimers();
    expect(write).toHaveBeenCalledOnce();
  });
});
