export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { getPremiumUserIds } from "@/lib/api/get-premium-user-ids";
import { sendAlert } from "@/lib/notifications/send-alert";

export const POST = withCron(async () => {
  const env = serverEnv();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:hello@creditcardchris.com", publicKey, privateKey);

  const supabase = createServiceClient();
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Get all users with budgets
  const { data: budgets } = await supabase
    .from("spending_budgets")
    .select("user_id, category_id, monthly_limit, category:spending_categories(display_name)");

  if (!budgets?.length) return NextResponse.json({ sent: 0 });

  // Group by user
  const byUser: Record<string, typeof budgets> = {};
  for (const b of budgets) {
    if (!byUser[b.user_id]) byUser[b.user_id] = [];
    byUser[b.user_id].push(b);
  }

  const premiumUserIds = await getPremiumUserIds(supabase, Object.keys(byUser));

  // Batch-fetch user emails for email/SMS channels
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!])
  );

  let sent = 0;

  await Promise.allSettled(
    Object.entries(byUser).map(async ([userId, userBudgets]) => {
      if (!premiumUserIds.has(userId)) return;

      // Get this month's spending by category
      const { data: txData } = await supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .gte("transaction_date", `${thisMonth}-01`);

      const spentMap: Record<string, number> = {};
      for (const tx of txData ?? []) {
        spentMap[tx.category_id] = (spentMap[tx.category_id] ?? 0) + tx.amount;
      }

      const overBudget = userBudgets.filter((b) => {
        const spent = spentMap[b.category_id] ?? 0;
        return spent > b.monthly_limit;
      });

      if (!overBudget.length) return;

      const catNames = overBudget
        .map((b) => {
          const cat = b.category as { display_name: string } | { display_name: string }[] | null;
          if (!cat) return "a category";
          if (Array.isArray(cat)) return cat[0]?.display_name ?? "a category";
          return cat.display_name ?? "a category";
        })
        .join(", ");

      const delivered = await sendAlert(
        supabase,
        userId,
        emailMap.get(userId),
        { title: "Budget Alert", body: `You're over budget in: ${catNames}`, url: "/budgets" },
        true
      );
      sent += delivered;
    })
  );

  return NextResponse.json({ sent });
});

export const GET = POST;
