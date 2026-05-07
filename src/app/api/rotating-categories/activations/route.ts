import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { requireOwnUserCard } from "@/lib/api/ownership";

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const now = new Date().toISOString().slice(0, 10);
  const [{ data: periods }, { data: statuses }] = await Promise.all([
    supabase
      .from("rotating_category_periods")
      .select("*, card_template:card_templates(name, issuer)")
      .lte("starts_on", now)
      .gte("ends_on", now)
      .order("issuer"),
    supabase
      .from("user_rotating_category_status")
      .select("*, rotating_category_period:rotating_category_periods(*)")
      .in("user_id", memberIds),
  ]);
  return NextResponse.json({ periods: periods ?? [], statuses: statuses ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const userCardId = typeof body.userCardId === "string" ? body.userCardId : "";
  const periodId = typeof body.periodId === "string" ? body.periodId : "";
  if (!userCardId || !periodId) return NextResponse.json({ error: "Missing activation payload" }, { status: 400 });
  await requireOwnUserCard(supabase, user.id, userCardId);
  const { data, error } = await supabase
    .from("user_rotating_category_status")
    .upsert(
      {
        user_id: user.id,
        user_card_id: userCardId,
        rotating_category_period_id: periodId,
        is_activated: Boolean(body.isActivated),
        cap_spend: Number(body.capSpend ?? 0),
        notes: typeof body.notes === "string" ? body.notes : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_card_id,rotating_category_period_id" },
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to save activation" }, { status: 400 });
  return NextResponse.json({ status: data });
});
