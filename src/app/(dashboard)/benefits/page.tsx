import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BenefitsPage } from "@/components/benefits/benefits-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benefits | Credit Card Chris",
  description: "Track statement credits across all your cards.",
};

export default async function Benefits() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <BenefitsPage userId={user.id} />;
}
