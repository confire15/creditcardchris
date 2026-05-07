import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";

function accountPayload(body: Record<string, unknown>, userId: string) {
  const programName = typeof body.programName === "string" ? body.programName.trim() : "";
  const programType = typeof body.programType === "string" ? body.programType : "airline";
  const balance = Number(body.balance ?? 0);
  const pointValueCpp = Number(body.pointValueCpp ?? 1);
  const expirationDate = typeof body.expirationDate === "string" && body.expirationDate ? body.expirationDate : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  if (!programName || !Number.isFinite(balance) || !Number.isFinite(pointValueCpp)) return null;
  return {
    user_id: userId,
    program_name: programName,
    program_type: programType,
    balance,
    point_value_cpp: pointValueCpp,
    expiration_date: expirationDate,
    notes,
    is_active: body.isActive == null ? true : Boolean(body.isActive),
    updated_at: new Date().toISOString(),
  };
}

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const { data, error } = await supabase
    .from("loyalty_accounts")
    .select("*")
    .in("user_id", memberIds)
    .eq("is_active", true)
    .order("expiration_date", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: "Failed to load points accounts" }, { status: 400 });
  return NextResponse.json({ accounts: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const payload = accountPayload(body, user.id);
  if (!payload) return NextResponse.json({ error: "Invalid points account payload" }, { status: 400 });
  const { data, error } = await supabase.from("loyalty_accounts").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Failed to save points account" }, { status: 400 });
  return NextResponse.json({ account: data });
});

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const payload = accountPayload(body, user.id);
  if (!id || !payload) return NextResponse.json({ error: "Invalid points account payload" }, { status: 400 });
  const { data, error } = await supabase
    .from("loyalty_accounts")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to update points account" }, { status: 400 });
  return NextResponse.json({ account: data });
});

export const DELETE = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  const { error } = await supabase
    .from("loyalty_accounts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to archive points account" }, { status: 400 });
  return NextResponse.json({ ok: true });
});
