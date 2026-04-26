export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { logAudit } from "@/lib/utils/audit";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Use service role to bypass RLS for webhook operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const handleSubscription = async (sub: import("stripe").Stripe.Subscription) => {
    const userId = sub.metadata?.user_id;
    if (!userId) return;

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const plan = sub.status === "active" ? "premium" : "free";
    const { data: previousSub } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .single();

    // current_period_end may be at top level or on items in newer API versions
    const rawPeriodEnd = (sub as unknown as Record<string, unknown>).current_period_end
      ?? (sub.items?.data?.[0] as unknown as Record<string, unknown>)?.current_period_end;
    const periodEnd = typeof rawPeriodEnd === "number"
      ? new Date(rawPeriodEnd * 1000).toISOString()
      : null;

    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) console.error("Supabase upsert error:", error);
    const wasPremium = previousSub?.plan === "premium";
    const isPremium = plan === "premium";
    const action = isPremium && !wasPremium ? "subscription.upgraded" : "subscription.downgraded";
    void logAudit(supabase, userId, action, { plan, status: sub.status }).catch(() => {});
  };

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscription(event.data.object as import("stripe").Stripe.Subscription);
      break;
    case "customer.subscription.deleted": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("subscriptions")
          .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        void logAudit(supabase, userId, "subscription.downgraded", {
          plan: "free",
          status: "canceled",
        }).catch(() => {});
      }
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const fullSub = await stripe.subscriptions.retrieve(subId);
        if (!fullSub.metadata?.user_id && session.metadata?.user_id) {
          await stripe.subscriptions.update(subId, {
            metadata: { user_id: session.metadata.user_id },
          });
          fullSub.metadata.user_id = session.metadata.user_id;
        }
        await handleSubscription(fullSub);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
