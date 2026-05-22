import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasAiGatewayCredentials } from "@/lib/agentic/ai-explanations";
import { runAgent } from "@/lib/agentic/framework";
import { logSecurityEvent } from "@/lib/api/logging";
import { formatCurrency } from "@/lib/utils/format";

export const FEE_CALCULATOR_EXPLAINER_VERSION = "fee-calculator-explainer-v1";

export const feeCalculatorExplainInputSchema = z.object({
  cardName: z.string().trim().min(1).max(120),
  annualFee: z.number().min(0).max(10_000),
  creditTotal: z.number().min(0).max(50_000),
  rewardsValue: z.number().min(0).max(100_000),
  eaf: z.number().min(-100_000).max(50_000),
  topCredits: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        applied: z.number().min(0).max(50_000),
      }),
    )
    .max(6)
    .default([]),
});

export const feeCalculatorExplainOutputSchema = z.object({
  verdict: z.enum(["keep", "watch", "drop"]),
  headline: z.string().trim().min(4).max(80),
  paragraph: z.string().trim().min(20).max(420),
});

export type FeeCalculatorExplainInput = z.infer<typeof feeCalculatorExplainInputSchema>;
export type FeeCalculatorExplainOutput = z.infer<typeof feeCalculatorExplainOutputSchema>;

function deterministicExplain(input: FeeCalculatorExplainInput): FeeCalculatorExplainOutput {
  const { cardName, annualFee, creditTotal, rewardsValue, eaf } = input;
  const isProfit = eaf < 0;
  const netGain = Math.abs(eaf);
  const offset = creditTotal + rewardsValue;
  const offsetPct = annualFee > 0 ? Math.min(offset / annualFee, 2) : 0;

  let verdict: FeeCalculatorExplainOutput["verdict"];
  let headline: string;
  if (isProfit) {
    verdict = "keep";
    headline = `${cardName} pays you ${formatCurrency(netGain)} per year`;
  } else if (offsetPct >= 0.75) {
    verdict = "watch";
    headline = `${cardName} costs you ${formatCurrency(netGain)} after offsets`;
  } else {
    verdict = "drop";
    headline = `${cardName} is a real ${formatCurrency(netGain)} cost`;
  }

  const offsetLine =
    creditTotal > 0 || rewardsValue > 0
      ? `Credits cover ${formatCurrency(creditTotal)} and rewards add ${formatCurrency(rewardsValue)}, leaving a ${isProfit ? "gain" : "real cost"} of ${formatCurrency(netGain)}.`
      : `Nothing offsets the ${formatCurrency(annualFee)} fee yet, so the real cost is the full sticker price.`;

  const tail =
    verdict === "keep"
      ? "Worth keeping at this usage."
      : verdict === "watch"
        ? "Close to break-even — small changes in spend or credit use flip the math."
        : "Hard to justify unless you can use more credits or shift more spend to it.";

  return {
    verdict,
    headline,
    paragraph: `${offsetLine} ${tail}`,
  };
}

export async function explainFeeCalculator(
  supabase: SupabaseClient,
  userId: string,
  input: FeeCalculatorExplainInput,
): Promise<{ runId: string; output: FeeCalculatorExplainOutput }> {
  return await runAgent({
    supabase,
    userId,
    flowType: "fee_calculator_explainer",
    promptVersion: FEE_CALCULATOR_EXPLAINER_VERSION,
    modelProvider: hasAiGatewayCredentials() ? "openai/gpt-5.4-mini" : "deterministic-v1",
    buildContext: async () => input,
    contextSummary: (ctx) => ({
      cardName: ctx.cardName,
      annualFee: ctx.annualFee,
      eaf: ctx.eaf,
      isProfit: ctx.eaf < 0,
    }),
    generate: async (ctx) => {
      const fallback = deterministicExplain(ctx);
      if (!hasAiGatewayCredentials()) return fallback;

      try {
        const { generateText, Output } = await import("ai");
        const { output } = await generateText({
          model: "openai/gpt-5.4-mini",
          output: Output.object({
            name: "FeeCalculatorExplainer",
            description: "Plain-English verdict on whether a premium card's effective annual fee is worth it.",
            schema: feeCalculatorExplainOutputSchema,
          }),
          system:
            "You explain a credit card's effective annual fee math to the cardholder. Stay grounded in the numbers provided — never invent credits, multipliers, or new amounts. Verdict: 'keep' if eaf is negative (profit), 'drop' if offsets cover under 50% of the fee, otherwise 'watch'. Headline under 80 chars; paragraph 2-3 sentences, plain English, no emoji.",
          prompt: JSON.stringify({
            cardName: ctx.cardName,
            annualFee: ctx.annualFee,
            creditTotal: ctx.creditTotal,
            rewardsValue: ctx.rewardsValue,
            effectiveAnnualFee: ctx.eaf,
            isProfit: ctx.eaf < 0,
            topCredits: ctx.topCredits,
          }),
        });
        return feeCalculatorExplainOutputSchema.parse(output);
      } catch (err) {
        logSecurityEvent("[fee-calculator-explainer] LLM failed; using deterministic fallback", err);
        return fallback;
      }
    },
  });
}
