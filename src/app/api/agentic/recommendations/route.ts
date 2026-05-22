import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getActiveRecommendationCount, getLastWalletCopilotRun, listActiveRecommendations } from "@/lib/agentic/runner";

export const GET = withPremium(async (req: NextRequest, { user, supabase }) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 12);
  const cappedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 24) : 12;
  const [recommendations, activeCount, lastRun] = await Promise.all([
    listActiveRecommendations(supabase, user.id, cappedLimit),
    getActiveRecommendationCount(supabase, user.id),
    getLastWalletCopilotRun(supabase, user.id),
  ]);

  return NextResponse.json({ recommendations, activeCount, lastRun });
});
