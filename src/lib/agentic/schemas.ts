import { z } from "zod";
import { proposedActionSchema, sourceRefSchema } from "@/lib/actions/schemas";

export const WALLET_COPILOT_PROMPT_VERSION = "wallet-copilot-v1";

export const agentRecommendationTypes = [
  "credit_capture",
  "renewal_rescue",
  "offer_matcher",
  "sub_pace",
  "points_expiration",
  "purchase_rule",
  "data_cleanup",
] as const;

export const agentRecommendationInputSchema = z.object({
  type: z.enum(agentRecommendationTypes),
  priority: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1).default(0.75),
  title: z.string().trim().min(1).max(120),
  rationale: z.string().trim().min(1).max(500),
  sourceRefs: z.array(sourceRefSchema).min(1).max(8),
  proposedAction: proposedActionSchema,
});

export const agentRecommendationRowSchema = z.object({
  id: z.string(),
  run_id: z.string(),
  user_id: z.string(),
  type: z.enum(agentRecommendationTypes),
  priority: z.coerce.number(),
  confidence: z.coerce.number(),
  title: z.string(),
  rationale: z.string(),
  source_refs: z.array(sourceRefSchema),
  proposed_action: proposedActionSchema,
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const agentRunSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  flow_type: z.string(),
  prompt_version: z.string(),
  model_provider: z.string().nullable(),
  compact_input_summary: z.record(z.string(), z.unknown()).default({}),
  error: z.string().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  recommendation_count: z.number().default(0),
});

export const aiExplanationEnhancementSchema = z.object({
  recommendations: z.array(
    z.object({
      index: z.number().int().min(0),
      title: z.string().trim().min(1).max(120),
      rationale: z.string().trim().min(1).max(500),
    }),
  ),
});

export type AgentRecommendationType = (typeof agentRecommendationTypes)[number];
export type SourceRef = z.infer<typeof sourceRefSchema>;
export type ProposedAction = z.infer<typeof proposedActionSchema>;
export type AgentRecommendationInput = z.infer<typeof agentRecommendationInputSchema>;
export type AgentRecommendationRow = z.infer<typeof agentRecommendationRowSchema>;
export type AgentRunSummary = z.infer<typeof agentRunSummarySchema>;
