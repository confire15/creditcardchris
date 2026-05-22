import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { acceptRecommendation } from "@/lib/agentic/runner";

export const POST = withPremium(async (_req: NextRequest, { user, supabase }, route) => {
  const params = await route?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing recommendation id" }, { status: 400 });

  try {
    const action = await acceptRecommendation(supabase, user.id, id);
    return NextResponse.json({ ok: true, action });
  } catch {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }
});
