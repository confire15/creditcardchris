import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMITS, checkRateLimit } from "@/lib/api/rate-limit";
import { withPremium } from "@/lib/api/with-premium";
import { getLastWalletCopilotRun, runWalletCopilot } from "@/lib/agentic/runner";

export const POST = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const limit = await checkRateLimit("wallet-copilot", user.id, RATE_LIMITS.walletCopilot);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many Wallet Copilot runs. Try again soon." }, { status: 429 });
  }

  try {
    const result = await runWalletCopilot(supabase, user.id);
    const lastRun = await getLastWalletCopilotRun(supabase, user.id);
    return NextResponse.json({ ...result, activeCount: result.recommendations.length, lastRun });
  } catch {
    const lastRun = await getLastWalletCopilotRun(supabase, user.id).catch(() => null);
    return NextResponse.json({ error: "Wallet Copilot could not generate recommendations.", lastRun }, { status: 500 });
  }
});
