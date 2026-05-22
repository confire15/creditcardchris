import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { listUserActions, refreshUserActions } from "@/lib/actions/runner";

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 40);
  const cappedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 40;
  const actions = await listUserActions(supabase, user.id, cappedLimit);
  return NextResponse.json({ actions, activeCount: actions.length });
});

export const POST = withAuth(async (_req: NextRequest, { user, supabase }) => {
  const actions = await refreshUserActions(supabase, user.id);
  return NextResponse.json({ actions, activeCount: actions.length });
});
