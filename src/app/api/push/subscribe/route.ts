import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/validations/api";
import { ValidationError, errorResponse, RateLimitError } from "@/lib/api/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const rl = await checkRateLimit("pushSubscribe", user.id, RATE_LIMITS.pushSubscribe);
  if (!rl.allowed) return errorResponse(new RateLimitError());

  const body = await req.json();
  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new ValidationError("Invalid subscription data"));
  const { endpoint, keys } = parsed.data;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] upsert error:", error.message);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json();
  const parsed = pushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new ValidationError("Invalid request"));
  const { endpoint } = parsed.data;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
});
