import type { AgentRecommendationInput } from "@/lib/agentic/schemas";
import { aiExplanationEnhancementSchema } from "@/lib/agentic/schemas";
import type { WalletCopilotContext } from "@/lib/agentic/wallet-context";
import { logSecurityEvent } from "@/lib/api/logging";

export function hasAiGatewayCredentials() {
  return Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
}

function compactRecommendations(recommendations: AgentRecommendationInput[]) {
  return recommendations.map((recommendation, index) => ({
    index,
    type: recommendation.type,
    priority: recommendation.priority,
    title: recommendation.title,
    rationale: recommendation.rationale,
    sourceRefs: recommendation.sourceRefs.map((ref) => ({ type: ref.type, label: ref.label })),
    actionLabel: recommendation.proposedAction.label,
  }));
}

export async function enhanceRecommendationExplanations({
  context,
  recommendations,
}: {
  context: WalletCopilotContext;
  recommendations: AgentRecommendationInput[];
}): Promise<AgentRecommendationInput[]> {
  if (recommendations.length === 0 || !hasAiGatewayCredentials()) return recommendations;

  try {
    const { generateText, Output } = await import("ai");
    const { output } = await generateText({
      model: "openai/gpt-5.4",
      output: Output.object({
        name: "WalletCopilotExplanations",
        description: "Polished but source-faithful recommendation titles and rationales.",
        schema: aiExplanationEnhancementSchema,
      }),
      system:
        "You improve copy for Credit Card Chris Wallet Copilot. Do not add facts, amounts, actions, cards, benefits, or deadlines. Preserve the deterministic recommendation meaning. Return every recommendation by index.",
      prompt: JSON.stringify({
        walletSummary: context.summary,
        recommendations: compactRecommendations(recommendations),
      }),
    });

    const parsed = aiExplanationEnhancementSchema.parse(output);
    const byIndex = new Map(parsed.recommendations.map((item) => [item.index, item]));

    return recommendations.map((recommendation, index) => {
      const enhancement = byIndex.get(index);
      if (!enhancement) return recommendation;
      return {
        ...recommendation,
        title: enhancement.title,
        rationale: enhancement.rationale,
      };
    });
  } catch (err) {
    logSecurityEvent("[wallet-copilot] AI explanation enhancement failed; using deterministic copy", err);
    return recommendations;
  }
}
