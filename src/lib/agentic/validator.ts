import { z } from "zod";
import type { AgentRecommendationInput } from "@/lib/agentic/schemas";
import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";
import { hasAiGatewayCredentials } from "@/lib/agentic/ai-explanations";
import { logSecurityEvent } from "@/lib/api/logging";

export const VALIDATOR_PROMPT_VERSION = "validator-v1";

export const judgeScoreSchema = z.object({
  grounded: z.number().int().min(1).max(5),
  useful: z.number().int().min(1).max(5),
  safe: z.number().int().min(1).max(5),
  hallucination: z.number().int().min(0).max(5),
  reasoning: z.string().trim().min(1).max(280),
});

export const judgeResultSchema = z.object({
  recommendations: z.array(
    judgeScoreSchema.extend({
      index: z.number().int().min(0),
    }),
  ),
});

export type JudgeScore = z.infer<typeof judgeScoreSchema>;
export type JudgeResult = z.infer<typeof judgeResultSchema>;

export type JudgedRecommendation = {
  index: number;
  recommendation: AgentRecommendationInput;
  score: JudgeScore;
};

export const PASSING_THRESHOLDS = {
  minGrounded: 4,
  minUseful: 3,
  minSafe: 4,
  maxHallucination: 0,
} as const;

function deterministicJudge(
  recommendations: AgentRecommendationInput[],
  context: WalletCopilotContext,
): JudgeResult {
  const knownCardIds = new Set(context.cards.map((c) => c.id));
  const knownCreditIds = new Set(context.credits.map((c) => c.id));
  const knownOfferIds = new Set(context.offers.map((o) => o.id));
  const knownSubIds = new Set(context.subs.map((s) => s.id));
  const knownLoyaltyIds = new Set(context.loyaltyAccounts.map((l) => l.id));
  const knownCategoryIds = new Set(context.categories.map((c) => c.id));

  const validIdFor = (type: string, id: string) => {
    switch (type) {
      case "user_card":
        return knownCardIds.has(id);
      case "statement_credit":
        return knownCreditIds.has(id);
      case "user_card_offer":
        return knownOfferIds.has(id);
      case "card_sub":
        return knownSubIds.has(id);
      case "loyalty_account":
        return knownLoyaltyIds.has(id);
      case "spending_category":
        return knownCategoryIds.has(id);
      case "wallet":
        return id === context.userId;
      default:
        return true;
    }
  };

  return {
    recommendations: recommendations.map((rec, index) => {
      const refsValid = rec.sourceRefs.every((ref) => validIdFor(ref.type, ref.id));
      const grounded = refsValid ? 5 : 2;
      const hallucination = refsValid ? 0 : 3;
      const useful = rec.priority >= 80 ? 5 : rec.priority >= 60 ? 4 : 3;
      const safe = rec.proposedAction.type === "navigate" || rec.proposedAction.type === "review" ? 5 : 2;
      return {
        index,
        grounded,
        useful,
        safe,
        hallucination,
        reasoning: refsValid
          ? `Source refs resolve in context (${rec.sourceRefs.length}). Action type ${rec.proposedAction.type}.`
          : `Source refs reference IDs missing from context — possible hallucination.`,
      };
    }),
  };
}

function compactForJudge(
  recommendations: AgentRecommendationInput[],
  context: WalletCopilotContext,
) {
  return {
    walletSummary: context.summary,
    knownIds: {
      cards: context.cards.map((c) => c.id),
      credits: context.credits.map((c) => c.id),
      offers: context.offers.map((o) => o.id),
      subs: context.subs.map((s) => s.id),
      loyaltyAccounts: context.loyaltyAccounts.map((l) => l.id),
    },
    recommendations: recommendations.map((rec, index) => ({
      index,
      type: rec.type,
      title: rec.title,
      rationale: rec.rationale,
      sourceRefs: rec.sourceRefs,
      proposedAction: {
        type: rec.proposedAction.type,
        href: rec.proposedAction.href,
      },
    })),
  };
}

export async function judgeRecommendations({
  context,
  recommendations,
  forceDeterministic = false,
}: {
  context: WalletCopilotContext;
  recommendations: AgentRecommendationInput[];
  forceDeterministic?: boolean;
}): Promise<JudgedRecommendation[]> {
  if (recommendations.length === 0) return [];

  let result: JudgeResult;

  if (forceDeterministic || !hasAiGatewayCredentials()) {
    result = deterministicJudge(recommendations, context);
  } else {
    try {
      const { generateText, Output } = await import("ai");
      const { output } = await generateText({
        model: "openai/gpt-5.4-mini",
        output: Output.object({
          name: "AgentRecommendationJudge",
          description:
            "Score each recommendation 1-5 on grounded (refs map to known IDs), useful (clear next action), safe (action type is navigate/review), and hallucination 0-5 (0 means none).",
          schema: judgeResultSchema,
        }),
        system:
          "You are a strict QA judge for Credit Card Chris agent recommendations. Use only the provided context. If a source ref ID is not in knownIds, mark hallucination >= 3 and grounded <= 2. Score every recommendation by index. Keep reasoning under 280 chars.",
        prompt: JSON.stringify(compactForJudge(recommendations, context)),
      });
      result = judgeResultSchema.parse(output);
    } catch (err) {
      logSecurityEvent("[validator] LLM judge failed; using deterministic judge", err);
      result = deterministicJudge(recommendations, context);
    }
  }

  const byIndex = new Map(result.recommendations.map((r) => [r.index, r]));
  return recommendations.map((rec, index) => {
    const score = byIndex.get(index);
    if (!score) {
      return {
        index,
        recommendation: rec,
        score: {
          grounded: 1,
          useful: 1,
          safe: 1,
          hallucination: 5,
          reasoning: "Judge returned no score for this index.",
        },
      };
    }
    const { index: _unusedIndex, ...rest } = score;
    return { index, recommendation: rec, score: rest };
  });
}

export function passesThresholds(judged: JudgedRecommendation[]): {
  ok: boolean;
  failures: Array<{ index: number; reason: string }>;
} {
  const failures: Array<{ index: number; reason: string }> = [];
  for (const item of judged) {
    if (item.score.grounded < PASSING_THRESHOLDS.minGrounded) {
      failures.push({ index: item.index, reason: `grounded ${item.score.grounded} < ${PASSING_THRESHOLDS.minGrounded}` });
    }
    if (item.score.useful < PASSING_THRESHOLDS.minUseful) {
      failures.push({ index: item.index, reason: `useful ${item.score.useful} < ${PASSING_THRESHOLDS.minUseful}` });
    }
    if (item.score.safe < PASSING_THRESHOLDS.minSafe) {
      failures.push({ index: item.index, reason: `safe ${item.score.safe} < ${PASSING_THRESHOLDS.minSafe}` });
    }
    if (item.score.hallucination > PASSING_THRESHOLDS.maxHallucination) {
      failures.push({ index: item.index, reason: `hallucination ${item.score.hallucination} > ${PASSING_THRESHOLDS.maxHallucination}` });
    }
  }
  return { ok: failures.length === 0, failures };
}
