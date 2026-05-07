import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { requireOwnUserCard } from "@/lib/api/ownership";

function offerPayload(body: Record<string, unknown>, userId: string) {
  const merchant = typeof body.merchant === "string" ? body.merchant.trim() : "";
  const userCardId = typeof body.userCardId === "string" && body.userCardId ? body.userCardId : null;
  if (!merchant) return null;
  return {
    user_id: userId,
    user_card_id: userCardId,
    merchant,
    offer_type: typeof body.offerType === "string" ? body.offerType : "statement_credit",
    value_amount: body.valueAmount == null || body.valueAmount === "" ? null : Number(body.valueAmount),
    value_percent: body.valuePercent == null || body.valuePercent === "" ? null : Number(body.valuePercent),
    minimum_spend: body.minimumSpend == null || body.minimumSpend === "" ? null : Number(body.minimumSpend),
    expires_on: typeof body.expiresOn === "string" && body.expiresOn ? body.expiresOn : null,
    is_activated: Boolean(body.isActivated),
    is_used: Boolean(body.isUsed),
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    updated_at: new Date().toISOString(),
  };
}

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const { data, error } = await supabase
    .from("user_card_offers")
    .select("*, user_card:user_cards(id, nickname, custom_name, card_template:card_templates(name, issuer, color))")
    .in("user_id", memberIds)
    .order("expires_on", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: "Failed to load offers" }, { status: 400 });
  return NextResponse.json({ offers: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const payload = offerPayload(body, user.id);
  if (!payload) return NextResponse.json({ error: "Invalid offer payload" }, { status: 400 });
  await requireOwnUserCard(supabase, user.id, payload.user_card_id);
  const { data, error } = await supabase.from("user_card_offers").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Failed to save offer" }, { status: 400 });
  return NextResponse.json({ offer: data });
});

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const payload = offerPayload(body, user.id);
  if (!id || !payload) return NextResponse.json({ error: "Invalid offer payload" }, { status: 400 });
  await requireOwnUserCard(supabase, user.id, payload.user_card_id);
  const { data, error } = await supabase
    .from("user_card_offers")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to update offer" }, { status: 400 });
  return NextResponse.json({ offer: data });
});

export const DELETE = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing offer id" }, { status: 400 });
  const { error } = await supabase.from("user_card_offers").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete offer" }, { status: 400 });
  return NextResponse.json({ ok: true });
});
