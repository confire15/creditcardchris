import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/settings/settings-content";
import { isPremiumPlan } from "@/lib/utils/subscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Credit Card Chris",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  return <SettingsContent user={user} isPremium={isPremiumPlan(sub)} />;
}
