import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { withAuth } from "@/lib/api/with-auth";
import { plaidDisconnectSchema } from "@/lib/validations/api";
import { decrypt, isEncrypted } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export const DELETE = withAuth(async (req, { user, supabase }) => {
  const body = plaidDisconnectSchema.parse(await req.json());
  const { item_id } = body;

  const { data: item } = await supabase
    .from("plaid_items")
    .select("access_token")
    .eq("item_id", item_id)
    .eq("user_id", user.id)
    .single();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Decrypt access token for Plaid API call
    const accessToken = isEncrypted(item.access_token) ? decrypt(item.access_token) : item.access_token;
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch {
    // Continue even if Plaid call fails
  }

  await supabase.from("plaid_items").delete().eq("item_id", item_id).eq("user_id", user.id);

  // Audit log the disconnection
  logAudit({
    supabase,
    userId: user.id,
    action: "plaid.disconnected",
    resourceType: "plaid_item",
    resourceId: item_id,
    req,
  });

  return NextResponse.json({ success: true });
});
