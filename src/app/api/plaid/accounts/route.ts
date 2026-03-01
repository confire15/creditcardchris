import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: items } = await supabase
    .from("plaid_items")
    .select("id, item_id, institution_name, last_synced_at, plaid_accounts(id, name, type, subtype, mask)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ items: items ?? [] });
}
