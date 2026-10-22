import { describe, expect, it } from "vitest";
import { emergencyItems } from "@/data/emergency-items";
import { everydayQuantity, waterBottles } from "../everyday";
import { defaultKit, parseSavedKit, changeQuantity, missingQuantity } from "../kit";

describe("everyday preparation", () => {
  it("rounds bottle equivalents up to meet the full water target", () => {
    expect(waterBottles(1)).toBe(8);
    expect(waterBottles(12)).toBe(91);
    for (const gallons of [1, 3, 12, 700]) {
      expect(waterBottles(gallons) * 0.5).toBeGreaterThanOrEqual(gallons * 3.785411784);
    }
  });
  it("explains the actual household calculation", () => {
    const state = { ...defaultKit, people: 4 };
    expect(everydayQuantity(emergencyItems.find(i => i.id === "water")!, state)).toContain("4 people × 3 days × 1 gallon = 12 gallons");
    expect(everydayQuantity(emergencyItems.find(i => i.id === "food")!, state)).toContain("12 full days of food for one person");
  });
  it("keeps setup preferences through backups and validates unknown values", () => {
    const saved = parseSavedKit(JSON.stringify({ ...defaultKit, guideLanguage: "es", livingSituation: "rent", setupComplete: true }));
    expect(saved.guideLanguage).toBe("es");
    expect(saved.livingSituation).toBe("rent");
    expect(saved.setupComplete).toBe(true);
    const unknown = parseSavedKit('{"guideLanguage":"xx","livingSituation":"invalid"}');
    expect(unknown.guideLanguage).toBe("en");
    expect(unknown.livingSituation).toBe("");
  });
  it("updates shopping amounts without marking supplies packed", () => {
    const water = emergencyItems.find(i => i.id === "water")!;
    const partial = changeQuantity(defaultKit, water, "owned", 2);
    expect(missingQuantity(water, partial)).toBe(1);
    expect(partial.completed.water ?? 0).toBe(0);
    const enough = changeQuantity(partial, water, "owned", 3);
    expect(missingQuantity(water, enough)).toBe(0);
    expect(enough.completed.water ?? 0).toBe(0);
  });
});
