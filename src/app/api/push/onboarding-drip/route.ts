export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withCron } from "@/lib/api/with-cron";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmailAlert } from "@/lib/notifications/send-email-alert";
import { differenceInCalendarDays } from "date-fns";

const STAGES = [
  {
    day: 0,
    stage: "welcome",
    subject: "Welcome to Credit Card Chris",
    title: "Welcome aboard",
    body: "You're all set. Add your cards to your Wallet and we'll tell you which card to use for every purchase.",
    url: "https://creditcardchris.com/wallet",
    ctaLabel: "Add Your Cards",
  },
  {
    day: 2,
    stage: "nudge",
    subject: "Find your best card in 60 seconds",
    title: "Which card should you use?",
    body: "Try the Best Card Finder — pick a category, enter an amount, and see which card in your wallet earns the most.",
    url: "https://creditcardchris.com/best-card",
    ctaLabel: "Try Best Card Finder",
  },
  {
    day: 7,
    stage: "social_proof",
    subject: "Are you leaving rewards on the table?",
    title: "Maximize your rewards",
    body: "Most people use the wrong card for 40% of their purchases. Add your cards and let us do the math. Premium members also get alerts before annual fees hit.",
    url: "https://creditcardchris.com/pricing",
    ctaLabel: "Explore Premium",
  },
] as const;

const handler = withCron(async () => {
  const supabase = createServiceClient();
  const today = new Date();

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("user_id, member_since");

  if (!profiles?.length) return NextResponse.json({ sent: 0 });

  const { data: alreadySent } = await supabase
    .from("drip_emails_sent")
    .select("user_id, stage");

  const sentSet = new Set(
    (alreadySent ?? []).map((r) => `${r.user_id}:${r.stage}`)
  );

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).filter((u) => u.email).map((u) => [u.id, u.email!])
  );

  let sent = 0;
  let errors = 0;

  await Promise.allSettled(
    profiles.flatMap((profile) => {
      const daysSinceSignup = differenceInCalendarDays(
        today,
        new Date(profile.member_since)
      );

      return STAGES.filter(
        (s) =>
          daysSinceSignup >= s.day &&
          daysSinceSignup <= s.day + 1 &&
          !sentSet.has(`${profile.user_id}:${s.stage}`)
      ).map(async (stage) => {
        const email = emailMap.get(profile.user_id);
        if (!email) return;

        const ok = await sendEmailAlert({
          to: email,
          subject: stage.subject,
          title: stage.title,
          body: stage.body,
          url: stage.url,
          ctaLabel: stage.ctaLabel,
        });

        if (ok) {
          await supabase.from("drip_emails_sent").insert({
            user_id: profile.user_id,
            stage: stage.stage,
          });
          sent++;
        } else {
          errors++;
        }
      });
    })
  );

  return NextResponse.json({ sent, errors });
});

export const GET = handler;
export const POST = handler;
