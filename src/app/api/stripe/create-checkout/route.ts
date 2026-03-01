export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://creditcardchris.com";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already premium
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, plan, status")
    .eq("user_id", user.id)
    .single();

  if (sub?.plan === "premium" && sub?.status === "active") {
    return NextResponse.json({ error: "Already subscribed" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: sub?.stripe_customer_id ?? undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user.email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${APP_URL}/settings?upgraded=true`,
      cancel_url: `${APP_URL}/settings`,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
