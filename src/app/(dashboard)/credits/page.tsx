import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreditsOverview } from "@/components/credits/credits-overview";

export default async function CreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CreditsOverview userId={user.id} />;
}
