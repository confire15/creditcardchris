import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { ActionNotFoundError, transitionUserAction } from "@/lib/actions/runner";

export const POST = withAuth(async (_req: NextRequest, { user, supabase }, route) => {
  const params = await route?.params;
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing action id" }, { status: 400 });

  try {
    const action = await transitionUserAction({ supabase, userId: user.id, actionId: id, status: "started" });
    return NextResponse.json({ ok: true, action });
  } catch (err) {
    if (err instanceof ActionNotFoundError) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not update action" }, { status: 500 });
  }
});
