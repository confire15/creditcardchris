import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { logAudit } from "@/lib/utils/audit";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const { data, error } = await supabase
    .from("spend_challenges")
    .select("*, user_card:user_cards(id, nickname, custom_name, card_template:card_templates(name)), category:spending_categories(display_name)")
    .in("user_id", memberIds)
    .order("ends_on", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load challenges" }, { status: 400 });
  return NextResponse.json({ challenges: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const targetSpend = Number(body?.targetSpend ?? 0);
  const startsOn = typeof body?.startsOn === "string" ? body.startsOn : "";
  const endsOn = typeof body?.endsOn === "string" ? body.endsOn : "";
  const userCardId = typeof body?.userCardId === "string" ? body.userCardId : null;
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : null;
  const rewardDescription = typeof body?.rewardDescription === "string" ? body.rewardDescription.trim() : null;

  if (!title || !startsOn || !endsOn || !Number.isFinite(targetSpend) || targetSpend <= 0) {
    return NextResponse.json({ error: "Invalid challenge payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("spend_challenges")
    .insert({
      user_id: user.id,
      user_card_id: userCardId,
      category_id: categoryId,
      source: "manual",
      title,
      reward_description: rewardDescription,
      target_spend: targetSpend,
      current_spend: 0,
      starts_on: startsOn,
      ends_on: endsOn,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create challenge" }, { status: 400 });

  void logAudit(supabase, user.id, "challenge.created", {
    challenge_id: data.id,
    title,
    target_spend: targetSpend,
  }).catch(() => {});
  return NextResponse.json({ challenge: data });
});
