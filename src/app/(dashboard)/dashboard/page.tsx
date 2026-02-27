import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { subMonths, format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");

  const [txRes, cardsRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(`*, category:spending_categories(*), user_card:user_cards(*, card_template:card_templates(*))`)
      .eq("user_id", user!.id)
      .gte("transaction_date", sixMonthsAgo)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("user_cards")
      .select("*, card_template:card_templates(*)")
      .eq("user_id", user!.id)
      .eq("is_active", true),
  ]);

  // If user has no cards, redirect to onboarding
  if (!cardsRes.data?.length) {
    redirect("/onboarding");
  }

  return (
    <DashboardContent
      transactions={txRes.data ?? []}
      cards={cardsRes.data ?? []}
      userId={user!.id}
    />
  );
}
