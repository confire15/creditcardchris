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
    .select("user_id, invited_at")
    .eq("household_id", membership.household_id)
    .not("accepted_at", "is", null);

  const ordered = (members ?? [])
    .slice()
    .sort((a, b) => new Date(a.invited_at).getTime() - new Date(b.invited_at).getTime())
    .map((member) => member.user_id);
  const ids = [...new Set([userId, ...ordered])];
  return ids;
}
