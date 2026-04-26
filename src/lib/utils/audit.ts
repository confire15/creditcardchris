import { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "card.added"
  | "card.archived"
  | "card.unarchived"
  | "card.deleted"
  | "credit.logged"
  | "credit.reset"
  | "perk.activated"
  | "perk.reset"
  | "fee.renewed"
  | "reward_override.changed"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "sub.met"
  | "challenge.created"
  | "challenge.met"
  | "household.member_added";

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: AuditAction,
  meta: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({ user_id: userId, action, meta });
}
