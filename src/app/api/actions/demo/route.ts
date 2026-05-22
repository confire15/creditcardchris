import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { withAuth } from "@/lib/api/with-auth";

export const POST = withAuth(async (_req: NextRequest, { user, supabase }) => {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Demo actions are only available in development." }, { status: 403 });
  }

  const now = new Date();
  const rows = [
    {
      user_id: user.id,
      source_type: "demo",
      action_type: "credit_capture",
      title: "Use your dining credit before it resets",
      rationale: "You have a demo $10 dining credit expiring this week. Open Benefits, use it, then mark this move done.",
      priority: 98,
      confidence: 0.95,
      source_refs: [{ type: "demo", id: "demo-expiring-credit", label: "Expiring credit" }],
      proposed_action: { type: "navigate", href: "/benefits", label: "Review benefit" },
      value_estimate_cents: 1000,
      due_at: addDays(now, 5).toISOString(),
      expires_at: addDays(now, 5).toISOString(),
      recurrence_key: "demo:expiring-credit",
      status: "active",
      updated_at: now.toISOString(),
    },
    {
      user_id: user.id,
      source_type: "demo",
      action_type: "renewal_rescue",
      title: "Review a fee card before renewal",
      rationale: "A demo annual fee is coming up in 21 days. Run the keep-or-cancel review and prepare a retention call script.",
      priority: 90,
      confidence: 0.9,
      source_refs: [{ type: "demo", id: "demo-annual-fee", label: "Annual fee review" }],
      proposed_action: { type: "navigate", href: "/keep-or-cancel", label: "Run review" },
      value_estimate_cents: 9500,
      due_at: addDays(now, 21).toISOString(),
      expires_at: addDays(now, 21).toISOString(),
      recurrence_key: "demo:annual-fee-review",
      status: "active",
      updated_at: now.toISOString(),
    },
    {
      user_id: user.id,
      source_type: "demo",
      action_type: "sub_pace",
      title: "$420 left to protect your signup bonus",
      rationale: "Your demo bonus plan is behind pace. Move groceries, gas, or a recurring bill to this card for the next week.",
      priority: 88,
      confidence: 0.9,
      source_refs: [{ type: "demo", id: "demo-sub-pace", label: "SUB pace" }],
      proposed_action: { type: "navigate", href: "/wallet/challenges", label: "Build spend plan" },
      value_estimate_cents: 60000,
      due_at: addDays(now, 12).toISOString(),
      expires_at: addDays(now, 12).toISOString(),
      recurrence_key: "demo:sub-pace",
      status: "active",
      updated_at: now.toISOString(),
    },
  ];

  const { data, error } = await supabase
    .from("user_actions")
    .upsert(rows, { onConflict: "user_id,recurrence_key" })
    .select("*")
    .order("priority", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not seed demo actions." }, { status: 400 });

  return NextResponse.json({ actions: data ?? [], activeCount: data?.length ?? 0 });
});
