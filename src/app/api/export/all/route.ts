import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export const GET = withPremium(async (req: NextRequest, { user, supabase }) => {
  const format = req.nextUrl.searchParams.get("format");
  if (format !== "json") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const memberIds = await getHouseholdMemberIds(supabase, user.id);

  const [wallet, credits, perks, auditLogs, subscription] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("statement_credits")
      .select("*")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_perks")
      .select("*")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*")
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", user.id)
      .single(),
  ]);

  const payload = {
    wallet: wallet.data ?? [],
    credits: credits.data ?? [],
    perks: perks.data ?? [],
    audit_logs: auditLogs.data ?? [],
    subscriptions: { plan: subscription.data?.plan ?? "free", status: subscription.data?.status ?? null },
  };

  const filename = `credit-card-chris-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
