import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/settings/settings-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Credit Card Chris",
  description: "Manage your account, notifications, subscription, and connected services.",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SettingsContent user={user} />;
}
