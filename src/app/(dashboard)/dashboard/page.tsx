import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { subMonths, format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sixMonthsAgo = format(subMonths(new Date(), 6), "yyyy-MM-dd");

  const [txRes, cardsRes, budgetRes, goalRes] = await Promise.all([
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
    supabase
      .from("spending_budgets")
      .select("id")
      .eq("user_id", user!.id)
      .limit(1),
    supabase
      .from("rewards_goals")
      .select("id")
      .eq("user_id", user!.id)
      .limit(1),
  ]);

  // If user has no cards, redirect to onboarding
  if (!cardsRes.data?.length) {
    redirect("/onboarding");
  }

  const hasTransactions = (txRes.data?.length ?? 0) > 0;
  const hasBudget = (budgetRes.data?.length ?? 0) > 0;
  const hasGoal = (goalRes.data?.length ?? 0) > 0;

  return (
    <>
      <GettingStarted
        hasCards={true}
        hasTransactions={hasTransactions}
        hasBudget={hasBudget}
        hasGoal={hasGoal}
      />
      <DashboardContent
        transactions={txRes.data ?? []}
        cards={cardsRes.data ?? []}
        userId={user!.id}
      />
    </>
  );
}
