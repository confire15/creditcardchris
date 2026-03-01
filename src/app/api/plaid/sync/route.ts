import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";

// Map Plaid primary categories to our spending categories
function mapPlaidCategory(primary: string, detailed: string): string {
  const p = primary.toLowerCase();
  const d = detailed.toLowerCase();
  if (p.includes("food") || p.includes("restaurant") || d.includes("dining")) return "dining";
  if (p.includes("travel") && d.includes("airline")) return "flights";
  if (p.includes("travel") && (d.includes("hotel") || d.includes("lodging"))) return "hotels";
  if (p.includes("travel") && d.includes("car rental")) return "car_rental";
  if (p.includes("travel") && d.includes("transit")) return "transit";
  if (p.includes("travel")) return "travel";
  if (p.includes("groceries") || d.includes("supermarket") || d.includes("grocery")) return "groceries";
  if (p.includes("gas") || d.includes("gas station") || d.includes("fuel")) return "gas";
  if (p.includes("entertainment") || p.includes("recreation")) return "entertainment";
  if (p.includes("streaming") || d.includes("streaming") || d.includes("subscription")) return "streaming";
  if (p.includes("shop") && d.includes("online")) return "online_shopping";
  if (p.includes("shop")) return "online_shopping";
  if (p.includes("pharmacy") || p.includes("drug") || d.includes("pharmacy")) return "drugstore";
  if (p.includes("home") || d.includes("home improvement")) return "home_improvement";
  return "other";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id } = await req.json().catch(() => ({}));

  // Get all or specific plaid items for this user
  const query = supabase
    .from("plaid_items")
    .select("*")
    .eq("user_id", user.id);

  if (item_id) query.eq("item_id", item_id);

  const { data: items } = await query;
  if (!items?.length) return NextResponse.json({ imported: 0 });

  // Fetch all spending categories for mapping
  const { data: categories } = await supabase
    .from("spending_categories")
    .select("id, name");

  const catMap = Object.fromEntries((categories ?? []).map((c) => [c.name, c.id]));
  const otherCatId = catMap["other"];

  let totalImported = 0;

  for (const item of items) {
    try {
      let cursor = item.cursor ?? undefined;
      let hasMore = true;
      const txToInsert: Record<string, unknown>[] = [];

      while (hasMore) {
        const res = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        });

        const { added, modified, next_cursor, has_more } = res.data;

        for (const tx of [...added, ...modified]) {
          if (tx.pending) continue; // skip pending
          const catName = mapPlaidCategory(
            tx.personal_finance_category?.primary ?? "",
            tx.personal_finance_category?.detailed ?? ""
          );
          txToInsert.push({
            user_id: user.id,
            plaid_transaction_id: tx.transaction_id,
            merchant: tx.merchant_name ?? tx.name,
            description: tx.name,
            amount: Math.abs(tx.amount), // Plaid uses negative for credits
            transaction_date: tx.date,
            category_id: catMap[catName] ?? otherCatId,
            is_pending: false,
          });
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Upsert transactions (skip duplicates by plaid_transaction_id)
      if (txToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("transactions")
          .upsert(txToInsert, { onConflict: "plaid_transaction_id", ignoreDuplicates: true });
        if (!upsertError) totalImported += txToInsert.length;
      }

      // Save cursor for incremental future syncs
      await supabase
        .from("plaid_items")
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq("id", item.id);
    } catch (err) {
      console.error(`Plaid sync error for item ${item.item_id}:`, err);
    }
  }

  return NextResponse.json({ imported: totalImported });
}
