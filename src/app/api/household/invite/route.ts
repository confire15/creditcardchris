import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";

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
  const invitedEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!invitedEmail || !invitedEmail.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  let { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!household) {
    const created = await supabase
      .from("households")
      .insert({ owner_user_id: user.id, name: "Household" })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json({ error: "Failed to create household" }, { status: 400 });
    }
    household = created.data;
    await supabase.from("household_members").upsert({
      household_id: household.id,
      user_id: user.id,
      role: "owner",
      accepted_at: new Date().toISOString(),
    }, { onConflict: "household_id,user_id" });
  }

  const token = crypto.randomUUID();
  const expiresAt = addDays(new Date(), 7).toISOString();
  const { error } = await supabase.from("household_invites").insert({
    household_id: household.id,
    invited_email: invitedEmail,
    token,
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "Failed to create invite" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://creditcardchris.com";
  const inviteUrl = `${appUrl}/household/accept?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const mod = await import("resend");
      const resend = new mod.Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Credit Card Chris <alerts@creditcardchris.com>",
        to: invitedEmail,
        subject: "You're invited to join a Credit Card Chris household",
        html: `<p>You were invited to join a household on Credit Card Chris.</p><p><a href="${inviteUrl}">Accept invite</a></p>`,
      });
    } catch {
      // best effort email delivery
    }
  }

  return NextResponse.json({ ok: true, inviteUrl });
}
