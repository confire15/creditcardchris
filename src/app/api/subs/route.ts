import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { logAudit } from "@/lib/utils/audit";

export const GET = withPremium(async (req: NextRequest, { user, supabase }) => {
  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) return NextResponse.json({ error: "Missing cardId" }, { status: 400 });

  const { data, error } = await supabase
    .from("card_subs")
    .select("*")
    .eq("user_id", user.id)
    .eq("user_card_id", cardId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load SUB" }, { status: 400 });
  return NextResponse.json({ sub: data });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const userCardId = typeof body?.userCardId === "string" ? body.userCardId : "";
  const rewardAmount = Number(body?.rewardAmount ?? 0);
  const rewardUnit = typeof body?.rewardUnit === "string" ? body.rewardUnit : "points";
  const requiredSpend = Number(body?.requiredSpend ?? 0);
  const deadline = typeof body?.deadline === "string" ? body.deadline : "";
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  if (!userCardId || !deadline || !Number.isFinite(rewardAmount) || !Number.isFinite(requiredSpend) || rewardAmount <= 0 || requiredSpend <= 0) {
    return NextResponse.json({ error: "Invalid SUB payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("card_subs")
    .upsert(
      {
        user_id: user.id,
        user_card_id: userCardId,
        reward_amount: rewardAmount,
        reward_unit: rewardUnit,
        required_spend: requiredSpend,
        deadline,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_card_id" },
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to save SUB" }, { status: 400 });

  const challengePayload = {
    user_id: user.id,
    user_card_id: userCardId,
    source: "sub",
    source_ref: data.id,
    title: "Sign-up bonus spend",
    reward_description: `${rewardAmount.toLocaleString("en-US")} ${rewardUnit}`,
    target_spend: requiredSpend,
    current_spend: Number(data.current_spend),
    starts_on: new Date(data.created_at).toISOString().slice(0, 10),
    ends_on: deadline,
    is_met: data.is_met,
    met_at: data.met_at,
    updated_at: new Date().toISOString(),
  };
  const { data: existingChallenge } = await supabase
    .from("spend_challenges")
    .select("id")
    .eq("user_id", user.id)
    .eq("source", "sub")
    .eq("source_ref", data.id)
    .maybeSingle();

  if (existingChallenge?.id) {
    await supabase.from("spend_challenges").update(challengePayload).eq("id", existingChallenge.id);
  } else {
    await supabase.from("spend_challenges").insert(challengePayload);
    void logAudit(supabase, user.id, "challenge.created", {
      source: "sub",
      source_ref: data.id,
    }).catch(() => {});
  }

  return NextResponse.json({ sub: data });
});
