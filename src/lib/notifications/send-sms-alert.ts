export async function sendSmsAlert({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return false;

  try {
    const twilio = await import("twilio");
    const client = twilio.default(sid, token);
    await client.messages.create({
      to,
      from,
      body: body.length > 160 ? body.slice(0, 157) + "..." : body,
    });
    return true;
  } catch {
    return false;
  }
}
