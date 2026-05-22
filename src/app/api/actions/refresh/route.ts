import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { refreshUserActions } from "@/lib/actions/runner";

export const POST = withAuth(async (_req: NextRequest, { user, supabase }) => {
  const actions = await refreshUserActions(supabase, user.id);
  return NextResponse.json({ actions, activeCount: actions.length });
});
