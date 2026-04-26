import { SupabaseClient } from "@supabase/supabase-js";

export async function getHouseholdMemberIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .not("accepted_at", "is", null)
    .maybeSingle();

  if (!membership?.household_id) return [userId];

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", membership.household_id)
    .not("accepted_at", "is", null);

  const ids = [...new Set([userId, ...(members ?? []).map((member) => member.user_id)])];
  return ids;
}
