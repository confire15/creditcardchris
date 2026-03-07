export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { withAuth } from "@/lib/api/with-auth";
import { AppError } from "@/lib/api/errors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://creditcardchris.com";

export const POST = withAuth(async (_req, { user, supabase }) => {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    throw new AppError(404, "No subscription found", "NOT_FOUND");
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/settings`,
  });

  return NextResponse.json({ url: session.url });
});
