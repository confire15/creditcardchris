import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { CardTemplate } from "@/lib/types/database";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string; upgraded?: string };
}) {
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

  const requestedStep = searchParams.step === "3" ? 3 : 1;
  const justUpgraded = searchParams.upgraded === "true";
  if (existing && existing.length > 0 && !justUpgraded && requestedStep !== 3) {
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
