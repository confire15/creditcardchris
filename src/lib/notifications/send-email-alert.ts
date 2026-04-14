export async function sendEmailAlert({
  to,
  subject,
  title,
  body,
  url,
  ctaLabel = "View Details",
}: {
  to: string;
  subject: string;
  title: string;
  body: string;
  url: string;
  ctaLabel?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  let Resend: typeof import("resend").Resend | null = null;
  try {
    const mod = await import("resend");
    Resend = mod.Resend;
  } catch {
    return false;
  }

  const resend = new Resend(apiKey);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="font-family:-apple-system,sans-serif;background:#0f1117;color:#e5e7eb;margin:0;padding:40px 20px">
  <div style="background:#1a1d27;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;max-width:480px;margin:0 auto">
    <div style="font-size:18px;font-weight:700;color:#e5e7eb;margin-bottom:24px">Credit Card <span style="color:#d4621a">Chris</span></div>
    <h1 style="font-size:20px;font-weight:700;color:#e5e7eb;margin:0 0 12px">${title}</h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px">${body}</p>
    <a href="${url}" style="display:block;text-align:center;background:#d4621a;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">${ctaLabel} &rarr;</a>
    <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:24px">
      Credit Card Chris &middot; <a href="https://creditcardchris.com/settings" style="color:#6b7280">Manage notifications</a>
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: "Credit Card Chris <alerts@creditcardchris.com>",
    to,
    subject,
    html,
  });

  return !error;
}
