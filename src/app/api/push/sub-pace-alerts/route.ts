export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withCron } from "@/lib/api/with-cron";
import { createServiceClient } from "@/lib/supabase/service";
import { getPremiumUserIds } from "@/lib/api/get-premium-user-ids";
import { sendAlert } from "@/lib/notifications/send-alert";
import { differenceInDays, parseISO } from "date-fns";

const handler = withCron(async () => {
  const supabase = createServiceClient();
  const now = new Date();

  const { data: subs } = await supabase
    .from("card_subs")
    .select("id, user_id, current_spend, required_spend, created_at, deadline, user_card:user_cards(nickname, custom_name, card_template:card_templates(name))")
    .eq("is_met", false);
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const premiumUserIds = await getPremiumUserIds(supabase, userIds);

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map((authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!]));

  let sent = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      if (!premiumUserIds.has(sub.user_id)) return;

      const createdAt = parseISO(sub.created_at);
      const deadline = parseISO(sub.deadline);
      const totalDays = Math.max(differenceInDays(deadline, createdAt), 1);
      const elapsedDays = Math.max(differenceInDays(now, createdAt), 0);
      const daysLeft = Math.max(differenceInDays(deadline, now), 0);
      const expectedRatio = Math.min(elapsedDays / totalDays, 1);
      const currentRatio = Number(sub.current_spend) / Math.max(Number(sub.required_spend), 1);
      const isBehind = currentRatio < expectedRatio * 0.9;
      if (!isBehind && ![7, 3, 1].includes(daysLeft)) return;

      const card = Array.isArray(sub.user_card) ? sub.user_card[0] : sub.user_card;
      const cardTemplate = Array.isArray(card?.card_template) ? card.card_template[0] : card?.card_template;
      const cardName = card?.nickname || card?.custom_name || cardTemplate?.name || "Your card";

      const needed = Math.max(Number(sub.required_spend) - Number(sub.current_spend), 0);
      const perDay = daysLeft > 0 ? Math.ceil(needed / daysLeft) : Math.ceil(needed);
      const body = isBehind
        ? `${cardName}: you're behind pace. Need $${perDay}/day to hit your SUB.`
        : `${cardName}: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to finish your SUB spend.`;

      const delivered = await sendAlert(
        supabase,
        sub.user_id,
        emailMap.get(sub.user_id),
        { title: "SUB Pace Alert", body, url: "/wallet" },
        true,
      );
      sent += delivered;
    }),
  );

  return NextResponse.json({ sent });
});

export const GET = handler;
export const POST = handler;
