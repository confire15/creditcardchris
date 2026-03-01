import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { public_token, institution } = await req.json();
  if (!public_token) return NextResponse.json({ error: "Missing public_token" }, { status: 400 });

  try {
    // Exchange public token for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchangeRes.data;

    // Store the item
    const { data: item, error } = await supabase
      .from("plaid_items")
      .upsert({
        user_id: user.id,
        access_token,
        item_id,
        institution_name: institution?.name ?? null,
        institution_id: institution?.institution_id ?? null,
      }, { onConflict: "item_id" })
      .select()
      .single();

    if (error) throw error;

    // Fetch and store accounts
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
  } catch (err) {
    console.error("Plaid exchange token error:", err);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
  }
}
