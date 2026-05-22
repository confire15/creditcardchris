import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { transitionUserAction } from "@/lib/actions/runner";

const schema = z.object({
  days: z.number().int().min(1).max(30).default(3),
});

export const POST = withAuth(async (req: NextRequest, { user, supabase }, route) => {
  const params = await route?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing action id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid snooze window" }, { status: 400 });

  try {
    const action = await transitionUserAction({
      supabase,
      userId: user.id,
      actionId: id,
      status: "snoozed",
      snoozedUntil: addDays(new Date(), parsed.data.days).toISOString(),
    });
    return NextResponse.json({ ok: true, action });
  } catch {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }
});
