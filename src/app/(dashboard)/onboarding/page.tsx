import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user already has cards, skip onboarding
  const { data: existing } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .limit(1);

  if (existing && existing.length > 0) {
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

  return (
    <OnboardingFlow
      userId={user!.id}
      templates={templatesRes.data ?? []}
      categories={categoriesRes.data ?? []}
    />
  );
}
