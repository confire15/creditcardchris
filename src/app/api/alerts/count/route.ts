import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { loadUpcomingAlerts } from "@/lib/alerts/load-upcoming-alerts";

// Nav badge count — same source of truth as the /alerts page.
export const GET = withAuth(async (_req, { user, supabase }) => {
  const alerts = await loadUpcomingAlerts({ supabase, userId: user.id });
  const count = alerts.filter((alert) => alert.daysUntil >= 0 && alert.daysUntil <= 30).length;
  return NextResponse.json({ count });
});
