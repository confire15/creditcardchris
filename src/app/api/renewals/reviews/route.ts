import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { requireOwnUserCard } from "@/lib/api/ownership";

function reviewPayload(body: Record<string, unknown>, userId: string) {
  const userCardId = typeof body.userCardId === "string" ? body.userCardId : "";
  if (!userCardId) return null;
  return {
    user_id: userId,
    user_card_id: userCardId,
    annual_fee_posted_on: typeof body.annualFeePostedOn === "string" && body.annualFeePostedOn ? body.annualFeePostedOn : null,
    refund_deadline: typeof body.refundDeadline === "string" && body.refundDeadline ? body.refundDeadline : null,
    retention_offer_value: Number(body.retentionOfferValue ?? 0),
    retention_offer_notes: typeof body.retentionOfferNotes === "string" && body.retentionOfferNotes.trim() ? body.retentionOfferNotes.trim() : null,
    decision: typeof body.decision === "string" ? body.decision : "undecided",
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    updated_at: new Date().toISOString(),
  };
}

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const { data, error } = await supabase
    .from("card_renewal_reviews")
    .select("*")
    .in("user_id", memberIds)
    .order("refund_deadline", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: "Failed to load renewal reviews" }, { status: 400 });
  return NextResponse.json({ reviews: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const payload = reviewPayload(body, user.id);
  if (!payload) return NextResponse.json({ error: "Invalid renewal review payload" }, { status: 400 });
  await requireOwnUserCard(supabase, user.id, payload.user_card_id);
  const { data, error } = await supabase
    .from("card_renewal_reviews")
    .upsert(payload, { onConflict: "user_card_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to save renewal review" }, { status: 400 });
  return NextResponse.json({ review: data });
});

export const PATCH = POST;
