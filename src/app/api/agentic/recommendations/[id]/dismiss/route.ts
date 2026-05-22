import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { dismissRecommendation } from "@/lib/agentic/runner";

export const POST = withPremium(async (req: NextRequest, { user, supabase }, route) => {
  const params = await route?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing recommendation id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const notes = typeof body?.notes === "string" ? body.notes : null;

  try {
    await dismissRecommendation(supabase, user.id, id, notes);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }
});
