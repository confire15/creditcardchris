import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreditsActionPage } from "@/components/credits/credits-action-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credits | Credit Card Chris",
  description: "Close out your statement credits before they expire — one tap, done.",
};

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <CreditsActionPage userId={user.id} />;
}
