import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPremiumPlan } from "@/lib/utils/subscription";
import { buildYearRecap } from "@/lib/utils/recap";
import { RecapPage } from "@/components/recap/recap-page";
import { getHouseholdMemberIds } from "@/lib/utils/household";

export const metadata: Metadata = {
  title: "Year Recap | Credit Card Chris",
  description: "Your year in card value: credits used, fees paid, and top categories.",
};

export default async function RecapPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
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
  const selectedYear = Number(resolvedSearchParams.year ?? (now.getMonth() >= 11 ? now.getFullYear() : now.getFullYear() - 1));
  const memberIds = await getHouseholdMemberIds(supabase, user.id);
  const recap = isPremium ? await buildYearRecap(supabase, user.id, selectedYear, memberIds) : null;
  const availableYears = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return <RecapPage isPremium={isPremium} recap={recap} availableYears={availableYears} />;
}
