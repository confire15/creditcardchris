import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/settings/settings-content";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { pickNextSurveyQuestion } from "@/lib/agentic/surveys";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Credit Card Chris",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sub }, next] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .single(),
    pickNextSurveyQuestion(supabase, user.id).catch(() => null),
  ]);

  const feedbackInitial = next
    ? {
        promptId: next.prompt.id,
        promptSlug: next.prompt.slug,
        promptVersion: next.prompt.version,
        topic: next.prompt.topic,
        question: next.question,
      }
    : null;

  return (
    <SettingsContent
      user={user}
      isPremium={isPremiumPlan(sub)}
      feedbackInitial={feedbackInitial}
    />
  );
}
