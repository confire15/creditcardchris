import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BenefitsPage } from "@/components/benefits/benefits-page";

export default async function Benefits() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <BenefitsPage userId={user.id} />;
}
