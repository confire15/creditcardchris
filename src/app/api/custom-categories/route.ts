import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { withPremium } from "@/lib/api/with-premium";

export const GET = withAuth(async (_req: NextRequest, { supabase }) => {
  const { data, error } = await supabase
    .from("spending_categories")
    .select("*")
    .order("user_id", { ascending: true, nullsFirst: true })
    .order("display_name", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load categories" }, { status: 400 });
  return NextResponse.json({ categories: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const icon = typeof body?.icon === "string" ? body.icon.trim() : null;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  const { data, error } = await supabase
    .from("spending_categories")
    .insert({
      user_id: user.id,
      name: normalized || `custom_${Date.now()}`,
      display_name: name,
      icon: icon || null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to create category" }, { status: 400 });
  return NextResponse.json({ category: data });
});
