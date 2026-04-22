import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WizardLayout } from "@/components/calculator/wizard-layout";
import { isPremiumPlan } from "@/lib/utils/subscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Annual Fee Calculator | Credit Card Chris",
  description:
    "Find the real net cost of a premium card in a 60-second gamified reveal of the effective annual fee.",
};

export default async function CalculatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPremium = isPremiumPlan(sub);

  return <WizardLayout isPremium={isPremium} />;
}
