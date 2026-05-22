import { z } from "zod";

export const actionStatuses = ["active", "started", "completed", "dismissed", "snoozed", "stale"] as const;

export const actionTypes = [
  "credit_capture",
  "renewal_rescue",
  "offer_matcher",
  "sub_pace",
  "points_expiration",
  "purchase_rule",
  "data_cleanup",
  "alert",
  "credit_action",
  "best_card_rule",
] as const;

export const sourceRefSchema = z.object({
  type: z.string().min(1).max(60),
  id: z.string().min(1).max(120),
  label: z.string().max(160).optional(),
});

export const proposedActionSchema = z.object({
  type: z.enum(["navigate", "review", "deep_link", "open_url", "mark_complete", "copy_text", "checklist"]),
  href: z.string().min(1).max(500),
  label: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const userActionInputSchema = z.object({
  sourceType: z.string().min(1).max(80),
  actionType: z.enum(actionTypes).or(z.string().min(1).max(80)),
  title: z.string().trim().min(1).max(140),
  rationale: z.string().trim().min(1).max(600),
  priority: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1).default(0.75),
  sourceRefs: z.array(sourceRefSchema).min(1).max(10),
  proposedAction: proposedActionSchema,
  valueEstimateCents: z.number().int().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  recurrenceKey: z.string().trim().min(1).max(220),
});

export const userActionRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  source_type: z.string(),
  action_type: z.string(),
  title: z.string(),
  rationale: z.string(),
  priority: z.coerce.number(),
  confidence: z.coerce.number(),
  source_refs: z.array(sourceRefSchema),
  proposed_action: proposedActionSchema,
  value_estimate_cents: z.number().nullable(),
  due_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  snoozed_until: z.string().nullable(),
  status: z.enum(actionStatuses),
  recurrence_key: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type ProposedAction = z.infer<typeof proposedActionSchema>;
export type UserActionInput = z.infer<typeof userActionInputSchema>;
export type UserActionRow = z.infer<typeof userActionRowSchema>;
