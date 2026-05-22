import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  explainFeeCalculator,
  feeCalculatorExplainInputSchema,
} from "@/lib/agentic/fee-calculator-explainer";

const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  const limit = await checkRateLimit("fee-calculator-explainer", user.id, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feeCalculatorExplainInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { runId, output } = await explainFeeCalculator(supabase, user.id, parsed.data);
    return NextResponse.json({ runId, ...output });
  } catch {
    return NextResponse.json(
      { error: "Could not generate an explanation. Try again." },
      { status: 500 },
    );
  }
});
