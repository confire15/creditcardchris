import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id } = await req.json();
  if (!item_id) return NextResponse.json({ error: "Missing item_id" }, { status: 400 });

  const { data: item } = await supabase
    .from("plaid_items")
    .select("access_token")
    .eq("item_id", item_id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await plaidClient.itemRemove({ access_token: item.access_token });
  } catch {
    // Continue even if Plaid call fails
  }

  await supabase.from("plaid_items").delete().eq("item_id", item_id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
