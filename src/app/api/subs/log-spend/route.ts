import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { logAudit } from "@/lib/utils/audit";

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const subId = typeof body?.subId === "string" ? body.subId : "";
  const amount = Number(body?.amount ?? 0);
  if (!subId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: subRow, error: subError } = await supabase
    .from("card_subs")
    .select("*")
    .eq("id", subId)
    .eq("user_id", user.id)
    .single();
  if (subError || !subRow) {
    return NextResponse.json({ error: "SUB not found" }, { status: 404 });
  }

  const nextSpend = Number(subRow.current_spend) + amount;
  const isMet = nextSpend >= Number(subRow.required_spend);

  const { data, error } = await supabase
    .from("card_subs")
    .update({
      current_spend: nextSpend,
      is_met: isMet,
      met_at: isMet ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to log spend" }, { status: 400 });

  if (!subRow.is_met && isMet) {
    void logAudit(supabase, user.id, "sub.met", {
      sub_id: subId,
      required_spend: subRow.required_spend,
      current_spend: nextSpend,
    }).catch(() => {});
  }

  const challengeUpdate = {
    current_spend: nextSpend,
    is_met: isMet,
    met_at: isMet ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  await supabase
    .from("spend_challenges")
    .update(challengeUpdate)
    .eq("user_id", user.id)
    .eq("source", "sub")
    .eq("source_ref", subId);

  if (!subRow.is_met && isMet) {
    void logAudit(supabase, user.id, "challenge.met", {
      source: "sub",
      source_ref: subId,
      target_spend: subRow.required_spend,
    }).catch(() => {});
  }

  return NextResponse.json({ sub: data });
});
