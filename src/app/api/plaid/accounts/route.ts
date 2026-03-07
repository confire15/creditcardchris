import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data: items } = await supabase
    .from("plaid_items")
    .select("id, item_id, institution_name, last_synced_at, plaid_accounts(id, name, type, subtype, mask)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ items: items ?? [] });
});
