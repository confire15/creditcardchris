import { NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { loadAnnualFeeEvents } from "@/lib/annual-fees/load-annual-fee-events";
import { buildAnnualFeeIcs } from "@/lib/utils/annual-fees";

export const GET = withPremium(async (_req, { user, supabase }) => {
  const events = await loadAnnualFeeEvents({ supabase, userId: user.id });
  const calendar = buildAnnualFeeIcs(events);

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="credit-card-chris-annual-fees.ics"',
      "Cache-Control": "private, no-store",
    },
  });
});
