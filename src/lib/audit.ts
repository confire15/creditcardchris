import { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "account.deleted"
  | "plaid.connected"
  | "plaid.disconnected"
  | "card.deleted"
  | "profile.updated"
  | "settings.updated";

type AuditParams = {
  supabase: SupabaseClient;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

// Fire-and-forget: does not block the response
export function logAudit({
  supabase,
  userId,
  action,
  resourceType,
  resourceId,
  metadata,
  req,
}: AuditParams): void {
  const ipAddress =
    (req?.headers as Headers | undefined)?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent =
    (req?.headers as Headers | undefined)?.get("user-agent") ?? null;

  supabase
    .from("audit_logs")
    .insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .then(({ error }) => {
      if (error) console.error("[audit] Failed to log:", error.message);
    });
}
