import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

async function requirePremium() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: sub } = await supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).single();
  if (!isPremiumPlan(sub)) return { supabase, user: null, error: NextResponse.json({ error: "Premium required" }, { status: 403 }) };
  return { supabase, user, error: null };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePremium();
  if (ctx.error || !ctx.user) return ctx.error!;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const icon = typeof body?.icon === "string" ? body.icon.trim() : null;
  if (!displayName) return NextResponse.json({ error: "display_name is required" }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("spending_categories")
    .update({ display_name: displayName, icon: icon || null })
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to update category" }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePremium();
  if (ctx.error || !ctx.user) return ctx.error!;
  const { id } = await params;

  const { error } = await ctx.supabase
    .from("spending_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.user.id);
  if (error) return NextResponse.json({ error: "Failed to delete category" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
