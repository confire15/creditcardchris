import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export async function getAllowedUserIds(
  supabase: SupabaseClient,
  userId: string,
) {
  return getHouseholdMemberIds(supabase, userId);
}

export async function requireOwnUserCard(
  supabase: SupabaseClient,
  userId: string,
  userCardId: string | null,
) {
  if (!userCardId) return;

  const { data } = await supabase
    .from("user_cards")
    .select("id")
    .eq("id", userCardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.id) {
    throw new AppError(404, "Card not found", "NOT_FOUND");
  }
}

export async function requireReadableUserCard(
  supabase: SupabaseClient,
  userId: string,
  userCardId: string | null,
) {
  if (!userCardId) return;
  const allowedUserIds = await getAllowedUserIds(supabase, userId);

  const { data } = await supabase
    .from("user_cards")
    .select("id")
    .eq("id", userCardId)
    .in("user_id", allowedUserIds)
    .maybeSingle();

  if (!data?.id) {
    throw new AppError(404, "Card not found", "NOT_FOUND");
  }
}

export async function requireCategoryAllowedForWrite(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string | null,
) {
  if (!categoryId) return;

  const { data } = await supabase
    .from("spending_categories")
    .select("id, user_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (!data?.id || (data.user_id && data.user_id !== userId)) {
    throw new AppError(404, "Category not found", "NOT_FOUND");
  }
}

export async function requireOwnSub(
  supabase: SupabaseClient,
  userId: string,
  subId: string,
) {
  const { data } = await supabase
    .from("card_subs")
    .select("id")
    .eq("id", subId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.id) {
    throw new AppError(404, "Sign-up bonus not found", "NOT_FOUND");
  }
}
