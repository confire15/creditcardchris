import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { withAuth } from "@/lib/api/with-auth";
import { plaidExchangeTokenSchema } from "@/lib/validations/api";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = plaidExchangeTokenSchema.parse(await req.json());
  const { public_token, institution } = body;

  // Exchange public token for access token
  const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
  const { access_token, item_id } = exchangeRes.data;

  // Encrypt the access token before storing
  const encryptedToken = encrypt(access_token);

  // Store the item with encrypted token
  const { data: item, error } = await supabase
    .from("plaid_items")
    .upsert({
      user_id: user.id,
      access_token: encryptedToken,
      item_id,
      institution_name: institution?.name ?? null,
      institution_id: institution?.institution_id ?? null,
    }, { onConflict: "item_id" })
    .select()
    .single();

  if (error) throw error;

  // Audit log the connection
  logAudit({
    supabase,
    userId: user.id,
    action: "plaid.connected",
    resourceType: "plaid_item",
    resourceId: item_id,
    metadata: { institution_name: institution?.name },
    req,
  });

  // Fetch and store accounts using PLAINTEXT token (Plaid needs the real token)
  const accountsRes = await plaidClient.accountsGet({ access_token });
  const accounts = accountsRes.data.accounts;

  if (accounts.length > 0) {
    await supabase.from("plaid_accounts").upsert(
      accounts.map((a) => ({
        plaid_item_id: item.id,
        user_id: user.id,
        plaid_account_id: a.account_id,
        name: a.name,
        official_name: a.official_name ?? null,
        type: a.type,
        subtype: a.subtype ?? null,
        mask: a.mask ?? null,
      })),
      { onConflict: "plaid_account_id" }
    );
  }

  return NextResponse.json({ success: true, item_id });
});
