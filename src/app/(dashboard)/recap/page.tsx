import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { buildYearRecap } from "@/lib/utils/recap";
import { RecapPage } from "@/components/recap/recap-page";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export default async function RecapPageRoute({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
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

  const now = new Date();
  const selectedYear = Number(searchParams.year ?? (now.getMonth() >= 11 ? now.getFullYear() : now.getFullYear() - 1));
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const recap = isPremium ? await buildYearRecap(supabase, user.id, selectedYear, memberIds) : null;
  const availableYears = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return <RecapPage isPremium={isPremium} recap={recap} availableYears={availableYears} />;
}
