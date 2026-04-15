export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/api/with-auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";
import { RateLimitError, AppError } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";
import { isPremiumPlan } from "@/lib/utils/subscription";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://creditcardchris.com";

export const POST = withAuth(async (_req, { user, supabase }) => {
  // Rate limit checkout attempts
  const { allowed } = await checkRateLimit("stripeCheckout", user.id, RATE_LIMITS.stripeCheckout);
  if (!allowed) throw new RateLimitError();

  // Check if already premium
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, plan, status")
    .eq("user_id", user.id)
    .single();

  if (isPremiumPlan(sub)) {
    throw new AppError(400, "Already subscribed", "ALREADY_SUBSCRIBED");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: sub?.stripe_customer_id ?? undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: serverEnv().STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/settings?upgraded=true`,
    cancel_url: `${APP_URL}/settings`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
});
