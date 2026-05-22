import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasAiGatewayCredentials } from "@/lib/agentic/ai-explanations";
import { runAgent } from "@/lib/agentic/framework";
import { buildWalletContext, type WalletCopilotContext } from "@/lib/agentic/wallet-context";
import { logSecurityEvent } from "@/lib/api/logging";

export const SURVEY_AUTHOR_PROMPT_VERSION = "survey-author-v1";
export const RESPONSE_CLASSIFIER_VERSION = "response-classifier-v1";

export const surveyPromptRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  version: z.number(),
  question_template: z.string(),
  topic: z.string(),
  target_segment: z.record(z.string(), z.unknown()).default({}),
});
export type SurveyPromptRow = z.infer<typeof surveyPromptRowSchema>;

export const surveyAuthorSchema = z.object({
  question: z.string().trim().min(8).max(280),
  rationale: z.string().trim().min(1).max(280),
});

export const responseClassificationSchema = z.object({
  theme: z.enum([
    "ux_confusion",
    "missing_feature",
    "data_accuracy",
    "performance",
    "pricing",
    "praise",
    "bug",
    "other",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  severity: z.number().int().min(1).max(5),
  action_item: z.string().trim().min(1).max(280),
  summary: z.string().trim().min(1).max(280),
});

export type SurveyAuthorOutput = z.infer<typeof surveyAuthorSchema>;
export type ResponseClassification = z.infer<typeof responseClassificationSchema>;

async function fetchEligiblePrompts(
  supabase: SupabaseClient,
  userId: string,
): Promise<SurveyPromptRow[]> {
  const [{ data: prompts, error: promptErr }, { data: answered, error: answerErr }] = await Promise.all([
    supabase
      .from("survey_prompts")
      .select("id, slug, version, question_template, topic, target_segment")
      .eq("is_active", true),
    supabase
      .from("survey_responses")
      .select("prompt_slug")
      .eq("user_id", userId),
  ]);
  if (promptErr) throw new Error(promptErr.message);
  if (answerErr) throw new Error(answerErr.message);

  const answeredSlugs = new Set((answered ?? []).map((row) => row.prompt_slug));
  return (prompts ?? [])
    .filter((row) => !answeredSlugs.has(row.slug))
    .map((row) => surveyPromptRowSchema.parse(row));
}

function deterministicPick(prompts: SurveyPromptRow[], context: WalletCopilotContext): SurveyPromptRow | null {
  if (prompts.length === 0) return null;
  const summary = context.summary;
  const priorityOrder = (slug: string) => {
    if (summary.activeCards === 0) return slug === "first-run" ? 0 : 5;
    if (summary.upcomingAlerts > 0) return slug === "alerts-relevance" ? 0 : 3;
    if (summary.annualFeeCards > 0) return slug === "keep-or-cancel" ? 0 : 2;
    return slug === "best-card-finder" ? 0 : 1;
  };
  return [...prompts].sort((a, b) => priorityOrder(a.slug) - priorityOrder(b.slug))[0];
}

export type NextSurveyQuestion = {
  prompt: SurveyPromptRow;
  question: string;
  rationale: string;
};

export async function pickNextSurveyQuestion(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextSurveyQuestion | null> {
  const prompts = await fetchEligiblePrompts(supabase, userId);
  if (prompts.length === 0) return null;

  return await runAgent({
    supabase,
    userId,
    flowType: "survey_author",
    promptVersion: SURVEY_AUTHOR_PROMPT_VERSION,
    modelProvider: hasAiGatewayCredentials() ? "openai/gpt-5.4-mini" : "deterministic-v1",
    buildContext: async () => {
      const context = await buildWalletContext(supabase, userId);
      return { context, prompts };
    },
    contextSummary: ({ context }) => ({
      activeCards: context.summary.activeCards,
      annualFeeCards: context.summary.annualFeeCards,
      eligiblePromptCount: prompts.length,
    }),
    generate: async ({ context, prompts: eligible }) => {
      const fallback = deterministicPick(eligible, context);
      if (!fallback) return null;

      if (!hasAiGatewayCredentials()) {
        return {
          prompt: fallback,
          question: fallback.question_template,
          rationale: "Deterministic pick — AI tailoring disabled.",
        } satisfies NextSurveyQuestion;
      }

      try {
        const { generateText, Output } = await import("ai");
        const { output } = await generateText({
          model: "openai/gpt-5.4-mini",
          output: Output.object({
            name: "SurveyAuthor",
            description: "Pick the most relevant question for this user and tailor it minimally.",
            schema: surveyAuthorSchema.extend({ slug: z.string() }),
          }),
          system:
            "You author one short follow-up question for a credit-card rewards user. Choose the prompt slug whose topic best matches their current wallet state. You may lightly tailor wording but must not invent specifics (no card names, amounts, or dates). Return the slug as written.",
          prompt: JSON.stringify({
            walletSummary: context.summary,
            prompts: eligible.map((p) => ({ slug: p.slug, topic: p.topic, template: p.question_template })),
          }),
        });
        const chosen = eligible.find((p) => p.slug === output.slug) ?? fallback;
        return {
          prompt: chosen,
          question: output.question,
          rationale: output.rationale,
        } satisfies NextSurveyQuestion;
      } catch (err) {
        logSecurityEvent("[survey-author] LLM failed; using deterministic pick", err);
        return {
          prompt: fallback,
          question: fallback.question_template,
          rationale: "AI tailoring failed — using template.",
        } satisfies NextSurveyQuestion;
      }
    },
  }).then((res) => res.output);
}

function deterministicClassify(rawAnswer: string): ResponseClassification {
  const text = rawAnswer.toLowerCase();
  const hasNegative = /\b(bad|broken|wrong|hate|confus|slow|crash|bug|error|missing)\b/.test(text);
  const hasPositive = /\b(love|great|awesome|perfect|helpful|amazing)\b/.test(text);
  const theme = hasNegative
    ? text.includes("missing") || text.includes("wish")
      ? ("missing_feature" as const)
      : text.includes("bug") || text.includes("crash") || text.includes("error")
        ? ("bug" as const)
        : text.includes("confus") || text.includes("understand")
          ? ("ux_confusion" as const)
          : ("other" as const)
    : hasPositive
      ? ("praise" as const)
      : ("other" as const);
  return {
    theme,
    sentiment: hasNegative ? "negative" : hasPositive ? "positive" : "neutral",
    severity: hasNegative ? 3 : 1,
    action_item: hasNegative ? "Review user feedback for follow-up" : "Log for trend analysis",
    summary: rawAnswer.slice(0, 200),
  };
}

export async function classifyResponse(
  supabase: SupabaseClient,
  userId: string,
  args: { promptSlug: string; topic: string; rawAnswer: string },
): Promise<ResponseClassification> {
  return await runAgent({
    supabase,
    userId,
    flowType: "response_classifier",
    promptVersion: RESPONSE_CLASSIFIER_VERSION,
    modelProvider: hasAiGatewayCredentials() ? "openai/gpt-5.4-mini" : "deterministic-v1",
    buildContext: async () => args,
    contextSummary: (ctx) => ({ promptSlug: ctx.promptSlug, topic: ctx.topic, length: ctx.rawAnswer.length }),
    generate: async (ctx) => {
      if (!hasAiGatewayCredentials()) return deterministicClassify(ctx.rawAnswer);
      try {
        const { generateText, Output } = await import("ai");
        const { output } = await generateText({
          model: "openai/gpt-5.4-mini",
          output: Output.object({
            name: "SurveyResponseClassifier",
            description:
              "Classify a free-text user response into theme, sentiment, severity (1-5), an action item, and a one-line summary.",
            schema: responseClassificationSchema,
          }),
          system:
            "You triage user feedback for Credit Card Chris. Severity 5 means a clear blocker or churn risk. Keep action_item concrete and under 280 chars. Do not invent details not in the answer.",
          prompt: JSON.stringify({ topic: ctx.topic, promptSlug: ctx.promptSlug, answer: ctx.rawAnswer }),
        });
        return responseClassificationSchema.parse(output);
      } catch (err) {
        logSecurityEvent("[response-classifier] LLM failed; using deterministic fallback", err);
        return deterministicClassify(ctx.rawAnswer);
      }
    },
  }).then((res) => res.output);
}
