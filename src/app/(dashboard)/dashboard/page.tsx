import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cards } = await supabase
    .from("user_cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  if (!cards?.length) redirect("/onboarding");

  return <DashboardContent userId={user.id} />;
}
