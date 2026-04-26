import { withPremium } from "@/lib/api/with-premium";
import { NextRequest, NextResponse } from "next/server";
import { differenceInDays } from "date-fns";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { buildHouseholdOwnerLabels } from "@/lib/utils/household-labels";

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const ownerLabels = buildHouseholdOwnerLabels(memberIds);
  const { data: subs, error } = await supabase
    .from("card_subs")
    .select("*, user_card:user_cards(id, user_id, nickname, custom_name, card_template:card_templates(name))")
    .in("user_id", memberIds)
    .eq("is_met", false)
    .order("deadline", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load SUBs" }, { status: 400 });
  if (!subs?.length) return NextResponse.json({ sub: null });

  const today = new Date();
  const scored = subs.map((sub) => {
    const created = new Date(sub.created_at);
    const deadline = new Date(sub.deadline);
    const totalDays = Math.max(differenceInDays(deadline, created), 1);
    const elapsedDays = Math.max(differenceInDays(today, created), 0);
    const expectedRatio = Math.min(elapsedDays / totalDays, 1);
    const currentRatio = Number(sub.current_spend) / Math.max(Number(sub.required_spend), 1);
    const behindBy = expectedRatio - currentRatio;
    const daysLeft = Math.max(differenceInDays(deadline, today), 0);
    const needed = Math.max(Number(sub.required_spend) - Number(sub.current_spend), 0);
    const perDay = daysLeft > 0 ? needed / daysLeft : needed;
    const card = Array.isArray(sub.user_card) ? sub.user_card[0] : sub.user_card;
    const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
    const cardName = card?.nickname || card?.custom_name || cardTemplate?.name || "Card";
    return { ...sub, behindBy, daysLeft, perDay, cardName, ownerLabel: card?.user_id ? ownerLabels[card.user_id] ?? null : null };
  });

  scored.sort((a, b) => b.behindBy - a.behindBy);
  return NextResponse.json({ sub: scored[0] });
});
