import { NextRequest, NextResponse } from "next/server";
import { withPremium } from "@/lib/api/with-premium";

export const GET = withPremium(async (_req: NextRequest, { user, supabase }) => {
  const { data, error } = await supabase
    .from("card_applications")
    .select("*, card_template:card_templates(name)")
    .eq("user_id", user.id)
    .order("applied_on", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to fetch applications" }, { status: 400 });
  return NextResponse.json({ applications: data ?? [] });
});

export const POST = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const issuer = typeof body?.issuer === "string" ? body.issuer.trim() : "";
  const appliedOn = typeof body?.appliedOn === "string" ? body.appliedOn : "";
  const outcome = typeof body?.outcome === "string" ? body.outcome : "pending";

  if (!issuer || !appliedOn) {
    return NextResponse.json({ error: "Issuer and applied date are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("card_applications")
    .insert({
      user_id: user.id,
      card_template_id: typeof body?.cardTemplateId === "string" ? body.cardTemplateId : null,
      custom_card_name: typeof body?.customCardName === "string" ? body.customCardName : null,
      issuer,
      applied_on: appliedOn,
      outcome,
      approved_on: typeof body?.approvedOn === "string" ? body.approvedOn : null,
      is_business_card: Boolean(body?.isBusinessCard),
      notes: typeof body?.notes === "string" ? body.notes : null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Failed to save application" }, { status: 400 });
  return NextResponse.json({ application: data });
});
