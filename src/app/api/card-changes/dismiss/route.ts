import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) return NextResponse.json({ error: "Missing card change event id" }, { status: 400 });
  const { error } = await supabase
    .from("user_card_change_dismissals")
    .upsert(
      { user_id: user.id, card_change_event_id: eventId, dismissed_at: new Date().toISOString() },
      { onConflict: "user_id,card_change_event_id" },
    );
  if (error) return NextResponse.json({ error: "Failed to dismiss card change" }, { status: 400 });
  return NextResponse.json({ ok: true });
});
