import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { logAudit } from "@/lib/utils/audit";

const schema = z.object({
  perkId: z.string().uuid(),
  actionId: z.string().uuid().nullable().optional(),
  amountCents: z.number().int().positive(),
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { perkId, actionId, amountCents } = parsed.data;
  const amount = amountCents / 100;

  const { data: perk, error: fetchErr } = await supabase
    .from("card_perks")
    .select("id, annual_value, used_value, value_type, is_redeemed")
    .eq("id", perkId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: "Lookup failed" }, { status: 400 });
  if (!perk) return NextResponse.json({ error: "Perk not found" }, { status: 404 });

  const newUsed = Math.min(
    (perk.used_value ?? 0) + amount,
    perk.annual_value ?? amount
  );
  const fullyUsed =
    perk.value_type === "dollar"
      ? newUsed >= (perk.annual_value ?? 0)
      : true;

  const { error: updateErr } = await supabase
    .from("card_perks")
    .update({
      used_value: newUsed,
      is_redeemed: fullyUsed ? true : perk.is_redeemed,
      closed_via_app_at: new Date().toISOString(),
      closed_via_action_id: actionId ?? null,
    })
    .eq("id", perkId)
    .eq("user_id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }

  void logAudit(supabase, user.id, "perk.closed_via_app", {
    perk_id: perkId,
    action_id: actionId ?? null,
    amount_cents: amountCents,
  }).catch(() => {});

  return NextResponse.json({ ok: true, usedValue: newUsed, fullyUsed });
});
