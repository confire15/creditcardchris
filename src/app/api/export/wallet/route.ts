import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: unknown) => {
    const text =
      value == null
        ? ""
        : typeof value === "string"
        ? value
        : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  if (format !== "csv") {
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

  const [cardsRes, rewardsRes, creditsRes, perksRes] = await Promise.all([
    supabase
      .from("user_cards")
      .select("id, user_id, nickname, custom_name, custom_issuer, is_active, custom_annual_fee, custom_cpp, cpp_redemption_mode, last_four, card_template:card_templates(name,issuer,annual_fee)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_card_rewards")
      .select("user_card_id, category_id, multiplier, cap_amount"),
    supabase
      .from("statement_credits")
      .select("user_card_id, name, annual_amount, used_amount, reset_month, will_use")
      .eq("user_id", user.id),
    supabase
      .from("card_perks")
      .select("user_card_id, name, perk_type, value_type, annual_value, annual_count, used_value, used_count, is_redeemed, reset_cadence")
      .eq("user_id", user.id),
  ]);

  const rewardsByCard = new Map<string, unknown[]>();
  for (const reward of rewardsRes.data ?? []) {
    const bucket = rewardsByCard.get(reward.user_card_id) ?? [];
    bucket.push(reward);
    rewardsByCard.set(reward.user_card_id, bucket);
  }
  const creditsByCard = new Map<string, unknown[]>();
  for (const credit of creditsRes.data ?? []) {
    const bucket = creditsByCard.get(credit.user_card_id) ?? [];
    bucket.push(credit);
    creditsByCard.set(credit.user_card_id, bucket);
  }
  const perksByCard = new Map<string, unknown[]>();
  for (const perk of perksRes.data ?? []) {
    const bucket = perksByCard.get(perk.user_card_id) ?? [];
    bucket.push(perk);
    perksByCard.set(perk.user_card_id, bucket);
  }

  const rows = (cardsRes.data ?? []).map((card) => {
    const cardTemplate = Array.isArray(card.card_template) ? card.card_template[0] : card.card_template;
    return {
    card_id: card.id,
    name: card.nickname ?? card.custom_name ?? cardTemplate?.name ?? "Unknown Card",
    issuer: cardTemplate?.issuer ?? card.custom_issuer ?? "",
    last_four: card.last_four ?? "",
    is_active: card.is_active,
    annual_fee: card.custom_annual_fee ?? cardTemplate?.annual_fee ?? 0,
    custom_cpp: card.custom_cpp,
    cpp_redemption_mode: card.cpp_redemption_mode,
    reward_overrides: rewardsByCard.get(card.id) ?? [],
    statement_credits: creditsByCard.get(card.id) ?? [],
    perks: perksByCard.get(card.id) ?? [],
    };
  });

  const csv = toCsv(rows);
  const filename = `wallet-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
