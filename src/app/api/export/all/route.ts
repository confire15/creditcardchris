import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  if (format !== "json") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  if (!isPremiumPlan(sub)) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  const [wallet, credits, perks, auditLogs, subscription] = await Promise.all([
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*), rewards:user_card_rewards(*, category:spending_categories(*))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("statement_credits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_perks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", user.id)
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
}
