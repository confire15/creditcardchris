export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { withCron } from "@/lib/api/with-cron";
import { pushSendSchema } from "@/lib/validations/api";
import { ValidationError, errorResponse } from "@/lib/api/errors";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const POST = withCron(async (req: NextRequest) => {
  const env = serverEnv();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:hello@creditcardchris.com", publicKey, privateKey);

  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const body = await req.json();
  const parsed = pushSendSchema.safeParse(body);
  if (!parsed.success) return errorResponse(new ValidationError("Invalid push payload"));
  const { title, body: pushBody, url } = parsed.data;

  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body: pushBody, url })
        );
        sent++;
      } catch {
        // Subscription expired — remove it
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    })
  );

  return NextResponse.json({ sent });
});
