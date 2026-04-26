import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { ApplicationsPage } from "@/components/applications/applications-page";

export default async function WalletApplicationsPage() {
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

  return <ApplicationsPage isPremium={isPremiumPlan(sub)} />;
}
