import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("spending_categories")
    .select("*")
    .order("user_id", { ascending: true, nullsFirst: true })
    .order("display_name", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load categories" }, { status: 400 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  if (!isPremiumPlan(sub)) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

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
}
