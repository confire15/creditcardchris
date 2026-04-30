import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }, route) => {
  const { id } = await route!.params as { id: string };

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const icon = typeof body?.icon === "string" ? body.icon.trim() : null;
  if (!displayName) return NextResponse.json({ error: "display_name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("spending_categories")
    .update({ display_name: displayName, icon: icon || null })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to update category" }, { status: 400 });
  return NextResponse.json({ category: data });
});

export const DELETE = withPremium(async (_req: NextRequest, { user, supabase }, route) => {
  const { id } = await route!.params as { id: string };

  const { error } = await supabase
    .from("spending_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed to delete category" }, { status: 400 });
  return NextResponse.json({ ok: true });
});
