import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPremium } from "@/lib/api/with-premium";

const reminderSchema = z.object({
  userCardId: z.string().uuid(),
  enabled: z.boolean(),
  reminderDays: z
    .array(z.number().int())
    .min(1)
    .max(3)
    .transform((days) => [...new Set(days)].filter((day) => [30, 7, 1].includes(day)).sort((a, b) => b - a))
    .refine((days) => days.length > 0, "Choose at least one reminder day"),
});

export const PATCH = withPremium(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = reminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reminder settings" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_cards")
    .update({
      annual_fee_reminders_enabled: parsed.data.enabled,
      annual_fee_reminder_days: parsed.data.reminderDays,
    })
    .eq("id", parsed.data.userCardId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to save reminder settings" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
});
