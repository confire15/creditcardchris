import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWalletContext } from "@/lib/agentic/wallet-context";
import { generateWalletActions } from "@/lib/actions/wallet-actions";
import { userActionRowSchema, type UserActionInput, type UserActionRow } from "@/lib/actions/schemas";
import { logAudit } from "@/lib/utils/audit";

function toRow(userId: string, action: UserActionInput) {
  return {
    user_id: userId,
    source_type: action.sourceType,
    action_type: action.actionType,
    title: action.title,
    rationale: action.rationale,
    priority: action.priority,
    confidence: action.confidence,
    source_refs: action.sourceRefs,
    proposed_action: action.proposedAction,
    value_estimate_cents: action.valueEstimateCents ?? null,
    due_at: action.dueAt ?? null,
    expires_at: action.expiresAt ?? null,
    recurrence_key: action.recurrenceKey,
    status: "active",
    updated_at: new Date().toISOString(),
  };
}

function isVisibleAction(action: UserActionRow, now = new Date()) {
  if (action.status !== "snoozed") return true;
  if (!action.snoozed_until) return true;
  return new Date(action.snoozed_until).getTime() <= now.getTime();
}

export async function refreshUserActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserActionRow[]> {
  const now = new Date();
  const context = await buildWalletContext(supabase, userId, now);
  const generated = generateWalletActions(context, now);
  const keys = generated.map((action) => action.recurrenceKey);

  if (keys.length === 0) {
    await supabase
      .from("user_actions")
      .update({ status: "stale", updated_at: now.toISOString() })
      .eq("user_id", userId)
      .in("status", ["active", "started"]);
    return [];
  }

  const { data: existingData, error: existingError } = await supabase
    .from("user_actions")
    .select("*")
    .eq("user_id", userId)
    .in("recurrence_key", keys);

  if (existingError) throw new Error(existingError.message);

  const existing = new Map((existingData ?? []).map((row) => [row.recurrence_key as string, row]));
  const rowsToInsert = [];
  const rowsToUpdate = [];

  for (const action of generated) {
    const current = existing.get(action.recurrenceKey);
    if (current?.status === "completed" || current?.status === "dismissed" || current?.status === "snoozed") {
      continue;
    }
    const row = toRow(userId, action);
    if (current?.id) {
      rowsToUpdate.push({ id: current.id, row });
    } else {
      rowsToInsert.push(row);
    }
  }

  await Promise.all([
    rowsToInsert.length > 0 ? supabase.from("user_actions").insert(rowsToInsert) : Promise.resolve({ error: null }),
    ...rowsToUpdate.map(({ id, row }) =>
      supabase
        .from("user_actions")
        .update(row)
        .eq("id", id)
        .eq("user_id", userId),
    ),
  ]);

  const { data: activeRows } = await supabase
    .from("user_actions")
    .select("id, recurrence_key")
    .eq("user_id", userId)
    .in("status", ["active", "started"]);
  const staleIds = (activeRows ?? [])
    .filter((row) => !keys.includes(row.recurrence_key))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    await supabase
      .from("user_actions")
      .update({ status: "stale", updated_at: now.toISOString() })
      .eq("user_id", userId)
      .in("id", staleIds);
  }

  void logAudit(supabase, userId, "actions.refreshed", {
    generated_count: generated.length,
    inserted_count: rowsToInsert.length,
    updated_count: rowsToUpdate.length,
  }).catch(() => {});

  return listUserActions(supabase, userId, 40);
}

export async function listUserActions(
  supabase: SupabaseClient,
  userId: string,
  limit = 40,
): Promise<UserActionRow[]> {
  const { data, error } = await supabase
    .from("user_actions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "started", "snoozed"])
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => userActionRowSchema.parse(row))
    .filter((action) => isVisibleAction(action));
}

export async function transitionUserAction({
  supabase,
  userId,
  actionId,
  status,
  snoozedUntil,
}: {
  supabase: SupabaseClient;
  userId: string;
  actionId: string;
  status: "started" | "completed" | "dismissed" | "snoozed";
  snoozedUntil?: string | null;
}): Promise<UserActionRow> {
  const now = new Date().toISOString();
  const { data: actionData, error: fetchError } = await supabase
    .from("user_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!actionData) throw new Error("Action not found");

  const action = userActionRowSchema.parse(actionData);

  if (status === "completed" && action.proposed_action.payload?.completionKind === "perk_claim") {
    const perkId = action.proposed_action.payload.perkId;
    const actionIdPayload = action.proposed_action.payload.actionId;
    const amountCents = action.proposed_action.payload.amountCents;
    if (typeof perkId === "string" && typeof amountCents === "number") {
      const amount = amountCents / 100;
      const { data: perk } = await supabase
        .from("card_perks")
        .select("id, annual_value, used_value, value_type, is_redeemed")
        .eq("id", perkId)
        .eq("user_id", userId)
        .maybeSingle();

      if (perk) {
        const newUsed = Math.min((perk.used_value ?? 0) + amount, perk.annual_value ?? amount);
        await supabase
          .from("card_perks")
          .update({
            used_value: newUsed,
            is_redeemed: perk.value_type === "dollar" ? newUsed >= (perk.annual_value ?? 0) : true,
            closed_via_app_at: now,
            closed_via_action_id: typeof actionIdPayload === "string" ? actionIdPayload : null,
          })
          .eq("id", perkId)
          .eq("user_id", userId);
      }
    }
  }

  const { data, error } = await supabase
    .from("user_actions")
    .update({
      status,
      snoozed_until: status === "snoozed" ? snoozedUntil ?? null : null,
      updated_at: now,
    })
    .eq("id", actionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update action");

  void logAudit(supabase, userId, `action.${status}`, {
    resource_type: "user_action",
    resource_id: actionId,
    action_type: action.action_type,
  }).catch(() => {});

  return userActionRowSchema.parse(data);
}
