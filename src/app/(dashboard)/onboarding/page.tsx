import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { CardTemplate } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Get started | Credit Card Chris",
  description: "Add your cards and get your first best-card answer in under a minute.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; upgraded?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If user already has cards, skip onboarding
  const { data: existing } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const requestedStep =
    resolvedSearchParams.step === "4" ? 4 : resolvedSearchParams.step === "3" ? 3 : 1;
  const justUpgraded = resolvedSearchParams.upgraded === "true";
  if (existing && existing.length > 0 && !justUpgraded && requestedStep === 1) {
    redirect("/dashboard");
  }

  const [templatesRes, categoriesRes] = await Promise.all([
    supabase
      .from("card_templates")
      .select("*")
      .order("issuer", { ascending: true }),
    supabase
      .from("spending_categories")
      .select("*")
      .order("display_name", { ascending: true }),
  ]);

  const templates: CardTemplate[] = (templatesRes.data ?? []).map((template) => ({
    ...template,
    annual_fee: template.annual_fee ?? 0,
    base_reward_rate: template.base_reward_rate ?? 1,
  }));

  return (
    <OnboardingFlow
      userId={user.id}
      templates={templates}
      categories={categoriesRes.data ?? []}
      initialStep={requestedStep}
      justUpgraded={justUpgraded}
    />
  );
}
