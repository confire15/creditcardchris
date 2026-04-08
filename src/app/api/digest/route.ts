import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withCron } from "@/lib/api/with-cron";
import { format, addDays, parseISO } from "date-fns";

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

const handler = withCron(async () => {
  const supabase = createServiceClient();
  const today = new Date();
  const thirtyDaysOut = addDays(today, 30);
  const todayStr = format(today, "yyyy-MM-dd");
  const thirtyDaysStr = format(thirtyDaysOut, "yyyy-MM-dd");

  // Get all active users with cards
  const { data: userCards } = await supabase
    .from("user_cards")
    .select("user_id, nickname, annual_fee_date, custom_annual_fee, card_template:card_templates(name, annual_fee)")
    .eq("is_active", true)
    .not("annual_fee_date", "is", null)
    .gte("annual_fee_date", todayStr)
    .lte("annual_fee_date", thirtyDaysStr);

  // Get credits expiring this month (reset_month matches current month)
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const { data: expiringCredits } = await supabase
    .from("statement_credits")
    .select("user_id, name, annual_amount, used_amount, reset_month, user_card_id")
    .eq("reset_month", currentMonth)
    .gt("annual_amount", 0);

  // Build per-user digest data
  const userDigestMap = new Map<string, {
    upcomingFees: Array<{ cardName: string; fee: number; daysUntil: number; date: string }>;
    expiringCredits: Array<{ name: string; remaining: number }>;
  }>();

  for (const card of userCards ?? []) {
    if (!card.annual_fee_date) continue;
    const tmpl = card.card_template as { name?: string; annual_fee?: number } | null;
    const fee = card.custom_annual_fee ?? tmpl?.annual_fee ?? 0;
    if (fee <= 0) continue;
    const cardName = card.nickname || tmpl?.name || "Your card";
    const daysUntil = Math.round((parseISO(card.annual_fee_date).getTime() - today.getTime()) / 86400000);

    if (!userDigestMap.has(card.user_id)) {
      userDigestMap.set(card.user_id, { upcomingFees: [], expiringCredits: [] });
    }
    userDigestMap.get(card.user_id)!.upcomingFees.push({
      cardName,
      fee,
      daysUntil,
      date: format(parseISO(card.annual_fee_date), "MMM d"),
    });
  }

  for (const credit of expiringCredits ?? []) {
    const remaining = credit.annual_amount - (credit.used_amount ?? 0);
    if (remaining <= 0) continue;
    if (!userDigestMap.has(credit.user_id)) {
      userDigestMap.set(credit.user_id, { upcomingFees: [], expiringCredits: [] });
    }
    userDigestMap.get(credit.user_id)!.expiringCredits.push({
      name: credit.name,
      remaining,
    });
  }

  if (userDigestMap.size === 0) return NextResponse.json({ sent: 0 });

  // Get user emails
  const userIds = Array.from(userDigestMap.keys());
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? [])
      .filter((u) => userIds.includes(u.id) && u.email)
      .map((u) => [u.id, u.email!])
  );

  // Dynamically import Resend to avoid hard failure if not installed
  let Resend: typeof import("resend").Resend | null = null;
  try {
    const mod = await import("resend");
    Resend = mod.Resend;
  } catch {
    return NextResponse.json(
      { error: "Resend not installed. Run: npm install resend" },
      { status: 500 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;

  for (const [userId, digest] of userDigestMap.entries()) {
    const email = emailMap.get(userId);
    if (!email) continue;

    const html = buildDigestHtml({ ...digest, today });

    const subjectParts: string[] = [];
    if (digest.upcomingFees.length > 0) subjectParts.push(`${digest.upcomingFees.length} annual fee${digest.upcomingFees.length > 1 ? "s" : ""} coming up`);
    if (digest.expiringCredits.length > 0) subjectParts.push(`${digest.expiringCredits.length} credit${digest.expiringCredits.length > 1 ? "s" : ""} expiring`);
    const subject = subjectParts.length > 0
      ? `Credit Card Chris: ${subjectParts.join(", ")}`
      : "Credit Card Chris: Weekly Summary";

    const { error } = await resend.emails.send({
      from: "Credit Card Chris <digest@creditcardchris.com>",
      to: email,
      subject,
      html,
    });

    if (!error) sent++;
  }

  return NextResponse.json({ sent });
});

export const GET = handler;
export const POST = handler;

function buildDigestHtml({
  upcomingFees,
  expiringCredits,
  today,
}: {
  upcomingFees: Array<{ cardName: string; fee: number; daysUntil: number; date: string }>;
  expiringCredits: Array<{ name: string; remaining: number }>;
  today: Date;
}) {
  const feeRows = upcomingFees
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <strong style="color:#e5e7eb">${f.cardName}</strong><br>
          <span style="color:#9ca3af;font-size:12px">Due ${f.date} · ${f.daysUntil} day${f.daysUntil !== 1 ? "s" : ""} away</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;color:#d4621a;font-weight:700">$${f.fee}</td>
      </tr>`
    )
    .join("");

  const creditRows = expiringCredits
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <strong style="color:#e5e7eb">${c.name}</strong><br>
          <span style="color:#9ca3af;font-size:12px">Resets end of month</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;color:#10b981;font-weight:700">$${c.remaining.toFixed(0)} left</td>
      </tr>`
    )
    .join("");

  const feeSection = upcomingFees.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#e5e7eb">Upcoming Annual Fees</h2>
    <table style="width:100%;border-collapse:collapse">${feeRows}</table>
    <a href="https://creditcardchris.com/keep-or-cancel" style="display:inline-block;margin-top:12px;font-size:13px;color:#d4621a;text-decoration:none">Is it still worth it? Check Keep or Cancel →</a>
  ` : "";

  const creditSection = expiringCredits.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#e5e7eb">Credits Expiring This Month</h2>
    <table style="width:100%;border-collapse:collapse">${creditRows}</table>
    <a href="https://creditcardchris.com/benefits" style="display:inline-block;margin-top:12px;font-size:13px;color:#d4621a;text-decoration:none">Log your usage →</a>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="font-family:-apple-system,sans-serif;background:#0f1117;color:#e5e7eb;margin:0;padding:40px 20px">
  <div style="background:#1a1d27;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;max-width:480px;margin:0 auto">
    <div style="font-size:18px;font-weight:700;color:#e5e7eb;margin-bottom:8px">Credit Card <span style="color:#d4621a">Chris</span></div>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Weekly summary · ${format(today, "MMMM d, yyyy")}</p>
    ${feeSection}
    ${creditSection}
    <div style="margin-top:32px">
      <a href="https://creditcardchris.com/dashboard" style="display:block;text-align:center;background:#d4621a;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">Open Dashboard →</a>
    </div>
    <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:24px">
      Credit Card Chris · <a href="https://creditcardchris.com/settings" style="color:#6b7280">Manage notifications</a>
    </p>
  </div>
</body>
</html>`;
}
