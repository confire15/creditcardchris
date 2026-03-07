import { z } from "zod";

const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const transactionSchema = z.object({
  user_card_id: uuid.nullable().optional(),
  category_id: uuid,
  amount: z.number().positive("Amount must be positive").max(999999.99),
  merchant: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  transaction_date: dateString,
  transaction_type: z.enum(["expense", "income", "refund", "transfer"]),
  refund_status: z.enum(["pending", "received"]).nullable().optional(),
  rewards_earned: z.number().nullable().optional(),
});

export const customCardSchema = z.object({
  custom_name: z.string().min(1, "Card name is required").max(100),
  custom_issuer: z.string().max(100).optional(),
  custom_network: z.enum(["Visa", "Mastercard", "Amex", "Discover", "Other"]),
  custom_reward_type: z.enum(["points", "miles", "cashback"]),
  custom_reward_unit: z.string().max(50).optional(),
  custom_base_reward_rate: z.number().min(0).max(100),
  custom_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  last_four: z
    .string()
    .regex(/^\d{4}$/, "Must be 4 digits")
    .nullable()
    .optional(),
});

export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(200).trim(),
  target_points: z
    .number()
    .int()
    .positive("Target must be positive")
    .max(99999999),
  target_date: dateString.nullable().optional(),
});

export const budgetSchema = z.object({
  category_id: uuid,
  monthly_limit: z
    .number()
    .positive("Budget must be positive")
    .max(999999.99),
  rollover_enabled: z.boolean().default(false),
});

export const applicationSchema = z.object({
  card_name: z.string().min(1, "Card name is required").max(200).trim(),
  issuer: z.string().min(1, "Issuer is required").max(100).trim(),
  applied_date: dateString,
  status: z.enum(["pending", "approved", "denied", "cancelled"]),
  bonus_offer: z.string().max(500).nullable().optional(),
  annual_fee: z.number().min(0).max(99999).default(0),
  credit_score_used: z
    .number()
    .int()
    .min(300)
    .max(850)
    .nullable()
    .optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const trackedSubscriptionSchema = z.object({
  merchant: z.string().trim().min(1, "Merchant is required").max(200),
  amount: z.number().positive("Amount must be positive").max(99999.99),
  billing_cycle: z.enum(["monthly", "annual"]),
  card_id: uuid.nullable().optional(),
  last_charged_at: dateString.nullable().optional(),
  next_charge_at: dateString.nullable().optional(),
});

export const cardPerkSchema = z.object({
  name: z.string().min(1, "Perk name is required").max(200).trim(),
  description: z.string().max(500).trim().nullable().optional(),
  perk_type: z.enum(["credit", "lounge", "free_night", "status", "other"]),
  value_type: z.enum(["dollar", "count", "boolean"]),
  annual_value: z.number().positive().max(9999.99).nullable().optional(),
  annual_count: z.number().int().positive().max(99).nullable().optional(),
  used_value: z.number().min(0).max(9999.99).default(0),
  used_count: z.number().int().min(0).max(99).default(0),
  reset_cadence: z.enum(["monthly", "annual", "calendar_year"]),
  reset_month: z.number().int().min(1).max(12).default(1),
  notify_before_reset: z.boolean().default(true),
  notify_days_before: z.number().int().min(1).max(90).default(30),
  notes: z.string().max(500).trim().nullable().optional(),
});

export const statementCreditSchema = z.object({
  name: z.string().min(1, "Credit name is required").max(200).trim(),
  annual_amount: z
    .number()
    .positive("Amount must be positive")
    .max(99999.99),
  used_amount: z.number().min(0).max(99999.99).default(0),
});
