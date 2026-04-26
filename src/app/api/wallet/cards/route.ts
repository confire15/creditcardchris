import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { FREE_WALLET_CAP } from "@/lib/constants/limits";
import { seedCreditsFromTemplate } from "@/lib/utils/seed-credits";
import { logAudit } from "@/lib/utils/audit";

type RewardInsert = {
  category_id: string;
  multiplier: number;
  cap_amount?: number | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cardType = body?.cardType;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = isPremiumPlan(sub);

  if (!isPremium) {
    const { count } = await supabase
      .from("user_cards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);
    if ((count ?? 0) >= FREE_WALLET_CAP) {
      return NextResponse.json({ error: "FREE_CAP" }, { status: 403 });
    }
  }

  if (cardType === "template") {
    const templateId = typeof body?.templateId === "string" ? body.templateId : "";
    const lastFour = typeof body?.lastFour === "string" && body.lastFour.length > 0 ? body.lastFour : null;
    const rewards = Array.isArray(body?.rewards) ? (body.rewards as RewardInsert[]) : null;
    if (!templateId) return NextResponse.json({ error: "Missing templateId" }, { status: 400 });

    const { data: userCard, error: cardError } = await supabase
      .from("user_cards")
      .insert({ user_id: user.id, card_template_id: templateId, last_four: lastFour })
      .select("id")
      .single();
    if (cardError || !userCard) {
      return NextResponse.json({ error: "Failed to create card" }, { status: 400 });
    }

    const rewardRows =
      rewards ??
      (
        await supabase
          .from("card_template_rewards")
          .select("category_id, multiplier, cap_amount")
          .eq("card_template_id", templateId)
      ).data ??
      [];

    if (rewardRows.length > 0) {
      const { error: rewardsError } = await supabase.from("user_card_rewards").insert(
        rewardRows.map((reward) => ({
          user_card_id: userCard.id,
          category_id: reward.category_id,
          multiplier: reward.multiplier,
          cap_amount: reward.cap_amount ?? null,
        })),
      );
      if (rewardsError) {
        return NextResponse.json({ error: "Failed to save reward rates" }, { status: 400 });
      }
    }

    await seedCreditsFromTemplate(supabase, userCard.id, user.id, templateId);
    void logAudit(supabase, user.id, "card.added", {
      user_card_id: userCard.id,
      card_template_id: templateId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: userCard.id });
  }

  if (cardType === "custom") {
    const payload = body?.custom;
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Missing custom payload" }, { status: 400 });
    }

    const insertPayload = {
      user_id: user.id,
      custom_name: payload.custom_name ?? null,
      custom_issuer: payload.custom_issuer ?? null,
      custom_network: payload.custom_network ?? null,
      custom_reward_type: payload.custom_reward_type ?? null,
      custom_reward_unit: payload.custom_reward_unit ?? null,
      custom_base_reward_rate: payload.custom_base_reward_rate ?? null,
      custom_color: payload.custom_color ?? null,
      last_four: payload.last_four ?? null,
    };

    const { data: userCard, error } = await supabase
      .from("user_cards")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error || !userCard) {
      return NextResponse.json({ error: "Failed to create card" }, { status: 400 });
    }

    void logAudit(supabase, user.id, "card.added", {
      user_card_id: userCard.id,
      card_name: insertPayload.custom_name,
      is_custom: true,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: userCard.id });
  }

  return NextResponse.json({ error: "Unsupported cardType" }, { status: 400 });
}
