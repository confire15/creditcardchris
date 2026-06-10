import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pickNextSurveyQuestion } from "@/lib/agentic/surveys";
import { FeedbackCard } from "@/components/feedback/feedback-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feedback | Credit Card Chris",
  description: "Tell us how Credit Card Chris is working for you.",
};

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/feedback");

  const next = await pickNextSurveyQuestion(supabase, user.id).catch(() => null);

  const initial = next
    ? {
        promptId: next.prompt.id,
        promptSlug: next.prompt.slug,
        promptVersion: next.prompt.version,
        topic: next.prompt.topic,
        question: next.question,
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Tell us how we&apos;re doing</h1>
        <p className="text-sm text-muted-foreground">
          One quick question at a time. Skip anything that doesn&apos;t apply — your answers shape what we build next.
        </p>
      </header>
      <FeedbackCard initial={initial} />
    </div>
  );
}
