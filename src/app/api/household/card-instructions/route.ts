import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";
import { getHouseholdMemberIds } from "@/lib/utils/household";
import { requireOwnUserCard } from "@/lib/api/ownership";

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const { data, error } = await supabase
    .from("household_card_instructions")
    .select("*, user_card:user_cards(id, nickname, custom_name, card_template:card_templates(name))")
    .in("user_id", memberIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to load card instructions" }, { status: 400 });
  return NextResponse.json({ instructions: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const userCardId = typeof body.userCardId === "string" ? body.userCardId : "";
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Household note";
  if (!userCardId || !instructions) return NextResponse.json({ error: "Invalid instruction payload" }, { status: 400 });
  await requireOwnUserCard(supabase, user.id, userCardId);
  const { data, error } = await supabase
    .from("household_card_instructions")
    .insert({ user_id: user.id, user_card_id: userCardId, label, instructions })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to save instruction" }, { status: 400 });
  return NextResponse.json({ instruction: data });
});

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing instruction id" }, { status: 400 });
  const { data, error } = await supabase
    .from("household_card_instructions")
    .update({
      label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Household note",
      instructions: typeof body.instructions === "string" ? body.instructions.trim() : "",
      is_active: body.isActive == null ? true : Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to update instruction" }, { status: 400 });
  return NextResponse.json({ instruction: data });
});
