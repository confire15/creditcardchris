import { SupabaseClient } from "@supabase/supabase-js";
import { auditSafeMeta } from "@/lib/api/logging";

export type AuditAction =
  | "card.added"
  | "card.archived"
  | "card.unarchived"
  | "card.deleted"
  | "credit.logged"
  | "credit.reset"
  | "perk.activated"
  | "perk.reset"
  | "perk.closed_via_app"
  | "fee.renewed"
  | "reward_override.changed"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "sub.met"
  | "challenge.created"
  | "challenge.met"
  | "household.member_added"
  | "actions.refreshed"
  | "action.started"
  | "action.completed"
  | "action.dismissed"
  | "action.snoozed"
  | "agent.run.created"
  | "agent.run.failed"
  | "agent.recommendation.accepted"
  | "agent.recommendation.dismissed";

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: AuditAction,
  meta: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    resource_type: String(meta.resource_type ?? action.split(".")[0] ?? "event"),
    resource_id: meta.resource_id == null ? null : String(meta.resource_id),
    metadata: auditSafeMeta(meta),
  });
}
