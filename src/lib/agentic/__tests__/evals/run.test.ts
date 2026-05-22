import { describe, expect, it } from "vitest";
import { agentRecommendationInputSchema } from "@/lib/agentic/schemas";
import { generateWalletRecommendations } from "@/lib/agentic/wallet-copilot";
import { judgeRecommendations, passesThresholds } from "@/lib/agentic/validator";
import { evalFixtures } from "./fixtures";

describe("agent eval harness — wallet copilot", () => {
  for (const fixture of evalFixtures) {
    describe(fixture.name, () => {
      const recommendations = generateWalletRecommendations(
        fixture.context,
        new Date(fixture.context.generatedAt),
      );

      it("produces schema-valid recommendations", () => {
        for (const rec of recommendations) {
          expect(() => agentRecommendationInputSchema.parse(rec)).not.toThrow();
        }
      });

      it(`produces at least ${fixture.expect.minRecommendations} recommendation(s)`, () => {
        expect(recommendations.length).toBeGreaterThanOrEqual(fixture.expect.minRecommendations);
      });

      if (fixture.expect.requiredTypes?.length) {
        it("includes required recommendation types", () => {
          for (const type of fixture.expect.requiredTypes ?? []) {
            expect(recommendations.some((r) => r.type === type)).toBe(true);
          }
        });
      }

      if (fixture.expect.forbiddenTypes?.length) {
        it("omits forbidden recommendation types", () => {
          for (const type of fixture.expect.forbiddenTypes ?? []) {
            expect(recommendations.some((r) => r.type === type)).toBe(false);
          }
        });
      }

      it("passes deterministic judge thresholds (grounding + safety)", async () => {
        const judged = await judgeRecommendations({
          context: fixture.context,
          recommendations,
          forceDeterministic: true,
        });
        const { ok, failures } = passesThresholds(judged);
        if (!ok) {
          console.error(`Judge failures for ${fixture.name}:`, failures);
        }
        expect(ok).toBe(true);
      });
    });
  }
});
