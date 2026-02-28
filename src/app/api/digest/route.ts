import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Weekly digest endpoint — call via Vercel Cron or manually
// Set up in vercel.json:
//   { "crons": [{ "path": "/api/digest", "schedule": "0 9 * * 1" }] }
//
// Requires RESEND_API_KEY in environment variables.
// Install Resend: npm install resend

// Vercel Cron calls GET; keep POST for manual/testing
export async function GET(request: Request) {
  return handleDigest(request);
}

export async function POST(request: Request) {
  return handleDigest(request);
}

async function handleDigest(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role for all users
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  // Get all users who have transactions in the last 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: recentTx } = await supabase
    .from("transactions")
    .select("user_id, amount, rewards_earned, merchant, transaction_date")
    .gte("transaction_date", sinceStr);

  if (!recentTx || recentTx.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Group by user
  const byUser = new Map<string, typeof recentTx>();
  recentTx.forEach((tx) => {
    if (!byUser.has(tx.user_id)) byUser.set(tx.user_id, []);
    byUser.get(tx.user_id)!.push(tx);
  });

  // Get user emails
  const userIds = Array.from(byUser.keys());
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? [])
      .filter((u) => userIds.includes(u.id) && u.email)
      .map((u) => [u.id, u.email!])
  );

  let sent = 0;

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

  for (const [userId, txs] of byUser.entries()) {
    const email = emailMap.get(userId);
    if (!email) continue;

    const totalSpent = txs.reduce((s, t) => s + t.amount, 0);
    const totalRewards = txs.reduce((s, t) => s + (t.rewards_earned ?? 0), 0);
    const txCount = txs.length;

    const html = buildDigestHtml({ totalSpent, totalRewards, txCount, sinceStr });

    const { error } = await resend.emails.send({
      from: "Credit Card Chris <digest@creditcardchris.com>",
      to: email,
      subject: `Your weekly rewards digest — ${totalRewards.toLocaleString()} pts earned`,
      html,
    });

    if (!error) sent++;
  }

  return NextResponse.json({ sent });
}

function buildDigestHtml({
  totalSpent,
  totalRewards,
  txCount,
  sinceStr,
}: {
  totalSpent: number;
  totalRewards: number;
  txCount: number;
  sinceStr: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f1117; color: #e5e7eb; margin: 0; padding: 40px 20px; }
    .card { background: #1a1d27; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px; max-width: 480px; margin: 0 auto; }
    .logo { font-size: 18px; font-weight: 700; color: #e5e7eb; margin-bottom: 24px; }
    .logo span { color: #d4621a; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    .subtitle { color: #9ca3af; font-size: 14px; margin-bottom: 32px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
    .stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; }
    .stat.highlight { background: rgba(212,98,26,0.08); border-color: rgba(212,98,26,0.2); }
    .stat-label { font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat.highlight .stat-value { color: #d4621a; }
    .cta { display: block; text-align: center; background: #d4621a; color: #fff; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Credit Card <span>Chris</span></div>
    <h1>Your weekly summary</h1>
    <p class="subtitle">Week of ${new Date(sinceStr).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Spent</div>
        <div class="stat-value">$${totalSpent.toFixed(2)}</div>
      </div>
      <div class="stat highlight">
        <div class="stat-label">Rewards earned</div>
        <div class="stat-value">${totalRewards.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts</div>
      </div>
      <div class="stat">
        <div class="stat-label">Transactions</div>
        <div class="stat-value">${txCount}</div>
      </div>
    </div>
    <a href="https://creditcardchris.com/dashboard" class="cta">View Dashboard →</a>
    <p class="footer">Credit Card Chris · <a href="https://creditcardchris.com/settings" style="color:#6b7280">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}
