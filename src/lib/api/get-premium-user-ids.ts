import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPremiumUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .in("user_id", unique)
    .eq("plan", "premium")
    .eq("status", "active");
  return new Set((data ?? []).map((r) => r.user_id));
}
