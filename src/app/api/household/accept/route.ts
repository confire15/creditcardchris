import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/utils/audit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: invite } = await supabase
    .from("household_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("household_members")
    .upsert({
      household_id: invite.household_id,
      user_id: user.id,
      role: "viewer",
      accepted_at: new Date().toISOString(),
    }, { onConflict: "household_id,user_id" })
    .select("id")
    .single();
  if (memberError || !member) return NextResponse.json({ error: "Failed to accept invite" }, { status: 400 });

  await supabase.from("household_invites").delete().eq("id", invite.id);

  void logAudit(supabase, user.id, "household.member_added", {
    household_id: invite.household_id,
    member_id: member.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
