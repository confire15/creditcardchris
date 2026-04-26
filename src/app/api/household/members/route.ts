import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ownedHousehold } = await supabase
    .from("households")
    .select("id, owner_user_id, name")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role, accepted_at")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .maybeSingle();

  const householdId = ownedHousehold?.id ?? membership?.household_id ?? null;
  if (!householdId) return NextResponse.json({ household: null, members: [] });

  const { data: members } = await supabase
    .from("household_members")
    .select("id, user_id, role, invited_at, accepted_at")
    .eq("household_id", householdId)
    .order("invited_at", { ascending: true });

  return NextResponse.json({
    household: {
      id: householdId,
      owner_user_id: ownedHousehold?.owner_user_id ?? null,
      is_owner: !!ownedHousehold,
      role: ownedHousehold ? "owner" : membership?.role ?? "viewer",
    },
    members: members ?? [],
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();
  if (!household) return NextResponse.json({ error: "Not household owner" }, { status: 403 });

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("id", memberId)
    .eq("household_id", household.id);
  if (error) return NextResponse.json({ error: "Failed to remove member" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
